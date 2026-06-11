import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../../database/database.service.js';
import { Prisma } from '../../../../../generated/prisma/client.js';
import {
  QueryEnrollmentReportDto,
  QueryFinanceByTeacherDto,
  QueryRecentActivityDto,
  QueryRevenueAnalyticsDto,
  QueryUserGrowthDto,
} from '../dto/query-admin-analytics.dto.js';

/**
 * Platform-wide analytics for admins. Unlike the teacher-scoped AnalyticsService,
 * every method here aggregates across ALL teachers / students / classes.
 *
 * NOTE: the platform deploys to Vercel (serverless), so everything is computed
 * on-demand per request - there are no background jobs or cron aggregations.
 */
@Injectable()
export class AdminAnalyticsService {
  constructor(private readonly db: DatabaseService) {}

  /** % change between a current and previous window. Returns 0 when there's no baseline. */
  private growthPercent(current: number, previous: number): number {
    if (previous === 0) {
      return current > 0 ? 100 : 0;
    }
    return Number((((current - previous) / previous) * 100).toFixed(1));
  }

  async getOverview() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const [
      totalUsers,
      totalTeachers,
      totalStudents,
      totalClasses,
      activeClasses,
      pendingPricePlans,
      totalEnrollments,
      revenueAgg,
      // growth windows
      usersCurrent,
      usersPrevious,
      classesCurrent,
      classesPrevious,
      enrollmentsCurrent,
      enrollmentsPrevious,
      revenueCurrentAgg,
      revenuePreviousAgg,
    ] = await Promise.all([
      this.db.user.count(),
      this.db.user.count({ where: { isTeacher: true } }),
      this.db.user.count({ where: { isStudent: true } }),
      this.db.class.count(),
      this.db.class.count({ where: { status: 'active' } }),
      this.db.classPricePlan.count({ where: { isAdminApproved: 'pending' } }),
      this.db.classEnrollment.count(),
      this.db.classEnrollment.aggregate({ _sum: { purchasedAmount: true } }),

      this.db.user.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.db.user.count({
        where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      }),
      this.db.class.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      this.db.class.count({
        where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      }),
      this.db.classEnrollment.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      this.db.classEnrollment.count({
        where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      }),
      this.db.classEnrollment.aggregate({
        _sum: { purchasedAmount: true },
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      this.db.classEnrollment.aggregate({
        _sum: { purchasedAmount: true },
        where: { createdAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
      }),
    ]);

    const revenueCurrent = revenueCurrentAgg._sum.purchasedAmount || 0;
    const revenuePrevious = revenuePreviousAgg._sum.purchasedAmount || 0;

    return {
      totalUsers,
      totalTeachers,
      totalStudents,
      totalClasses,
      activeClasses,
      pendingPricePlans,
      totalEnrollments,
      totalRevenue: revenueAgg._sum.purchasedAmount || 0,
      growth: {
        users: this.growthPercent(usersCurrent, usersPrevious),
        classes: this.growthPercent(classesCurrent, classesPrevious),
        enrollments: this.growthPercent(
          enrollmentsCurrent,
          enrollmentsPrevious,
        ),
        revenue: this.growthPercent(revenueCurrent, revenuePrevious),
      },
    };
  }

  private resolvePeriod(period?: string) {
    const sqlTrunc =
      period === 'monthly' ? 'month' : period === 'yearly' ? 'year' : 'day';
    const sqlInterval =
      period === 'monthly'
        ? '1 month'
        : period === 'yearly'
          ? '1 year'
          : '1 day';
    return { sqlTrunc, sqlInterval };
  }

  private guardDailyRange(period: string, startDate: string, endDate: string) {
    if (period === 'daily') {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffDays = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      );
      if (diffDays > 366) {
        throw new HttpException(
          'Date range cannot exceed 366 days for daily analytics',
          HttpStatus.BAD_REQUEST,
        );
      }
    }
  }

  async getRevenue(query: QueryRevenueAnalyticsDto) {
    const period = query.period || 'daily';
    this.guardDailyRange(period, query.startDate, query.endDate);
    const { sqlTrunc, sqlInterval } = this.resolvePeriod(period);

    // Send raw strings straight to Postgres so Node.js timezone doesn't interfere
    const startStr = `${query.startDate} 00:00:00`;
    const endStr = `${query.endDate} 23:59:59`;

    // Optional admin scope to a single teacher (empty fragment = platform-wide).
    const teacherFilter = query.teacherId
      ? Prisma.sql`AND e."teacherId" = ${query.teacherId}`
      : Prisma.empty;

    const analytics = await this.db.$queryRaw<
      Array<{
        date: Date;
        purchasedAmount: number;
        promoDiscountAmount: number;
        earlyBirdDiscountAmount: number;
        enrollments: bigint;
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
        COALESCE(SUM(e."earlyBirdDiscountAmount"), 0) AS "earlyBirdDiscountAmount",
        COUNT(e."id") AS "enrollments"
      FROM date_series ds
      LEFT JOIN "ClassEnrollment" e ON
        -- Shift UTC to SL Time BEFORE grouping!
        date_trunc(${sqlTrunc}, e."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Colombo') = ds.period_date
        ${teacherFilter}
      GROUP BY ds.period_date
      ORDER BY ds.period_date ASC
    `;

    return analytics.map((row) => ({
      date: row.date,
      purchasedAmount: Number(row.purchasedAmount),
      promoDiscountAmount: Number(row.promoDiscountAmount),
      earlyBirdDiscountAmount: Number(row.earlyBirdDiscountAmount),
      enrollments: Number(row.enrollments),
    }));
  }

  /**
   * Finance report aggregated per teacher over a date range (not a time series).
   * Powers the "all teachers" finance breakdown on /admin/analytics.
   *   net      = SUM(purchasedAmount)
   *   discounts = SUM(promoDiscountAmount) + SUM(earlyBirdDiscountAmount)
   *   gross    = net + discounts
   */
  async getFinanceByTeacher(query: QueryFinanceByTeacherDto) {
    const start = new Date(`${query.startDate} 00:00:00`);
    const end = new Date(`${query.endDate} 23:59:59`);

    const grouped = await this.db.classEnrollment.groupBy({
      by: ['teacherId'],
      _sum: {
        purchasedAmount: true,
        promoDiscountAmount: true,
        earlyBirdDiscountAmount: true,
      },
      _count: { id: true },
      where: {
        teacherId: { not: null },
        createdAt: { gte: start, lte: end },
      },
    });

    const teacherIds = grouped
      .map((g) => g.teacherId)
      .filter((id): id is number => id !== null);

    const teachers = teacherIds.length
      ? await this.db.teacherProfile.findMany({
          where: { teacherId: { in: teacherIds } },
          select: { teacherId: true, user: { select: { name: true } } },
        })
      : [];
    const nameById = new Map(
      teachers.map((t) => [t.teacherId, t.user?.name || 'Unknown teacher']),
    );

    const rows = grouped.map((g) => {
      const net = g._sum.purchasedAmount || 0;
      const discounts =
        (g._sum.promoDiscountAmount || 0) +
        (g._sum.earlyBirdDiscountAmount || 0);
      return {
        teacherId: g.teacherId as number,
        teacherName: nameById.get(g.teacherId as number) || 'Unknown teacher',
        gross: net + discounts,
        discounts,
        net,
        enrollments: g._count.id,
      };
    });

    rows.sort((a, b) => b.net - a.net);

    const totals = rows.reduce(
      (acc, r) => ({
        gross: acc.gross + r.gross,
        discounts: acc.discounts + r.discounts,
        net: acc.net + r.net,
        enrollments: acc.enrollments + r.enrollments,
      }),
      { gross: 0, discounts: 0, net: 0, enrollments: 0 },
    );

    return { rows, totals };
  }

  /**
   * Class-enrollment report: per-period new-enrollment counts, a per-class
   * breakdown, and range summary. Optionally scoped to a single teacher.
   * A plan may map to several classes, so byClass counts an enrollment toward
   * each linked class (the series total is the authoritative enrollment count).
   */
  async getEnrollmentReport(query: QueryEnrollmentReportDto) {
    const period = query.period || 'monthly';
    this.guardDailyRange(period, query.startDate, query.endDate);
    const { sqlTrunc, sqlInterval } = this.resolvePeriod(period);

    const startStr = `${query.startDate} 00:00:00`;
    const endStr = `${query.endDate} 23:59:59`;
    const start = new Date(startStr);
    const end = new Date(endStr);

    const teacherSeriesFilter = query.teacherId
      ? Prisma.sql`AND e."teacherId" = ${query.teacherId}`
      : Prisma.empty;
    const teacherWhere = query.teacherId
      ? Prisma.sql`AND e."teacherId" = ${query.teacherId}`
      : Prisma.empty;

    const [series, byClass] = await Promise.all([
      this.db.$queryRaw<Array<{ date: Date; enrollments: bigint }>>`
        WITH date_series AS (
          SELECT generate_series(
            date_trunc(${sqlTrunc}, ${startStr}::timestamp),
            date_trunc(${sqlTrunc}, ${endStr}::timestamp),
            ${Prisma.raw(`'${sqlInterval}'::interval`)}
          ) AS period_date
        )
        SELECT
          ds.period_date AS "date",
          COUNT(e."id") AS "enrollments"
        FROM date_series ds
        LEFT JOIN "ClassEnrollment" e ON
          date_trunc(${sqlTrunc}, e."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Colombo') = ds.period_date
          ${teacherSeriesFilter}
        GROUP BY ds.period_date
        ORDER BY ds.period_date ASC
      `,
      this.db.$queryRaw<
        Array<{ classId: number; className: string; enrollments: bigint }>
      >`
        SELECT
          c."id" AS "classId",
          c."name" AS "className",
          COUNT(DISTINCT e."id") AS "enrollments"
        FROM "ClassEnrollment" e
        JOIN "ClassPricePlanConnection" cpc ON cpc."pricePlanId" = e."classPricePlanId"
        JOIN "Class" c ON c."id" = cpc."classId"
        WHERE e."createdAt" >= ${start} AND e."createdAt" <= ${end}
          ${teacherWhere}
        GROUP BY c."id", c."name"
        ORDER BY "enrollments" DESC
        LIMIT 20
      `,
    ]);

    const [total, uniqueStudents] = await Promise.all([
      this.db.classEnrollment.count({
        where: {
          createdAt: { gte: start, lte: end },
          ...(query.teacherId ? { teacherId: query.teacherId } : {}),
        },
      }),
      this.db.classEnrollment
        .findMany({
          where: {
            createdAt: { gte: start, lte: end },
            ...(query.teacherId ? { teacherId: query.teacherId } : {}),
          },
          select: { studentId: true },
          distinct: ['studentId'],
        })
        .then((r) => r.length),
    ]);

    return {
      series: series.map((row) => ({
        date: row.date,
        enrollments: Number(row.enrollments),
      })),
      byClass: byClass.map((row) => ({
        classId: row.classId,
        className: row.className,
        enrollments: Number(row.enrollments),
      })),
      summary: { total, uniqueStudents },
    };
  }

  async getUserGrowth(query: QueryUserGrowthDto) {
    const period = query.period || 'monthly';
    this.guardDailyRange(period, query.startDate, query.endDate);
    const { sqlTrunc, sqlInterval } = this.resolvePeriod(period);

    const startStr = `${query.startDate} 00:00:00`;
    const endStr = `${query.endDate} 23:59:59`;

    const growth = await this.db.$queryRaw<
      Array<{
        date: Date;
        users: bigint;
        teachers: bigint;
        students: bigint;
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
        COUNT(u."userId") AS "users",
        COUNT(u."userId") FILTER (WHERE u."isTeacher" = true) AS "teachers",
        COUNT(u."userId") FILTER (WHERE u."isStudent" = true) AS "students"
      FROM date_series ds
      LEFT JOIN "User" u ON
        date_trunc(${sqlTrunc}, u."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Colombo') = ds.period_date
      GROUP BY ds.period_date
      ORDER BY ds.period_date ASC
    `;

    // Per-period NEW signups (not cumulative).
    return growth.map((row) => ({
      date: row.date,
      users: Number(row.users),
      teachers: Number(row.teachers),
      students: Number(row.students),
    }));
  }

  async getTopPerformers() {
    const [teacherGroups, planGroups, classes] = await Promise.all([
      // Top teachers by enrollment count + revenue
      this.db.classEnrollment.groupBy({
        by: ['teacherId'],
        _count: { id: true },
        _sum: { purchasedAmount: true },
        where: { teacherId: { not: null } },
        orderBy: { _sum: { purchasedAmount: 'desc' } },
        take: 5,
      }),
      // Top price plans by enrollment count
      this.db.classEnrollment.groupBy({
        by: ['classPricePlanId'],
        _count: { id: true },
        _sum: { purchasedAmount: true },
        orderBy: { _count: { id: 'desc' } },
        take: 5,
      }),
      // Classes with their plans' enrollment counts (to derive top courses)
      this.db.class.findMany({
        select: {
          name: true,
          classPricePlans: {
            select: {
              pricePlan: {
                select: { _count: { select: { classEnrollments: true } } },
              },
            },
          },
        },
      }),
    ]);

    const teacherIds = teacherGroups
      .map((g) => g.teacherId)
      .filter((id): id is number => id !== null);
    const planIds = planGroups.map((g) => g.classPricePlanId);

    const [teachers, plans] = await Promise.all([
      this.db.teacherProfile.findMany({
        where: { teacherId: { in: teacherIds } },
        select: { teacherId: true, user: { select: { name: true } } },
      }),
      this.db.classPricePlan.findMany({
        where: { id: { in: planIds } },
        select: { id: true, name: true },
      }),
    ]);

    const teacherName = new Map(
      teachers.map((t) => [t.teacherId, t.user?.name || 'Unknown']),
    );
    const planName = new Map(plans.map((p) => [p.id, p.name]));

    const topTeachers = teacherGroups.map((g) => ({
      name: g.teacherId ? teacherName.get(g.teacherId) || 'Unknown' : 'Unknown',
      enrollments: g._count.id,
      revenue: g._sum.purchasedAmount || 0,
    }));

    const topPlans = planGroups.map((g) => ({
      name: planName.get(g.classPricePlanId) || 'Unknown',
      enrollments: g._count.id,
      revenue: g._sum.purchasedAmount || 0,
    }));

    const topCourses = classes
      .map((c) => ({
        name: c.name,
        enrollments: c.classPricePlans.reduce(
          (sum, conn) => sum + (conn.pricePlan?._count?.classEnrollments || 0),
          0,
        ),
      }))
      .sort((a, b) => b.enrollments - a.enrollments)
      .slice(0, 5);

    return { topTeachers, topCourses, topPlans };
  }

  async getRecentActivity(query: QueryRecentActivityDto) {
    const limit = query.limit || 15;
    const take = Math.min(limit, 10);

    const [signups, enrollments, accessRequests, planSubmissions] =
      await Promise.all([
        this.db.user.findMany({
          orderBy: { createdAt: 'desc' },
          take,
          select: { name: true, email: true, createdAt: true },
        }),
        this.db.classEnrollment.findMany({
          orderBy: { createdAt: 'desc' },
          take,
          select: {
            createdAt: true,
            purchasedAmount: true,
            student: { select: { user: { select: { name: true } } } },
            classPricePlan: { select: { name: true, slug: true } },
          },
        }),
        this.db.accessRequest.findMany({
          orderBy: { createdAt: 'desc' },
          take,
          select: {
            createdAt: true,
            student: {
              select: { user: { select: { name: true } } },
              // studentId for the access-requests admin page link
            },
            studentId: true,
            classPricePlan: { select: { name: true } },
          },
        }),
        this.db.classPricePlan.findMany({
          orderBy: { createdAt: 'desc' },
          take,
          select: {
            name: true,
            slug: true,
            createdAt: true,
            isAdminApproved: true,
            teacher: { select: { user: { select: { name: true } } } },
          },
        }),
      ]);

    const activity: Array<{
      type: string;
      message: string;
      time: Date;
      link: string | null;
    }> = [];

    signups.forEach((u) =>
      activity.push({
        type: 'signup',
        message: `${u.name || u.email} joined the platform`,
        time: u.createdAt,
        link: null,
      }),
    );

    enrollments.forEach((e) =>
      activity.push({
        type: 'enrollment',
        message: `${e.student?.user?.name || 'A student'} enrolled in "${
          e.classPricePlan?.name || 'a plan'
        }"`,
        time: e.createdAt,
        link: e.classPricePlan?.slug
          ? `/student/plans/view/${e.classPricePlan.slug}`
          : null,
      }),
    );

    accessRequests.forEach((r) =>
      activity.push({
        type: 'access-request',
        message: `${r.student?.user?.name || 'A student'} requested access to "${
          r.classPricePlan?.name || 'a plan'
        }"`,
        time: r.createdAt,
        link: `/admin/user-management/access-requests/${r.studentId}`,
      }),
    );

    planSubmissions.forEach((p) =>
      activity.push({
        type: 'plan-submission',
        message: `${p.teacher?.user?.name || 'A teacher'} submitted plan "${
          p.name
        }" (${p.isAdminApproved})`,
        time: p.createdAt,
        link: '/admin/price-plan-management',
      }),
    );

    return activity
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, limit);
  }

  async getPaymentHealth() {
    const [statusGroups, typeGroups, recentPayments] = await Promise.all([
      this.db.enrollmentPayment.groupBy({
        by: ['paymentStatus'],
        _count: { paymentId: true },
      }),
      this.db.enrollmentPayment.groupBy({
        by: ['paymentType'],
        _count: { paymentId: true },
      }),
      this.db.enrollmentPayment.findMany({
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
}
