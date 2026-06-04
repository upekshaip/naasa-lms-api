import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { QueryStudentPlansFilterDto } from '../dto/query-student-plans-filter.js';
import {
  $Enums,
  ClassPricePlanStatus,
  isAdminApproved,
  Prisma,
} from '../../../../generated/prisma/client.js';
import { Request } from 'express';

@Injectable()
export class StudentPricePlansServices {
  constructor(private readonly db: DatabaseService) {}

  async getAllAvailablePricePlans(
    req: Request,
    query: QueryStudentPlansFilterDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const teacherId = query.teacherId;
    const search = query.search;

    // Filter logic: Plan must be active, approved, and (optionally) filtered by teacher/search
    const where: Prisma.ClassPricePlanWhereInput = {
      teacher: {
        status: $Enums.UserRoleStatus.active,
      },
      status: ClassPricePlanStatus.active,
      isAdminApproved: isAdminApproved.approved,
      ...(search && {
        OR: [
          { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
          {
            description: {
              contains: search,
              mode: Prisma.QueryMode.insensitive,
            },
          },
        ],
      }),
      ...(teacherId && {
        teacherId: teacherId,
      }),
      // Ensure the plan actually has classes connected to it
      classes: {
        some: {},
      },
    };

    const planQuery = {
      where,
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        price: true,
        duration: true,
        color: true,
        promoDiscountPercentage: true,
        isPromoActive: true,
        isEarlyBirdActive: true,
        earlyBirdMaxCount: true,
        earlyBirdDiscountPercentage: true,
        createdAt: true,
        // Include the classes inside the plan
        classes: {
          select: {
            class: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
        },
        // Include teacher info
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
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc' as Prisma.SortOrder,
      },
    };

    const [plans, total] = await Promise.all([
      this.db.classPricePlan.findMany(planQuery),
      this.db.classPricePlan.count({ where }),
    ]);

    return {
      pricePlans: plans,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPricePlanBySlug(req: Request, planSlug: string) {
    const plan = await this.db.classPricePlan.findFirst({
      where: {
        slug: planSlug,
        status: ClassPricePlanStatus.active,
        isAdminApproved: isAdminApproved.approved,
        teacher: {
          status: 'active',
        },
      },
      select: {
        id: true,
        name: true,
        description: true,
        slug: true,
        price: true,
        duration: true,
        color: true,
        promoDiscountPercentage: true,
        isPromoActive: true,
        isEarlyBirdActive: true,
        earlyBirdMaxCount: true,
        earlyBirdDiscountPercentage: true,
        createdAt: true,
        // if the user already sent an access request for this plan, include the request info to show the status on the frontend
        accessRequests: {
          where: {
            studentId: req.studentId,
          },
          select: {
            id: true,
            requestNote: true,
            fileId: true,
            mimetype: true,
          },
        },
        classEnrollments: {
          // get enrollments for the current user to determine if they are already enrolled in any classes under this plan
          where: {
            studentId: req.studentId,
            expiresAt: {
              gt: new Date(),
            },
          },
          select: {
            id: true,
            expiresAt: true,
            createdAt: true,
            payment: {
              select: {
                paymentStatus: true,
                paymentSlug: true,
              },
            },
          },
          take: 1,
        },
        // Include the classes inside the plan
        classes: {
          select: {
            class: {
              select: {
                name: true,
                slug: true,
              },
            },
          },
        },
        // Include teacher info
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
    });

    if (!plan) {
      throw new HttpException('Price plan not found', HttpStatus.NOT_FOUND);
    }
    return plan;
  }
}
