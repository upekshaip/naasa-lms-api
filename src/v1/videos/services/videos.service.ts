import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { CreateVideoDto } from '../dto/create-video.dto.js';
import { DatabaseService } from '../../../database/database.service.js';
import { UpdateStatusDto } from '../dto/update-status.dto.js';
import { Request } from 'express';
import { $Enums, Prisma } from '../../../../generated/prisma/client.js';
import { RenameVideoDto } from '../dto/rename-video.dto.js';
import { QueryVideoDto } from '../dto/query-video.dto.js';
import { R2Service } from '../../cloudfalre/services/r2.service.js';

@Injectable()
export class VideosService {
  constructor(
    private readonly db: DatabaseService,
    private readonly r2Service: R2Service,
  ) {}

  async getVideos(req: Request, query: QueryVideoDto) {
    // 1. Authorization Check
    if (!req.teacherId) {
      throw new HttpException(
        'Only teachers can access videos',
        HttpStatus.FORBIDDEN,
      );
    }

    // 2. Pagination & Search Prep
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    // Define the where clause once to reuse it for both query and count
    const whereClause: Prisma.VideoWhereInput = {
      teacherId: req.teacherId,
      ...(query.search && {
        title: {
          contains: query.search,
          mode: 'insensitive',
        },
      }),
    };

    // 3. Concurrent Database Calls
    // We fetch the data and the total count simultaneously for performance
    const [videos, totalCount] = await Promise.all([
      this.db.video.findMany({
        where: whereClause,
        skip: skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.db.video.count({
        where: whereClause,
      }),
    ]);

    // 4. Metadata Calculation & Return
    return {
      videos,
      meta: {
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
        currentPage: page,
        limit: limit,
      },
    };
  }

  async createVideo(req: Request, createVideoDto: CreateVideoDto) {
    // 1. Get Teacher ID from the authenticated user
    const teacher = await this.db.teacherProfile.findUnique({
      where: { teacherId: req.teacherId },
    });

    if (!teacher) {
      throw new HttpException(
        'Only teachers can create videos',
        HttpStatus.FORBIDDEN,
      );
    }

    // 2. Create the video record
    const res = await this.db.video.create({
      data: {
        title: createVideoDto.title,
        videoId: createVideoDto.videoId,
        videoKey: createVideoDto.videoKey,
        teacherId: teacher.teacherId,
        status: 'processing',
      },
    });
    return res;
  }

  async updateVideoStatus(req: Request, statusDto: UpdateStatusDto) {
    if (!req.teacherId) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    const teacher = await this.db.teacherProfile.findUnique({
      where: { teacherId: req.teacherId },
    });

    if (!teacher) {
      throw new HttpException(
        'Only teachers can update video status',
        HttpStatus.FORBIDDEN,
      );
    }

    const video = await this.db.video.findFirst({
      where: { videoId: statusDto.videoId, teacherId: teacher.teacherId },
    });

    if (!video)
      throw new HttpException('Video not found', HttpStatus.NOT_FOUND);

    // Update the status (e.g., from 'processing' to 'ready')
    return this.db.video.update({
      where: { id: video.id },
      data: {
        status: statusDto.status as $Enums.VideoStatus,
        videoKey: statusDto.videoKey || undefined,
      },
    });
  }

  async findVideoKey(videoId: string, req: Request) {
    const isAbleToAccess = await this.ableToAccessFile(videoId, req);

    if (!isAbleToAccess) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    const video = await this.db.video.findFirst({
      where: { videoId },
      select: { videoKey: true },
    });

    if (!video) throw new HttpException('Key not found', HttpStatus.NOT_FOUND);

    return video.videoKey;
  }

  async deleteVideo(videoId: string, req: Request) {
    if (!req.teacherId) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    const video = await this.db.video.findFirst({
      where: { videoId: videoId, teacherId: req.teacherId },
      include: {
        classContents: {
          select: { contentId: true },
        },
      },
    });

    if (!video)
      throw new HttpException('Video not found', HttpStatus.NOT_FOUND);

    // remove from clouflare R2 if exists
    await this.r2Service.deleteFilesWithPrefix(
      `teacher/${req.teacherId}/video/${videoId}/`,
    );

    if (video.classContents.length > 0) {
      await this.db.classContent.deleteMany({
        where: {
          contentId: { in: video.classContents.map((c) => c.contentId) },
        },
      });
    }

    await this.db.video.delete({
      where: { id: video.id },
    });
    return { message: 'Video deleted successfully' };
  }

  async renameVideo(
    req: Request,
    videoId: string,
    renameVideoDto: RenameVideoDto,
  ) {
    if (!req.teacherId) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    const video = await this.db.video.findFirst({
      where: { videoId: videoId, teacherId: req.teacherId },
    });

    if (!video)
      throw new HttpException('Video not found', HttpStatus.NOT_FOUND);

    return this.db.video.update({
      where: { id: video.id },
      data: {
        title: renameVideoDto.title,
      },
    });
  }

  async ableToAccessFile(videoId: string, req: Request) {
    // 1. Admins have universal access
    if (req.isAdmin) return true;

    // 2. Teacher Owner Check
    if (req.isTeacher && req.teacherId) {
      const videRecord = await this.db.video.findFirst({
        where: {
          videoId: videoId,
          teacherId: req.teacherId,
        },
      });
      if (videRecord) return true;
    }

    // // 3. Free First Section Check (No enrollment required)
    // const isFreeFile = await this.db.classContent.findFirst({
    //   where: {
    //     sectionId: 1,
    //     media: { fileId: videoId },
    //     class: { firstSectionFreeApplied: true },
    //   },
    //   select: { contentId: true }, // Lightweight select
    // });

    // if (isFreeFile) return true;

    // // 4. Enrolled Student Check
    // if (req.isStudent && req.studentId) {
    //   const whereClause = {
    //     studentId: req.studentId,
    //     createdAt: { lt: new Date() },

    //     OR: [
    //       // Scenario A: Enrollment is active (unexpired), and the class has the file
    //       {
    //         expiresAt: { gt: new Date() },
    //         classPricePlan: {
    //           classes: {
    //             some: {
    //               class: {
    //                 contents: {
    //                   some: { media: { fileId: videoId } },
    //                 },
    //               },
    //             },
    //           },
    //         },
    //       },
    //       // Scenario B: Enrollment might be expired, but the SPECIFIC class containing the file is active forever
    //       {
    //         classPricePlan: {
    //           classes: {
    //             some: {
    //               class: {
    //                 isActiveForever: true,
    //                 contents: {
    //                   some: { media: { fileId: videoId } },
    //                 },
    //               },
    //             },
    //           },
    //         },
    //       },
    //     ],
    //   };

    //   const enrollmentCount = await this.db.classEnrollment.count({
    //     where: whereClause,
    //   });

    //   console.log(enrollmentCount, new Date());
    //   // console.log();

    //   return enrollmentCount > 0;
    // }
    return false; // Default deny
  }
}
