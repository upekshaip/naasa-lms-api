import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { DatabaseService } from '../../../../database/database.service.js';
import { Prisma } from '../../../../../generated/prisma/client.js';
import { UserEnrollmentFilterDto } from '../dto/get-user-enrollments.dto.js';

@Injectable()
export class UserEnrollmentService {
  constructor(private readonly db: DatabaseService) {}

  // userSelectCommonFields = {
  //   userId: true,
  //   name: true,
  //   email: true,
  //   phone: true,
  //   gender: true,
  //   createdAt: true,
  //   isBlocked: true,
  //   isAdmin: true,
  //   isStudent: true,
  //   isTeacher: true,
  //   lastLoginAt: true,
  //   device: true,
  //   dob: true,
  //   address: true,
  //   studentProfile: {
  //     select: {
  //       studentId: true,
  //     },
  //   },
  //   teacherProfile: {
  //     select: {
  //       teacherId: true,
  //       canCreatePlan: true,
  //       canEditPlan: true,
  //       canBroadcastMessage: true,
  //       canBroadcastSMS: true,
  //       maxMonthlyClasslimit: true,
  //       maxOnetimeClasslimit: true,
  //       maxPricePlanLimit: true,
  //       maxVideoStorageLimit: true,
  //       maxMediaStorageLimit: true,
  //     },
  //   },
  //   adminProfile: {
  //     select: {
  //       adminId: true,
  //     },
  //   },
  // };

  async getUserEnrollments(userId: number, query: UserEnrollmentFilterDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = query.search ? query.search.trim() : null;
    const status = query.status;

    const user = await this.db.user.findUnique({
      where: { userId },
      select: {
        userId: true,
        name: true,
        email: true,
        studentProfile: {
          select: {
            studentId: true,
          },
        },
      },
    });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const whereClause: Prisma.ClassEnrollmentWhereInput = {
      studentId: user.studentProfile?.studentId,
      ...(status === 'expired' && { expiresAt: { lt: new Date() } }),
      ...(status === 'active' && { expiresAt: { gte: new Date() } }),
      ...(search && {
        OR: [
          {
            classPricePlan: {
              name: { contains: search, mode: 'insensitive' },
            },
          },
          {
            teacher: {
              user: {
                name: { contains: search, mode: 'insensitive' },
              },
            },
          },
        ],
      }),
    };

    const studentEnrollments = this.db.classEnrollment.findMany({
      where: whereClause,
      include: {
        classPricePlan: {
          select: {
            name: true,
            status: true,
            classes: {
              select: {
                classId: true,
                class: {
                  select: {
                    name: true,
                    slug: true,
                  },
                },
              },
            },
          },
        },
        teacher: {
          select: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },

      skip: offset,
      take: limit,
    });

    const total = this.db.classEnrollment.count({
      where: whereClause,
    });

    const [enrollments, totalCount] = await Promise.all([
      studentEnrollments,
      total,
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      enrollments,
      user: user,
      meta: {
        totalItems: totalCount,
        itemCount: enrollments.length,
        itemsPerPage: limit,
        totalPages: totalPages,
        currentPage: page,
      },
    };
  }
}
