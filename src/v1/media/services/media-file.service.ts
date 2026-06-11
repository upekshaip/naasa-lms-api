// In your FilesService

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { R2Service } from '../../cloudfalre/services/r2.service.js';
import { DatabaseService } from '../../../database/database.service.js';
import { Request, Response } from 'express';
import { resolveTeacherId } from '../../../utils/effective-teacher.js';

@Injectable()
export class MediaFileService {
  constructor(
    private readonly r2Service: R2Service,
    private readonly db: DatabaseService,
  ) {}

  async ableToAccessFile(fileId: string, req: Request) {
    // 1. Admins have universal access
    if (req.isAdmin) return true;

    // 2. Teacher Owner Check
    if (req.isTeacher && req.teacherId) {
      const fileRecord = await this.db.media.findFirst({
        where: {
          fileId: fileId,
          teacherId: req.teacherId,
        },
      });
      if (fileRecord) return true;
    }

    // 3. Free First Section Check (No enrollment required)
    const isFreeFile = await this.db.classContent.findFirst({
      where: {
        sectionId: 1,
        media: { fileId: fileId },
        class: { firstSectionFreeApplied: true },
      },
      select: { contentId: true }, // Lightweight select
    });

    if (isFreeFile) return true;

    // 4. Enrolled Student Check
    if (req.isStudent && req.studentId) {
      const whereClause = {
        studentId: req.studentId,
        createdAt: { lt: new Date() },

        OR: [
          // Scenario A: Enrollment is active (unexpired), and the class has the file
          {
            expiresAt: { gt: new Date() },
            classPricePlan: {
              classes: {
                some: {
                  class: {
                    contents: {
                      some: { media: { fileId: fileId } },
                    },
                  },
                },
              },
            },
          },
          // Scenario B: Enrollment might be expired, but the SPECIFIC class containing the file is active forever
          {
            classPricePlan: {
              classes: {
                some: {
                  class: {
                    isActiveForever: true,
                    contents: {
                      some: { media: { fileId: fileId } },
                    },
                  },
                },
              },
            },
          },
        ],
      };

      const enrollmentCount = await this.db.classEnrollment.count({
        where: whereClause,
      });

      console.log(enrollmentCount, new Date());
      // console.log();

      return enrollmentCount > 0;
    }
    return false; // Default deny
  }

  // --- FILE STREAM LOGIC (getRawFile) ---
  async getRawFile(fileId: string, req: Request, res: Response) {
    const canAccess = await this.ableToAccessFile(fileId, req);
    if (!canAccess) throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);

    const fileRecord = await this.db.media.findFirst({
      where: { fileId: fileId },
    });

    if (!fileRecord)
      throw new HttpException('File record not found', HttpStatus.NOT_FOUND);

