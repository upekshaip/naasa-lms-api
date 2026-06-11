import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { Request } from 'express';
import { QueryTeacherPricePlansDto } from '../dto/query-teacher-price-plans.dto.js';
import { QueryAdminPricePlansDto } from '../dto/query-admin-price-plans.dto.js';
import { Prisma } from '../../../../generated/prisma/client.js';

@Injectable()
export class FilterPricePlansService {
  constructor(private readonly db: DatabaseService) {}

  async findPricePlansByTeacher(
    req: Request,
    teacherId: number,
    query: QueryTeacherPricePlansDto,
  ) {
    const limit = query.limit || 10;
    const page = query.page || 1;
    const status = query.status || undefined;
    const offset = (page - 1) * limit;

    const transactionOperations = [
      this.db.classPricePlan.findMany({
        where: { teacherId: teacherId, status: status },
        skip: offset,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          teacher: { select: { user: { select: { name: true } } } },
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
        },
      }),
      // active count
      this.db.classPricePlan.count({
        where: { teacherId, status: 'active' },
      }),
      // total count
      this.db.classPricePlan.count({ where: { teacherId } }),
      // pending count
      this.db.classPricePlan.count({
        where: { teacherId, status: 'pending' },
      }),
      // filtered count
      this.db.classPricePlan.count({
        where: { teacherId, status },
      }),
    ];

    const [plans, activePlans, allPlans, pendingPlans, filteredTotal] =
      await Promise.all(transactionOperations);

    const totalPages = Math.ceil(Number(filteredTotal) / limit);

    return {
      data: plans,
      counts: {
        active: activePlans,
        total: allPlans,
        pending: pendingPlans,
        archived:
          Number(allPlans) - (Number(activePlans) + Number(pendingPlans)),
      },
      pagination: {
        page,
        limit,
        offset,
        totalPages,
        filteredTotal,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        nextPage: page < totalPages ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null,
      },
    };
  }

  async getAllPricePlansforTeacher(req: Request) {
    const allPlans = await this.db.classPricePlan.findMany({
      where: {
        teacherId: req.teacherId,
      },
      select: {
        slug: true,
        name: true,
        status: true,
      },
    });

    return allPlans;
  }

  /**
   * Admin: paginated price plans across all teachers, enriched with teacher info,
   * linked classes, the approving admin, total enrollments and total revenue.
   * Supports search (plan or teacher name) and approval-state filtering.
   * Used by the admin price-plan-management page (approval workflow).
   */
  async getAllPricePlansGlobalForAdmin(
    req: Request,
    query: QueryAdminPricePlansDto,
  ) {
    if (!req.isAdmin) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = query.search?.trim();

    const where: Prisma.ClassPricePlanWhereInput = {};
    if (query.approval) where.isAdminApproved = query.approval;
    if (query.teacherId) where.teacherId = Number(query.teacherId);
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        {
          teacher: {
            user: { name: { contains: search, mode: 'insensitive' } },
          },
        },
      ];
    }

    const [plans, filteredTotal, total, pending, approved, rejected] =
      await Promise.all([
        this.db.classPricePlan.findMany({
          where,
          skip: offset,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            teacher: { select: { user: { select: { name: true } } } },
            approvedByAdmin: { select: { user: { select: { name: true } } } },
            classes: {
              select: { class: { select: { name: true, slug: true } } },
            },
            _count: { select: { classEnrollments: true } },
          },
        }),
        this.db.classPricePlan.count({ where }),
        this.db.classPricePlan.count(),
        this.db.classPricePlan.count({ where: { isAdminApproved: 'pending' } }),
        this.db.classPricePlan.count({
          where: { isAdminApproved: 'approved' },
        }),
        this.db.classPricePlan.count({
          where: { isAdminApproved: 'rejected' },
        }),
      ]);

    // Revenue only for the plans on this page
    const planIds = plans.map((p) => p.id);
    const revenueGroups = planIds.length
      ? await this.db.classEnrollment.groupBy({
          by: ['classPricePlanId'],
          _sum: { purchasedAmount: true },
          where: { classPricePlanId: { in: planIds } },
        })
      : [];
    const revenueMap = new Map(
      revenueGroups.map((g) => [
        g.classPricePlanId,
        g._sum.purchasedAmount || 0,
      ]),
    );

    const data = plans.map((plan) => ({
      ...plan,
      enrollmentCount: plan._count.classEnrollments,
      revenue: revenueMap.get(plan.id) || 0,
    }));

    const totalPages = Math.ceil(filteredTotal / limit);

    return {
      data,
      counts: { total, pending, approved, rejected },
      pagination: {
        page,
        limit,
        offset,
        totalPages,
        filteredTotal,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        nextPage: page < totalPages ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null,
      },
    };
  }

  async getAllPricePlansforAdmin(req: Request, teacherId: number) {
    if (!req.isAdmin) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    const allPlans = await this.db.classPricePlan.findMany({
      where: {
        teacherId: teacherId,
      },
      select: {
        slug: true,
        name: true,
        status: true,
      },
    });

    return allPlans;
  }

  // get all approved price plans by a teacher
  // optional class slug - to get only plans linked to that class

  // what i need is to get all approved plans by teacher
  // then for each plan, check if it's linked to the class (if classSlug provided)
  // if classSlug not provided, just return all approved plans by teacher
  async findApprovedPricePlansByTeacher(
    req: Request,
    teacherId: number,
    classSlug?: string,
  ) {
    const approvedPlans = await this.db.classPricePlan.findMany({
      where: {
        teacherId: teacherId,
        isAdminApproved: 'approved',
        status: 'active',
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            classes: true,
          },
        },
      },
    });

    if (!classSlug) {
      return { pricePlans: approvedPlans };
    }
    // already checked plans connected to the class
    const approvedPlansConnected = await this.db.classPricePlan.findMany({
      where: {
        teacherId: teacherId,
        isAdminApproved: 'approved',
        status: 'active',
        classes: classSlug
          ? {
              some: {
                class: {
                  slug: classSlug,
                },
              },
            }
          : undefined,
      },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            classes: true,
          },
        },
      },
    });
    return {
      pricePlans: approvedPlans,
      connectedPricePlans: approvedPlansConnected,
    };
  }
}
