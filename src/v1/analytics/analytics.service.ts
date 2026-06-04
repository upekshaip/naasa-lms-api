import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../database/database.service.js';
import { QueryClassAnalyticsDto } from './dto/query-class-analytics.dto.js';
import { Request } from 'express';
import { Prisma } from '../../../generated/prisma/client.js';
import { QueryPlanAnalyticsDto } from './dto/query-plan-analytics.dto.js';

@Injectable()
export class AnalyticsService {
  constructor(private readonly db: DatabaseService) {}

  async getAnalyticsForClass(
    req: Request,
    classSlug: string,
    query: QueryClassAnalyticsDto,
  ) {
    let whereCondition: Prisma.Sql;

    if (classSlug === 'all') {
      whereCondition = Prisma.sql`e."teacherId" = ${req.teacherId}`;
    } else {
      const myClass = await this.db.class.findFirst({
        where: {
          slug: classSlug,
          teacherId: req.teacherId,
        },
        select: {
          id: true,
          classPricePlans: {
            select: { pricePlan: { select: { id: true } } },
          },
        },
      });

      if (!myClass) {
        throw new HttpException('Class not found', HttpStatus.NOT_FOUND);
      }

      const planIds = myClass.classPricePlans.map((plan) => plan.pricePlan.id);

      if (planIds.length === 0) return [];

      whereCondition = Prisma.sql`e."classPricePlanId" IN (${Prisma.join(planIds)})`;
    }

    const period = query.period || 'daily';

    if (period === 'daily') {
      const start = new Date(query.startDate);
      const end = new Date(query.endDate);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 366) {
        throw new HttpException(
          'Date range cannot exceed 366 days for daily analytics',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const sqlTrunc =
      period === 'monthly' ? 'month' : period === 'yearly' ? 'year' : 'day';
    const sqlInterval =
      period === 'monthly'
        ? '1 month'
        : period === 'yearly'
          ? '1 year'
          : '1 day';

    // Send the raw strings straight to Postgres so Node.js timezone doesn't interfere
    const startStr = `${query.startDate instanceof Date ? query.startDate.toISOString().split('T')[0] : query.startDate} 00:00:00`;
    const endStr = `${query.endDate instanceof Date ? query.endDate.toISOString().split('T')[0] : query.endDate} 23:59:59`;

    const analytics = await this.db.$queryRaw<
      Array<{
        date: Date;
        purchasedAmount: number;
        promoDiscountAmount: number;
        earlyBirdDiscountAmount: number;
      }>
    >`
      WITH date_series AS (
        SELECT generate_series(
          date_trunc(${sqlTrunc}, ${startStr}::timestamp),
          date_trunc(${sqlTrunc}, ${endStr}::timestamp),
          ${Prisma.raw(`'${sqlInterval}'::interval`)}
        ) AS period_date
      )
      SELECT 
        ds.period_date AS "date",
        COALESCE(SUM(e."purchasedAmount"), 0) AS "purchasedAmount",
        COALESCE(SUM(e."promoDiscountAmount"), 0) AS "promoDiscountAmount",
        COALESCE(SUM(e."earlyBirdDiscountAmount"), 0) AS "earlyBirdDiscountAmount"
      FROM date_series ds
      LEFT JOIN "ClassEnrollment" e ON 
        -- Shift UTC to SL Time BEFORE grouping!
        date_trunc(${sqlTrunc}, e."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Colombo') = ds.period_date
        AND ${whereCondition}
      GROUP BY ds.period_date
      ORDER BY ds.period_date ASC
    `;

    return analytics.map((row) => ({
      date: row.date,
      purchasedAmount: Number(row.purchasedAmount),
      promoDiscountAmount: Number(row.promoDiscountAmount),
      earlyBirdDiscountAmount: Number(row.earlyBirdDiscountAmount),
    }));
  }

  async getAnalyticsForPricePlan(
    req: Request,
    planSlug: string,
    query: QueryPlanAnalyticsDto,
  ) {
    let planIds: number[] = [];

    if (planSlug === 'all') {
      const plans = await this.db.classPricePlan.findMany({
        where: { teacherId: req.teacherId },
        select: { id: true },
      });
      planIds = plans.map((p) => p.id);

      if (planIds.length === 0) return [];
    } else {
      const plan = await this.db.classPricePlan.findFirst({
        where: {
          slug: planSlug,
          teacherId: req.teacherId,
        },
        select: { id: true },
      });

      if (!plan) {
        throw new HttpException('Price Plan not found', HttpStatus.NOT_FOUND);
      }
      planIds = [plan.id];
    }

    const period = query.period || 'daily';

    if (period === 'daily') {
      const start = new Date(query.startDate);
      const end = new Date(query.endDate);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 366) {
        throw new HttpException(
          'Date range cannot exceed 366 days for daily analytics',
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const sqlTrunc =
      period === 'monthly' ? 'month' : period === 'yearly' ? 'year' : 'day';
    const sqlInterval =
      period === 'monthly'
        ? '1 month'
        : period === 'yearly'
          ? '1 year'
          : '1 day';

    const startStr = `${query.startDate instanceof Date ? query.startDate.toISOString().split('T')[0] : query.startDate} 00:00:00`;
    const endStr = `${query.endDate instanceof Date ? query.endDate.toISOString().split('T')[0] : query.endDate} 23:59:59`;

    const analytics = await this.db.$queryRaw<
      Array<{
        date: Date;
        purchasedAmount: number;
        promoDiscountAmount: number;
        earlyBirdDiscountAmount: number;
      }>
    >`
      WITH date_series AS (
        SELECT generate_series(
          date_trunc(${sqlTrunc}, ${startStr}::timestamp),
          date_trunc(${sqlTrunc}, ${endStr}::timestamp),
          ${Prisma.raw(`'${sqlInterval}'::interval`)}
        ) AS period_date
      )
      SELECT 
        ds.period_date AS "date",
        COALESCE(SUM(e."purchasedAmount"), 0) AS "purchasedAmount",
        COALESCE(SUM(e."promoDiscountAmount"), 0) AS "promoDiscountAmount",
        COALESCE(SUM(e."earlyBirdDiscountAmount"), 0) AS "earlyBirdDiscountAmount"
      FROM date_series ds
      LEFT JOIN "ClassEnrollment" e ON 
        -- Shift UTC to SL Time BEFORE grouping!
        date_trunc(${sqlTrunc}, e."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Colombo') = ds.period_date
        AND e."classPricePlanId" IN (${Prisma.join(planIds)})
      GROUP BY ds.period_date
      ORDER BY ds.period_date ASC
    `;

    return analytics.map((row) => ({
      date: row.date,
      purchasedAmount: Number(row.purchasedAmount),
      promoDiscountAmount: Number(row.promoDiscountAmount),
      earlyBirdDiscountAmount: Number(row.earlyBirdDiscountAmount),
    }));
  }

  async getEnrollmentActivity(req: Request) {
    const teacherId = req.teacherId;
    const now = new Date();

    // Calculate start of current month in SL time
    const startOfMonth = new Date(
      now.toLocaleString('en-US', { timeZone: 'Asia/Colombo' }),
    );
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Calculate 3 days from now for expiring soon
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 3);

    const [
      totalEnrollments,
      newThisMonth,
      expiringSoon,
      expiringSoonCount,
      classesWithContent,
    ] = await Promise.all([
      // 1. Total enrollments for this teacher
      this.db.classEnrollment.count({ where: { teacherId } }),

      // 2. New this month
      this.db.classEnrollment.count({
        where: { teacherId, createdAt: { gte: startOfMonth } },
      }),

      // 3. Expiring soon
      this.db.classEnrollment.findMany({
        where: {
          teacherId,
          expiresAt: { gte: now, lte: thirtyDaysFromNow },
        },
        include: {
          student: {
            include: { user: { select: { name: true, email: true } } },
          },
          classPricePlan: { select: { name: true } },
        },
        orderBy: { expiresAt: 'asc' },
        take: 10,
      }),

      // 4. Expiring soon count
      this.db.classEnrollment.count({
        where: {
          teacherId,
          expiresAt: { gte: now, lte: thirtyDaysFromNow },
        },
      }),

      // 5. Get classes and navigate through the connection table to count enrollments
      this.db.class.findMany({
        where: { teacherId },
        select: {
          name: true,
          classPricePlans: {
            select: {
              pricePlan: {
                select: {
                  _count: {
                    select: { classEnrollments: true }, // Now we are on the right table!
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    // Calculate the top classes by mapping over the nested counts
    const formattedTopClasses = classesWithContent
      .map((c) => {
        const total = c.classPricePlans.reduce((sum, connection) => {
          // Fallback to 0 if pricePlan or _count happens to be null
          return sum + (connection.pricePlan?._count?.classEnrollments || 0);
        }, 0);
        return { name: c.name, totalEnrollments: total };
      })
      .sort((a, b) => b.totalEnrollments - a.totalEnrollments) // Sort highest to lowest
      .slice(0, 5); // Take top 5

    return {
      totalEnrollments,
      newThisMonth,
      expiringSoon,
      expiringSoonCount,
      topClasses: formattedTopClasses,
    };
  }

  async getPaymentHealth(req: Request) {
    const teacherId = req.teacherId;

    const [statusGroups, typeGroups, recentPayments] = await Promise.all([
      this.db.enrollmentPayment.groupBy({
        by: ['paymentStatus'],
        _count: { paymentId: true },
        where: { enrollments: { some: { teacherId } } },
      }),

      this.db.enrollmentPayment.groupBy({
        by: ['paymentType'],
        _count: { paymentId: true },
        where: { enrollments: { some: { teacherId } } },
      }),

      this.db.enrollmentPayment.findMany({
        where: { enrollments: { some: { teacherId } } },
        orderBy: { paymentDate: 'desc' },
        take: 10,
        include: {
          student: {
            include: { user: { select: { name: true, email: true } } },
          },
          enrollments: {
            select: { classPricePlan: { select: { name: true } } },
          },
        },
      }),
    ]);

    return {
      statusCounts: statusGroups,
      typeSplit: typeGroups,
      recentPayments,
    };
  }

  async getPromoPerformance(req: Request) {
    const teacherId = req.teacherId;

    const [promoUsage, activeEarlyBirds] = await Promise.all([
      this.db.classEnrollment.groupBy({
        by: ['promoCodeUsed'],
        _count: { id: true },
        _sum: { promoDiscountAmount: true },
        where: {
          teacherId,
          isPromoApplied: true,
          promoCodeUsed: { not: null },
        },
        orderBy: { _count: { id: 'desc' } },
      }),

      this.db.classPricePlan.findMany({
        where: { teacherId, isEarlyBirdActive: true },
        select: {
          name: true,
          earlyBirdMaxCount: true,
          _count: {
            select: {
              classEnrollments: { where: { isEarlyBirdApplied: true } },
            },
          },
        },
      }),
    ]);

    const formattedEarlyBirds = activeEarlyBirds.map((plan) => ({
      planName: plan.name,
      maxSlots: plan.earlyBirdMaxCount,
      usedSlots: plan._count.classEnrollments,
      remainingSlots: Math.max(
        0,
        plan.earlyBirdMaxCount - plan._count.classEnrollments,
      ),
    }));

    return {
      promoUsage,
      earlyBirdStatus: formattedEarlyBirds,
    };
  }

  async getStudentInsights(req: Request) {
    const teacherId = req.teacherId;

    const allEnrollments = await this.db.classEnrollment.findMany({
      where: { teacherId },
      select: {
        studentId: true,
        purchasedAmount: true,
        student: { select: { user: { select: { gender: true } } } },
      },
    });

    let totalRevenue = 0;
    const studentMap = new Map();
    const genderCounts = { m: 0, f: 0, o: 0, unknown: 0 };

    allEnrollments.forEach((enrollment) => {
      totalRevenue += enrollment.purchasedAmount;

      if (!studentMap.has(enrollment.studentId)) {
        studentMap.set(enrollment.studentId, 1);

        const gender = enrollment.student?.user?.gender;
        if (gender === 'm') genderCounts.m++;
        else if (gender === 'f') genderCounts.f++;
        else if (gender === 'o') genderCounts.o++;
        else genderCounts.unknown++;
      } else {
        studentMap.set(
          enrollment.studentId,
          studentMap.get(enrollment.studentId) + 1,
        );
      }
    });

    const uniqueStudentsCount = studentMap.size;
    let multiClassStudentsCount = 0;
    studentMap.forEach((count) => {
      if (count > 1) multiClassStudentsCount++;
    });

    const averageRevenuePerStudent =
      uniqueStudentsCount > 0 ? totalRevenue / uniqueStudentsCount : 0;
    const retentionRate =
      uniqueStudentsCount > 0
        ? (multiClassStudentsCount / uniqueStudentsCount) * 100
        : 0;

    return {
      uniqueStudentsCount,
      multiClassStudentsCount,
      retentionRatePercentage: retentionRate.toFixed(2),
      averageRevenuePerStudent: averageRevenuePerStudent.toFixed(2),
      genderSplit: genderCounts,
    };
  }

  async getAccessRequests(req: Request) {
    const teacherId = req.teacherId;

    const [totalPending, pendingRequests] = await Promise.all([
      this.db.accessRequest.count({
        where: { classPricePlan: { teacherId } },
      }),
      this.db.accessRequest.findMany({
        where: { classPricePlan: { teacherId } },
        include: {
          student: {
            include: {
              user: { select: { name: true, email: true, phone: true } },
            },
          },
          classPricePlan: { select: { name: true, price: true } },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return {
      totalPending,
      requests: pendingRequests,
    };
  }

  async getContentMedia(req: Request) {
    const teacherId = req.teacherId;

    const classesWithContent = await this.db.class.findMany({
      where: { teacherId, status: 'active' },
      select: {
        name: true,
        contents: {
          select: { type: true },
        },
      },
    });

    const platformTotals = { video: 0, media: 0, url: 0, live: 0 };

    const breakdownPerClass = classesWithContent.map((c) => {
      const counts = { video: 0, media: 0, url: 0, live: 0 };
      c.contents.forEach((content) => {
        counts[content.type]++;
        platformTotals[content.type]++;
      });
      return {
        className: c.name,
        counts,
      };
    });

    return {
      platformTotals,
      breakdownPerClass,
    };
  }
}