    res.setHeader(
      'Content-Type',
      fileRecord.mimetype || 'application/octet-stream',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileRecord.fileName}"`,
    );
    if (fileRecord.fileSize) {
      res.setHeader('Content-Length', fileRecord.fileSize.toString());
    }

    // Rebuild the exact R2 Key
    const r2Key = this.r2Service.createContentPath(
      fileRecord.fileId,
      fileRecord.teacherId,
    );

    // Stream using the rebuilt key
    const fileStream = await this.r2Service.getFileStream(r2Key);
    fileStream.pipe(res);
  }

  // --- FILE UPLOAD LOGIC ---
  async uploadLessonFile(
    req: Request,
    file: Express.Multer.File,
    folderId?: number,
    overrideTeacherId?: string,
  ) {
    const teacherId = resolveTeacherId(req, overrideTeacherId);

    if (folderId) {
      const folder = await this.db.mediaFolder.findUnique({
        where: { id: folderId },
      });
      if (!folder || folder.teacherId !== teacherId) {
        throw new HttpException('Invalid folder', HttpStatus.FORBIDDEN);
      }
    }

    // 0. Enforce the teacher's media storage limit before uploading
    const teacher = await this.db.teacherProfile.findUnique({
      where: { teacherId: teacherId },
      select: { maxMediaStorageLimit: true },
    });
    if (!teacher) {
      throw new HttpException(
        'Teacher profile not found',
        HttpStatus.NOT_FOUND,
      );
    }
    const usage = await this.db.media.aggregate({
      _sum: { fileSize: true },
      where: { teacherId: teacherId },
    });
    const usedBytes = usage._sum.fileSize ? Number(usage._sum.fileSize) : 0;
    const limitBytes = teacher.maxMediaStorageLimit * 1024 * 1024 * 1024;
    if (usedBytes + file.size > limitBytes) {
      throw new HttpException(
        `Uploading this file would exceed your media storage limit (${teacher.maxMediaStorageLimit} GB). Please contact an admin to increase it.`,
        HttpStatus.FORBIDDEN,
      );
    }

    // 1. Generate the unique filename
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

    // 2. Build the exact R2 key using the prefix
    const r2Key = this.r2Service.createContentPath(uniqueName, teacherId);

    // 3. Upload using the full path
    await this.r2Service.uploadBuffer(file.buffer, r2Key, file.mimetype);

    const fileExtension = file.originalname.split('.').pop() || 'unknown';

    return await this.db.media.create({
      data: {
        fileId: uniqueName, // <--- SAVE ONLY THE NAME HERE
        fileName: file.originalname,
        fileType: fileExtension,
        mimetype: file.mimetype,
        fileSize: BigInt(file.size),
        MediaDrive: 'r2',
        teacherId: teacherId,
        mediaFolderId: folderId || null,
      },
    });
  }

  // --- FILE RENAME LOGIC ---
  async renameFile(
    req: Request,
    fileId: string,
    newName: string,
    overrideTeacherId?: string,
  ) {
    const teacherId = resolveTeacherId(req, overrideTeacherId);

    const media = await this.db.media.findFirst({
      where: { fileId: fileId, teacherId: teacherId },
    });

    if (!media) throw new HttpException('File not found', HttpStatus.NOT_FOUND);

    // We only need to rename in the database, R2 doesn't care about the visual name!
    return await this.db.media.update({
      where: { mediaId: media.mediaId },
      data: { fileName: newName },
    });
  }

  // --- FILE MOVE LOGIC ---
  async moveFile(
    req: Request,
    fileId: string,
    parentId?: number | null,
    overrideTeacherId?: string,
  ) {
    const teacherId = resolveTeacherId(req, overrideTeacherId);

    // 1. Verify the file exists and belongs to the teacher
    const media = await this.db.media.findFirst({
      where: { fileId: fileId, teacherId: teacherId },
    });

    if (!media) {
      throw new HttpException('File not found', HttpStatus.NOT_FOUND);
    }

    // 2. If moving into a folder, verify the target folder exists and belongs to the teacher
    if (parentId) {
      const targetFolder = await this.db.mediaFolder.findUnique({
        where: { id: parentId },
      });

      if (!targetFolder || targetFolder.teacherId !== teacherId) {
        throw new HttpException(
          'Target folder not found or unauthorized',
          HttpStatus.NOT_FOUND,
        );
      }
    }

    // 3. Update the file's location in the database
    return await this.db.media.update({
      where: { mediaId: media.mediaId },
      data: { mediaFolderId: parentId || null },
    });
  }

  // --- FILE DELETE LOGIC ---
  async deleteFile(req: Request, fileId: string, overrideTeacherId?: string) {
    const teacherId = resolveTeacherId(req, overrideTeacherId);

    const media = await this.db.media.findFirst({
      where: { fileId: fileId, teacherId: teacherId },
    });

    if (!media) throw new HttpException('File not found', HttpStatus.NOT_FOUND);

    // Rebuild the exact R2 Key
    const r2Key = this.r2Service.createContentPath(
      media.fileId,
      media.teacherId,
    );

    await this.db.classContent.deleteMany({
      where: { mediaId: media.mediaId },
    });
    await this.db.media.delete({ where: { mediaId: media.mediaId } });

    // Delete from R2 using the rebuilt key
    await this.r2Service.deleteFile(r2Key);

    return { success: true };
  }
}
