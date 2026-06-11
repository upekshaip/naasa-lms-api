import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AdminAnalyticsService } from './services/admin-analytics.service.js';
import { RolesGuard } from '../../../guard/roles/roles.guard.js';
import {
  QueryEnrollmentReportDto,
  QueryFinanceByTeacherDto,
  QueryRecentActivityDto,
  QueryRevenueAnalyticsDto,
  QueryUserGrowthDto,
} from './dto/query-admin-analytics.dto.js';

@Controller('admin/analytics')
@UseGuards(new RolesGuard(['isAdmin']))
export class AdminAnalyticsController {
  constructor(private readonly adminAnalyticsService: AdminAnalyticsService) {}

  @Get('overview')
  async getOverview() {
    return await this.adminAnalyticsService.getOverview();
  }

  @Get('revenue')
  async getRevenue(@Query() query: QueryRevenueAnalyticsDto) {
    return await this.adminAnalyticsService.getRevenue(query);
  }

  @Get('user-growth')
  async getUserGrowth(@Query() query: QueryUserGrowthDto) {
    return await this.adminAnalyticsService.getUserGrowth(query);
  }

  @Get('finance-by-teacher')
  async getFinanceByTeacher(@Query() query: QueryFinanceByTeacherDto) {
    return await this.adminAnalyticsService.getFinanceByTeacher(query);
  }

  @Get('enrollments')
  async getEnrollmentReport(@Query() query: QueryEnrollmentReportDto) {
    return await this.adminAnalyticsService.getEnrollmentReport(query);
  }

  @Get('top-performers')
  async getTopPerformers() {
    return await this.adminAnalyticsService.getTopPerformers();
  }

  @Get('recent-activity')
  async getRecentActivity(@Query() query: QueryRecentActivityDto) {
    return await this.adminAnalyticsService.getRecentActivity(query);
  }

  @Get('payments')
  async getPaymentHealth() {
    return await this.adminAnalyticsService.getPaymentHealth();
  }
}
