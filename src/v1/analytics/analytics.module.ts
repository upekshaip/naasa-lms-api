import { Module } from '@nestjs/common';
import { AnalyticsService } from './analytics.service.js';
import { AnalyticsController } from './analytics.controller.js';
import { DatabaseModule } from '../../database/database.module.js';

@Module({
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  imports: [DatabaseModule],
})
export class AnalyticsModule {}
