import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import { RolesGuard } from '../../guard/roles/roles.guard.js';
import { QueryClassAnalyticsDto } from './dto/query-class-analytics.dto.js';
import type { Request } from 'express';
import { QueryPlanAnalyticsDto } from './dto/query-plan-analytics.dto.js';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('class/:classSlug')
  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  async getClassAnalytics(
    @Req() req: Request,
    @Query() query: QueryClassAnalyticsDto,
    @Param('classSlug') classSlug: string,
  ) {
    return await this.analyticsService.getAnalyticsForClass(
      req,
      classSlug,
      query,
    );
  }

  @Get('price-plan/:planSlug')
  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  async getPlanAnalytics(
    @Req() req: Request,
    @Query() query: QueryPlanAnalyticsDto,
    @Param('planSlug') planSlug: string,
  ) {
    return await this.analyticsService.getAnalyticsForPricePlan(
      req,
      planSlug,
      query,
    );
  }

  @Get('enrollments')
  @UseGuards(new RolesGuard(['isTeacher']))
  async getEnrollmentActivity(@Req() req: Request) {
    return await this.analyticsService.getEnrollmentActivity(req);
  }

  @Get('payments')
  @UseGuards(new RolesGuard(['isTeacher']))
  async getPaymentHealth(@Req() req: Request) {
    return await this.analyticsService.getPaymentHealth(req);
  }

  @Get('promos')
  @UseGuards(new RolesGuard(['isTeacher']))
  async getPromoPerformance(@Req() req: Request) {
    return await this.analyticsService.getPromoPerformance(req);
  }

  @Get('students')
  @UseGuards(new RolesGuard(['isTeacher']))
  async getStudentInsights(@Req() req: Request) {
    return await this.analyticsService.getStudentInsights(req);
  }

  @Get('access-requests')
  @UseGuards(new RolesGuard(['isTeacher']))
  async getAccessRequests(@Req() req: Request) {
    return await this.analyticsService.getAccessRequests(req);
  }

  @Get('content')
  @UseGuards(new RolesGuard(['isTeacher']))
  async getContentMedia(@Req() req: Request) {
    return await this.analyticsService.getContentMedia(req);
  }
}
