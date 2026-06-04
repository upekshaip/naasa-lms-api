import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateNotificationDto } from './dto/create-notification.dto.js';
import { Request } from 'express';
import { QueryNotificationFilterDto } from './dto/query-notification-filter.js';
import { DatabaseService } from '../../database/database.service.js';
import { BroadcastNotificationDto } from './dto/broadcast-notification.js';

@Injectable()
export class NotificationsService {
  constructor(private readonly db: DatabaseService) {}

  async getMyNotifications(req: Request, query: QueryNotificationFilterDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const notifications = this.db.notification.findMany({
      where: {
        userId: req.userId,
      },
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const totalReq = this.db.notification.count({
      where: {
        userId: req.userId,
      },
    });

    const [requests, total] = await Promise.all([notifications, totalReq]);

    return {
      notifications: requests,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async clearAllNotifications(req: Request) {
    await this.db.notification.deleteMany({
      where: {
        userId: req.userId,
      },
    });

    return {
      message: 'All notifications cleared',
    };
  }

  async clearNotification(id: number, req: Request) {
    await this.db.notification.deleteMany({
      where: {
        id: id,
        userId: req.userId,
      },
    });

    return {
      message: 'Notification cleared',
    };
  }

  async getNotificationCount(req: Request) {
    const count = await this.db.notification.count({
      where: {
        userId: req.userId,
      },
    });
    return {
      count,
    };
  }

  async broadcastMessage(req: Request, body: BroadcastNotificationDto) {
    const { classSlug, title, message, url } = body;

    if (!req.isAdmin) {
      const teacher = await this.db.teacherProfile.findUnique({
        where: {
          teacherId: req.teacherId,
        },
        select: {
          user: true,
          canBroadcastMessage: true,
        },
      });
      if (!teacher) {
        throw new HttpException(
          'Teacher profile not found',
          HttpStatus.NOT_FOUND,
        );
      }
      if (!teacher.canBroadcastMessage) {
        throw new HttpException(
          'You do not have permission to broadcast messages',
          HttpStatus.FORBIDDEN,
        );
      }
    }

    const myclass = await this.db.class.findFirst({
      where: {
        slug: classSlug,
        // Ensure this matches how your auth attaches the user/teacher ID to the request
        teacherId: req.teacherId,
      },
      select: {
        classPricePlans: {
          select: {
            pricePlan: {
              select: {
                classEnrollments: {
                  select: {
                    student: {
                      select: {
                        userId: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!myclass) {
      throw new HttpException('Class not found', HttpStatus.NOT_FOUND);
    }

    // Flatten the nested arrays and extract the userIds
    const rawUserIds = myclass.classPricePlans
      // 1. Combine all enrollments from all price plans connected to this class into one flat array
      .flatMap((connection) => connection.pricePlan?.classEnrollments || [])
      // 2. Extract the userId from the student profile
      .map((enrollment) => enrollment.student?.userId)
      // 3. Remove any null or undefined IDs
      .filter((id) => id !== null && id !== undefined);

    // Remove duplicates in case a student bought multiple plans for the same class
    const uniqueUserIds = [...new Set(rawUserIds)];

    if (uniqueUserIds.length === 0) {
      throw new HttpException(
        'No valid students enrolled in this class',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Map the unique IDs into an array of objects for Prisma createMany
    const notificationsData = uniqueUserIds.map((userId) => ({
      userId,
      title,
      message,
      url,
    }));

    const notifications = await this.db.notification.createMany({
      data: notificationsData,
    });

    return {
      message: 'Notification broadcasted successfully',
      count: notifications.count,
    };
  }
}
