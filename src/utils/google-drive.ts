import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { google, drive_v3, Auth } from 'googleapis';
import { GaxiosError } from 'gaxios';
import { Readable } from 'stream';

// @Injectable()
export class GoogleDriveService {
  private drive: drive_v3.Drive;
  private parentFolderId: string;
  private folderCache = new Map<string, string>();
  private oauth2Client: Auth.OAuth2Client;

  constructor() {
    this.parentFolderId = process.env.DRIVE_PARENT_FOLDER_ID || '';

    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    const redirectUri = process.env.GOOGLE_REDIRECT_URI || '';
    const refreshToken = process.env.GOOGLE_REFRESH_TOKEN || '';

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri,
    );

    this.oauth2Client.setCredentials({
      refresh_token: refreshToken,
    });

    this.drive = google.drive({ version: 'v3', auth: this.oauth2Client });
  }

  async findFolder(
    folderName: string,
    parentId?: string,
  ): Promise<string | null> {
    const parent = parentId || this.parentFolderId;
    const res = await this.drive.files.list({
      q: `mimeType='application/vnd.google-apps.folder' and name='${folderName}' and '${parent}' in parents and trashed=false`,
      fields: 'files(id, name)',
    });

    return res.data.files && res.data.files.length > 0
      ? (res.data.files[0].id ?? null)
      : null;
  }

  async createFolder(folderName: string, parentId?: string): Promise<string> {
    const parent = parentId || this.parentFolderId;
    const fileMetadata: drive_v3.Schema$File = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parent],
    };
    const file = await this.drive.files.create({
      requestBody: fileMetadata,
      fields: 'id',
    });
    return file.data.id as string;
  }

  async getOrCreateFolder(
    folderName: string,
    parentId?: string,
  ): Promise<string> {
    const parent = parentId || this.parentFolderId;
    const cacheKey = `${parent}_${folderName}`;

    if (this.folderCache.has(cacheKey)) {
      return this.folderCache.get(cacheKey) as string;
    }

    let folderId = await this.findFolder(folderName, parent);

    if (!folderId) {
      folderId = await this.createFolder(folderName, parent);
    }

    this.folderCache.set(cacheKey, folderId);
    return folderId;
  }

  uploadBuffer = async (params: {
    filename: string;
    mimeType: string;
    buffer: Buffer;
    parentId?: string;
  }) => {
    try {
      const stream = Readable.from(params.buffer);
      const targetFolder = params.parentId || this.parentFolderId;

      const requestBody: drive_v3.Schema$File = {
        name: params.filename,
        parents: targetFolder ? [targetFolder] : undefined,
      };

      const file = await this.drive.files.create({
        requestBody,
        media: { mimeType: params.mimeType, body: stream },
        fields: 'id, name, mimeType, size',
      });

      return file.data;
    } catch (e) {
      console.error('Upload Error:', e);
      throw new HttpException(
        'Drive upload failed',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  };

  getFileMetadata = async (fileId: string): Promise<drive_v3.Schema$File> => {
    try {
      const { data } = await this.drive.files.get({
        fileId,
        fields: 'id, name, mimeType, size, createdTime, modifiedTime, parents',
      });
      return data;
    } catch (e) {
      if (e instanceof GaxiosError && e.code == 404) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        'Failed to fetch file metadata',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  };

  getFileMetadataWithParent = async (fileId: string) => {
    try {
      // 1. Fetch the file data (this already throws an HttpException if not found)
      const fileData = await this.getFileMetadata(fileId);

      let parentFolderId: string | null = null;
      let parentFolderName: string | null = null;

      // 2. Check if it has a parent folder and fetch its name
      if (fileData.parents && fileData.parents.length > 0) {
        parentFolderId = fileData.parents[0];

        try {
          const { data: folderData } = await this.drive.files.get({
            fileId: parentFolderId,
            fields: 'name',
          });
          parentFolderName = folderData.name ?? null;
        } catch (folderError) {
          console.warn(
            `Could not fetch parent folder name for ID: ${parentFolderId}`,
          );
          // We don't throw an error here so the user still gets the file data
          // even if the folder name request fails due to permissions.
        }
      }

      // 3. Return the combined result
      return {
        ...fileData,
        parentFolderId,
        parentFolderName,
      };
    } catch (e) {
      // If the error is already an HttpException from getFileMetadata, rethrow it
      if (e instanceof HttpException) {
        throw e;
      }

      // Fallback for any other unexpected errors
      throw new HttpException(
        'Failed to fetch file metadata with parent',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  };

  getFileStream = async (fileId: string): Promise<NodeJS.ReadableStream> => {
    try {
      const res = await this.drive.files.get(
        { fileId, alt: 'media' },
        { responseType: 'stream' },
      );
      return res.data as NodeJS.ReadableStream;
    } catch (e) {
      if (e instanceof GaxiosError && e.code == 404) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }
      throw new HttpException(
        'Failed to fetch file stream',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  };

  getFolderStats = async (folderId: string) => {
    const statsPromise = this.drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(size)',
      pageSize: 1000,
    });

    const [statsResponse] = await Promise.all([statsPromise]);

    const allFiles = statsResponse.data.files || [];
    const totalCount = allFiles.length;
    const totalSize = allFiles.reduce(
      (acc, file) => acc + parseInt(file.size || '0'),
      0,
    );
    return { totalCount, totalSize };
  };

  getFilesInFolder = async (folderId: string, pageToken?: string) => {
    try {
      const listPromise = this.drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        pageSize: 25,
        fields: 'nextPageToken, files(id, name, mimeType, size, createdTime)',
        pageToken: pageToken || undefined,
        orderBy: 'createdTime desc',
      });
      // 2. Fetch all files in the folder (minimal fields) to calculate totals
      const statsPromise = this.drive.files.list({
        q: `'${folderId}' in parents and trashed = false`,
        fields: 'files(size)',
        pageSize: 1000,
      });
      const [listResponse, statsResponse] = await Promise.all([
        listPromise,
        statsPromise,
      ]);
      const allFiles = statsResponse.data.files || [];
      const totalCount = allFiles.length;
      const totalSize = allFiles.reduce(
        (acc, file) => acc + parseInt(file.size || '0'),
        0,
      );

      return {
        files: listResponse.data.files,
        nextPageToken: listResponse.data.nextPageToken || null,
        totalCount,
        totalSize,
      };
    } catch (e) {
      console.error('List Files in Folder Error:', e);
      throw new HttpException(
        'Failed to fetch files from specific folder',
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  };

  renameFile = async (fileId: string, newName: string) => {
    try {
      const response = await this.drive.files.update({
        fileId: fileId,
        requestBody: {
          name: newName,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Drive Rename Error:', error);
      throw new HttpException(
        'Failed to rename file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  };

  deleteFile = async (fileId: string) => {
    try {
      // We use delete instead of trashed=true for a permanent clean-up
      await this.drive.files.update({
        fileId: fileId,
        requestBody: { trashed: true },
      });
      return { success: true, message: 'File deleted successfully' };
    } catch (error) {
      console.error('Drive Delete Error:', error);
      throw new HttpException(
        'Failed to delete file',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  };

  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: ['https://www.googleapis.com/auth/drive'],
    });
  }

  async exchangeCodeForTokens(code: string): Promise<Auth.Credentials> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      this.oauth2Client.setCredentials(tokens);
      return tokens;
    } catch (e) {
      console.error('Error exchanging code for tokens:', e);
      throw new HttpException(
        'Failed to authenticate with Google',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}
