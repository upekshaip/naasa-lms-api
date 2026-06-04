import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

// import { UpdateClassContentDto } from './dto/update-class-content.dto';
import { DatabaseService } from '../../../database/database.service.js';
import { CreateClassContentDto } from '../dto/create-class-content.dto.js';
import { UpdateClassContentsDto } from '../dto/update-class-content.dto.js';
import {
  ClassContent,
  ContentType,
} from '../../../../generated/prisma/browser.js';
import { Request } from 'express';
import { PrismaPromise } from '../../../../generated/prisma/internal/prismaNamespace.js';

@Injectable()
export class ClassContentsService {
  constructor(private readonly db: DatabaseService) {}

  async getClassContent(req: Request, slug: string) {
    const classContent = await this.db.class.findFirst({
      where: { slug: slug, teacherId: req.teacherId },
      include: {
        teacher: { select: { user: { select: { name: true } } } },
        contents: {
          include: {
            media: true,
            video: {
              select: {
                videoId: true,
                id: true,
                title: true,
                status: true,
              },
            },
          },
        },
      },
    });
    if (!classContent) {
      throw new HttpException('Class not found', HttpStatus.NOT_FOUND);
    }
    return classContent;
  }

  async updateContents(
    slug: string,
    updateClassContentsDto: UpdateClassContentsDto,
    req: Request,
  ) {
    const classData = await this.getClassContent(req, slug);
    if (!(classData.teacherId === req.teacherId || req.isAdmin)) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    // 1. Identify contents to DELETE
    // If it exists in DB but not in the incoming DTO, it should be removed.
    const incomingContentIds = updateClassContentsDto.contents
      .filter((c) => c.contentId)
      .map((c) => c.contentId);

    const contentIdsToDelete = classData.contents
      .filter((content) => !incomingContentIds.includes(content.contentId))
      .map((content) => content.contentId);

    // 2. Identify contents to CREATE and UPDATE
    const newContents = updateClassContentsDto.contents.filter(
      (c) => c.isNew === true && !c.contentId,
    );

    const contentsToUpdate = updateClassContentsDto.contents.filter(
      (c) => c.isNew === false && c.contentId,
    );

    // --- Prepare the Transaction Operations ---
    const transactionOperations: PrismaPromise<any>[] = [];

    // A. Add Delete Operation
    if (contentIdsToDelete.length > 0) {
      transactionOperations.push(
        this.db.classContent.deleteMany({
          where: {
            contentId: { in: contentIdsToDelete },
          },
        }),
      );
    }

    // B. Add Create Operation
    if (newContents.length > 0) {
      transactionOperations.push(
        this.db.classContent.createMany({
          data: newContents.map((content) => ({
            classId: classData.id,
            title: content.title,
            description: content.description || '',
            type: content.type,
            contentUrl: content.contentUrl,
            sectionId: content.sectionId,
            orderId: content.orderId,
            mediaId: content.mediaId || null,
            videoId: content.videoId || null,
          })),
        }),
      );
    }

    // C. Add Update Operations
    // Note: Prisma cannot bulk update different values for different rows in one query,
    // so we map each update to an individual promise.
    contentsToUpdate.forEach((c) => {
      transactionOperations.push(
        this.db.classContent.update({
          where: { contentId: c.contentId },
          data: {
            title: c.title,
            description: c.description || undefined,
            type: c.type,
            contentUrl: c.contentUrl,
            sectionId: c.sectionId,
            orderId: c.orderId,
            mediaId: c.mediaId || null,
            videoId: c.videoId || null,
          },
        }),
      );
    });

    // Execute all operations in a SINGLE transaction
    if (transactionOperations.length > 0) {
      await this.db.$transaction(transactionOperations);
    }

    // 4. Return fresh data
    return await this.getClassContent(req, slug);
  }
}
