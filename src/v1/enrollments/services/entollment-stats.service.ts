import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { Request } from 'express';
import { QueryStatDto } from '../dto/query-stat.dto.js';

@Injectable()
export class EnrollmentStatsService {
  constructor(private readonly db: DatabaseService) {}

  async getEnrollmentStats(req: Request, query: QueryStatDto) {
    const daysToFetch = query.period === 'month' ? 60 : 14;
    const halfPeriod = daysToFetch / 2;

    const now = new Date();
    const startDate = new Date(
      now.getTime() - daysToFetch * 24 * 60 * 60 * 1000,
    );
    const halfPeriodStart = new Date(
      now.getTime() - halfPeriod * 24 * 60 * 60 * 1000,
    );
    const targetExpireDate = new Date(
      now.toLocaleString('en-US', { timeZone: 'Asia/Colombo' }),
    );
    targetExpireDate.setDate(targetExpireDate.getDate() + 3);
    targetExpireDate.setHours(23, 59, 59, 999);

    const [
      enrollments,
      allEnrollmentCount,
      allEnrollmentRevenue,
      activeEnrollmentCount,
      expiresSoonCount,
      paidEnrollmentCount, // Added this
    ] = await Promise.all([
      this.db.classEnrollment.findMany({
        where: {
          teacherId: req.teacherId,
          createdAt: { gte: startDate },
          payment: {
            paymentStatus: 'completed',
          },
        },
        select: {
          createdAt: true,
          purchasedAmount: true,
        },
      }),

      // all enrollments
      this.db.classEnrollment.count({
        where: {
          teacherId: req.teacherId,
          payment: {
            paymentStatus: 'completed',
          },
        },
      }),

      // all sum of enrollments
      this.db.classEnrollment.aggregate({
        _sum: { purchasedAmount: true },
        where: {
          teacherId: req.teacherId,
          payment: {
            paymentStatus: 'completed',
          },
        },
      }),

      // active enrollments
      this.db.classEnrollment.count({
        where: {
          teacherId: req.teacherId,
          expiresAt: {
            gt: now,
          },
          payment: {
            paymentStatus: 'completed',
          },
        },
      }),

      // Replace the old expires soon count with this one
      this.db.classEnrollment.count({
        where: {
          teacherId: req.teacherId,
          expiresAt: {
            gt: now,
            lte: targetExpireDate, // Uses the true end-of-day boundary
          },
          payment: {
            paymentStatus: 'completed',
          },
        },
      }),

      // Add this NEW query to the Promise.all array to count only paid enrollments
      this.db.classEnrollment.count({
        where: {
          teacherId: req.teacherId,
          purchasedAmount: { gt: 0 }, // Ignores free access and 100% promos
          payment: {
            paymentStatus: 'completed',
          },
        },
      }),
    ]);

    // ---------- SECURE SL DATE HELPER ----------
    const getSLDateString = (date: Date) => {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Colombo',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const parts = formatter.formatToParts(date);
      const year = parts.find((p) => p.type === 'year')?.value;
      const month = parts.find((p) => p.type === 'month')?.value;
      const day = parts.find((p) => p.type === 'day')?.value;
      return `${year}-${month}-${day}`; // Always YYYY-MM-DD in Sri Lanka time
    };

    const todayStr = getSLDateString(now);
    const yesterdayDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = getSLDateString(yesterdayDate);

    // ---------- AGGREGATION STRUCTURES ----------
    const dailyEnrollmentMap = new Map<string, number>();
    const dailyRevenueMap = new Map<string, number>();

    let todayCount = 0;
    let yesterdayCount = 0;
    let todayRevenue = 0;
    let yesterdayRevenue = 0;

    let latestCount = 0;
    let previousCount = 0;

    let latestRevenue = 0;
    let previousRevenue = 0;

    // ---------- SINGLE PASS LOOP ----------
    for (const enrollment of enrollments) {
      const dateKey = getSLDateString(enrollment.createdAt);
      const isLatest = enrollment.createdAt >= halfPeriodStart;

      // Daily aggregation (only latest period)
      if (isLatest) {
        dailyEnrollmentMap.set(
          dateKey,
          (dailyEnrollmentMap.get(dateKey) || 0) + 1,
        );

        dailyRevenueMap.set(
          dateKey,
          (dailyRevenueMap.get(dateKey) || 0) + enrollment.purchasedAmount,
        );

        latestCount++;
        latestRevenue += enrollment.purchasedAmount;
      } else {
        previousCount++;
        previousRevenue += enrollment.purchasedAmount;
      }

      // Today
      if (dateKey === todayStr) {
        todayCount++;
        todayRevenue += enrollment.purchasedAmount;
      }

      // Yesterday
      if (dateKey === yesterdayStr) {
        yesterdayCount++;
        yesterdayRevenue += enrollment.purchasedAmount;
      }
    }

    // ---------- FILL MISSING DAYS ----------
    const everyDayCount: { date: string; enrollments: number }[] = [];
    const revenueEveryDayCount: { date: string; revenue: number }[] = [];

    // Iterate backwards to build the chart data, generating SL strings securely
    for (let i = halfPeriod - 1; i >= 0; i--) {
      const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateKey = getSLDateString(day);

      everyDayCount.push({
        date: dateKey,
        enrollments: dailyEnrollmentMap.get(dateKey) || 0,
      });

      revenueEveryDayCount.push({
        date: dateKey,
        revenue: dailyRevenueMap.get(dateKey) || 0,
      });
    }

    // ---------- PERCENTAGE CHANGE ----------
    const calculatePercentage = (latest: number, previous: number) => {
      if (previous === 0) {
        if (latest === 0) return 0;
        return 100;
      }
      return Number((((latest - previous) / previous) * 100).toFixed(1));
    };

    const enrollmentChangePercentage = calculatePercentage(
      latestCount,
      previousCount,
    );

    const revenueChangePercentage = calculatePercentage(
      latestRevenue,
      previousRevenue,
    );

    return {
      enrollmentStats: {
        today: todayCount,
        yesterday: yesterdayCount,
        previousPeriod: previousCount,
        latestPeriod: latestCount,
        changePercentage: enrollmentChangePercentage,
        everyDayCount,
        period: query.period,
      },
      revenueStats: {
        today: todayRevenue,
        yesterday: yesterdayRevenue,
        previousPeriod: previousRevenue,
        latestPeriod: latestRevenue,
        changePercentage: revenueChangePercentage,
        everyDayCount: revenueEveryDayCount,
        period: query.period,
      },
      overallStats: {
        totalEnrollments: allEnrollmentCount,
        activeEnrollments: activeEnrollmentCount,
        expiresSoonEnrollments: expiresSoonCount,
        avgPricePerEnrollment: paidEnrollmentCount
          ? Number(
              (
                (allEnrollmentRevenue._sum.purchasedAmount || 0) /
                paidEnrollmentCount
              ) // Divided by paid enrollments only
                .toFixed(2),
            )
          : 0,
      },
    };
  }
}
