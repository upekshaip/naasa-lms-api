import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { CreateFolderDto } from '../dto/create-folder.dto.js';
import { Request } from 'express';
import { GetContentQueryDto } from '../dto/query-teacher-content.js';
import { RenameFolderDto } from '../dto/rename-folder.dto.js';
import { MoveFolderDto } from '../dto/move-folder.dto.js';
import { R2Service } from '../../cloudfalre/services/r2.service.js';
import { resolveTeacherId } from '../../../utils/effective-teacher.js';

@Injectable()
export class MediaFolderService {
  constructor(
    private readonly db: DatabaseService,
    private readonly r2Service: R2Service,
  ) {}

  async createFolder(
    req: Request,
    createFolderDto: CreateFolderDto,
    overrideTeacherId?: string,
  ) {
    const teacherId = resolveTeacherId(req, overrideTeacherId);

    const { name, parentId } = createFolderDto;

    if (!name || name.trim() === '') {
      throw new HttpException(
        'Folder name is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (parentId) {
      const parentFolder = await this.db.mediaFolder.findUnique({
        where: { id: parentId, teacherId: teacherId },
      });

      if (!parentFolder) {
        throw new HttpException(
          'Parent folder not found',
          HttpStatus.NOT_FOUND,
        );
      }
      if (parentFolder.teacherId !== teacherId) {
        throw new HttpException(
          'Unauthorized to create folder under this parent',
          HttpStatus.FORBIDDEN,
        );
      }
    }
    const newFolder = await this.db.mediaFolder.create({
      data: {
        name,
        parentId: parentId || null,
        teacherId: teacherId,
      },
    });
    return newFolder;
  }

  async getTeacherContent(req: Request, query: GetContentQueryDto) {
    const teacherId = resolveTeacherId(req, query.teacherId);

    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const parentId = query.folderId || null;

    if (parentId) {
      const parentFolder = await this.db.mediaFolder.findUnique({
        where: { id: parentId },
      });

      if (!parentFolder || parentFolder.teacherId !== teacherId) {
        throw new HttpException(
          'Folder not found or unauthorized',
          HttpStatus.NOT_FOUND,
        );
      }
    }

    // Run 4 queries in parallel: fetch folders, fetch files, and count both
    const [folders, files, totalFolders, totalFiles] = await Promise.all([
      this.db.mediaFolder.findMany({
        where: {
          teacherId: teacherId,
          parentId: parentId, // Use parentId for folders
        },
        skip: skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.media.findMany({
        where: {
          teacherId: teacherId,
          mediaFolderId: parentId, // Use mediaFolderId for files
        },
        skip: skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.mediaFolder.count({
        where: {
          teacherId: teacherId,
          parentId: parentId,
        },
      }),
      this.db.media.count({
        where: {
          teacherId: teacherId,
          mediaFolderId: parentId,
        },
      }),
    ]);

    // Calculate pagination based on whichever list is longer
    const maxTotalItems = Math.max(totalFolders, totalFiles);

    return {
      data: {
        folders,
        files,
      },
      meta: {
        totalItems: totalFolders + totalFiles,
        totalFolders,
        totalFiles,
        currentPage: page,
        totalPages: Math.ceil(maxTotalItems / limit),
        hasNextPage: page * limit < maxTotalItems,
      },
    };
  }

  async renameFolder(
    req: Request,
    folderId: number,
    dto: RenameFolderDto,
    overrideTeacherId?: string,
  ) {
    const teacherId = resolveTeacherId(req, overrideTeacherId);

    const folder = await this.db.mediaFolder.findUnique({
      where: { id: folderId },
    });

    if (!folder || folder.teacherId !== teacherId) {
      throw new HttpException(
        'Folder not found or unauthorized',
        HttpStatus.NOT_FOUND,
      );
    }

    return await this.db.mediaFolder.update({
      where: { id: folderId },
      data: { name: dto.name },
    });
  }

  async moveFolder(
    req: Request,
    folderId: number,
    dto: MoveFolderDto,
    overrideTeacherId?: string,
  ) {
    const teacherId = resolveTeacherId(req, overrideTeacherId);

    if (folderId === dto.parentId) {
      throw new HttpException(
        'Cannot move a folder into itself',
        HttpStatus.BAD_REQUEST,
      );
    }

    const folder = await this.db.mediaFolder.findUnique({
      where: { id: folderId },
    });

    if (!folder || folder.teacherId !== teacherId) {
      throw new HttpException(
        'Folder not found or unauthorized',
        HttpStatus.NOT_FOUND,
      );
    }

    if (dto.parentId) {
      const targetFolder = await this.db.mediaFolder.findUnique({
        where: { id: dto.parentId },
      });

      if (!targetFolder || targetFolder.teacherId !== teacherId) {
        throw new HttpException(
          'Target folder not found or unauthorized',
          HttpStatus.NOT_FOUND,
        );
      }
    }

    return await this.db.mediaFolder.update({
      where: { id: folderId },
      data: { parentId: dto.parentId || null },
    });
  }

  private async getAllDescendantFolderIds(
    startFolderId: number,
  ): Promise<number[]> {
    const folderIds = [startFolderId];
    let currentIndex = 0;

    // Traverse down the folder tree to find all children, grandchildren, etc.
    while (currentIndex < folderIds.length) {
      const currentId = folderIds[currentIndex];
      const children = await this.db.mediaFolder.findMany({
        where: { parentId: currentId },
        select: { id: true },
      });

      for (const child of children) {
        folderIds.push(child.id);
      }
      currentIndex++;
    }

    return folderIds;
  }

  async deleteFolder(
    req: Request,
    folderId: number,
    overrideTeacherId?: string,
  ) {
    const teacherId = resolveTeacherId(req, overrideTeacherId);

    // 1. Verify the root folder exists and belongs to the teacher
    const folder = await this.db.mediaFolder.findUnique({
      where: { id: folderId },
    });

    if (!folder || folder.teacherId !== teacherId) {
      throw new HttpException(
        'Folder not found or unauthorized',
        HttpStatus.NOT_FOUND,
      );
    }

    // 2. Get the IDs of this folder AND every subfolder inside it
    const allFolderIdsToDelete = await this.getAllDescendantFolderIds(folderId);

    // 3. Find all media files contained within any of these folders
    const mediaFiles = await this.db.media.findMany({
      where: { mediaFolderId: { in: allFolderIdsToDelete } },
      select: { mediaId: true, fileId: true },
    });

    // 4. Delete the physical files from Cloudflare R2
    if (mediaFiles.length > 0) {
      // We use Promise.allSettled so if one file fails to delete, it doesn't stop the rest
      const deletePromises = mediaFiles.map((file) =>
        this.r2Service.deleteFile(
          this.r2Service.createContentPath(file.fileId, teacherId),
        ),
      );
      await Promise.allSettled(deletePromises);
    }

    // 5. Clean up Database Relations (ClassContent)
    const mediaIds = mediaFiles.map((m) => m.mediaId);
    if (mediaIds.length > 0) {
      await this.db.classContent.deleteMany({
        where: { mediaId: { in: mediaIds } },
      });

      // 6. Delete Media Records from DB
      await this.db.media.deleteMany({
        where: { mediaId: { in: mediaIds } },
      });
    }

    // 7. Delete the folders from the DB
    // We reverse the array to delete the deepest child folders first.
    // This prevents Prisma Foreign Key Constraint errors if onDelete: Cascade isn't set up.
    const reversedFolderIds = allFolderIdsToDelete.reverse();
    for (const id of reversedFolderIds) {
      await this.db.mediaFolder.delete({
        where: { id: id },
      });
    }

    return {
      success: true,
      message: 'Folder and all contents deleted successfully',
    };
  }
}
