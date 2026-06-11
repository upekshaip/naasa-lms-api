import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../../database/database.service.js';

import {
  calculateEnrollment,
  calculateEnrollmentDuration,
} from '../../../../calculations/enrollments.js';

import { EmailsService } from '../../../emails/emails.service.js';
import { ReceiptFileService } from '../../../media/services/receipt-file.service.js';
import { QueryGetStudentRequestsDto } from '../dto/query-get-student-requests.js';
import { QueryAllRequestsDto } from '../dto/query-all-requests.dto.js';
import { Prisma } from '../../../../../generated/prisma/browser.js';

@Injectable()
export class UserAccessRequestService {
  constructor(
    private readonly db: DatabaseService,
    private readonly receiptFileservice: ReceiptFileService,
    private readonly emailsService: EmailsService,
  ) {}
  async getAllStudentAccessRequests(
    studentId: number,
    query: QueryGetStudentRequestsDto,
  ) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 5;
    const offset = (page - 1) * limit;
    const search = query.search ? query.search.trim() : null;

    const student = await this.db.user.findFirst({
      where: {
        studentProfile: {
          studentId: studentId,
        },
      },
      select: {
        userId: true,
        name: true,
        email: true,
        phone: true,
      },
    });

    if (!student) {
      throw new HttpException('Student not found', HttpStatus.NOT_FOUND);
    }

    const whereClause: Prisma.AccessRequestWhereInput = {
      studentId,
      ...(search && {
        OR: [
          {
            classPricePlan: {
              name: { contains: search, mode: 'insensitive' },
            },
          },
          {
            classPricePlan: {
              teacher: {
                user: {
                  name: { contains: search, mode: 'insensitive' },
                },
              },
            },
          },
        ],
      }),
    };

    const res = this.db.accessRequest.findMany({
      where: whereClause,
      include: {
        classPricePlan: {
          select: {
            name: true,
            slug: true,
            teacherId: true,
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
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: offset,
      take: limit,
    });

    const totalCount = this.db.accessRequest.count({
      where: whereClause,
    });

    const [requests, total] = await Promise.all([res, totalCount]);

    return {
      data: requests,
      user: student,
      meta: {
        totalItems: total,
        itemCount: requests.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
    };
  }

  /**
   * Admin: ALL pending access requests platform-wide (paginated).
   * Includes student contact info and the plan + owning teacher
   * (teacherId is required by the frontend receipt preview CDN path).
   */
  async getAllPendingRequests(query: QueryAllRequestsDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = query.search ? query.search.trim() : null;

    const whereClause: Prisma.AccessRequestWhereInput = {
      ...(search && {
        OR: [
          {
            student: {
              user: { name: { contains: search, mode: 'insensitive' } },
            },
          },
          {
            student: {
              user: { email: { contains: search, mode: 'insensitive' } },
            },
          },
          {
            classPricePlan: {
              name: { contains: search, mode: 'insensitive' },
            },
          },
          {
            classPricePlan: {
              teacher: {
                user: { name: { contains: search, mode: 'insensitive' } },
              },
            },
          },
        ],
      }),
    };

    const [requests, total] = await Promise.all([
      this.db.accessRequest.findMany({
        where: whereClause,
        include: {
          student: {
            select: {
              studentId: true,
              user: {
                select: { name: true, email: true, phone: true },
              },
            },
          },
          classPricePlan: {
            select: {
              name: true,
              slug: true,
              price: true,
              teacherId: true,
              teacher: {
                select: { user: { select: { name: true } } },
              },
              classes: {
                select: {
                  class: { select: { name: true, slug: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip: offset,
        take: limit,
      }),
      this.db.accessRequest.count({ where: whereClause }),
    ]);

    return {
      accessRequests: requests,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
