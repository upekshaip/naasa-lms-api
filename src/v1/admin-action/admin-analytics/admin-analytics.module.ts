import { Module } from '@nestjs/common';
import { AdminAnalyticsController } from './admin-analytics.controller.js';
import { AdminAnalyticsService } from './services/admin-analytics.service.js';
import { DatabaseModule } from '../../../database/database.module.js';

@Module({
  controllers: [AdminAnalyticsController],
  providers: [AdminAnalyticsService],
  imports: [DatabaseModule],
})
export class AdminAnalyticsModule {}
