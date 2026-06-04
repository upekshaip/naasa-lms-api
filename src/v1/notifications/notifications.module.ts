import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import { NotificationsController } from './notifications.controller.js';
import { DatabaseModule } from '../../database/database.module.js';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  imports: [DatabaseModule],
})
export class NotificationsModule {}
