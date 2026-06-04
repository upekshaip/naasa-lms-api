import {
  Controller,
  Get,
  Param,
  Delete,
  Req,
  Query,
  UseGuards,
  ParseIntPipe,
  Post,
  Body,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service.js';
import type { Request } from 'express';
import { QueryNotificationFilterDto } from './dto/query-notification-filter.js';
import { RolesGuard } from '../../guard/roles/roles.guard.js';
import { BroadcastNotificationDto } from './dto/broadcast-notification.js';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @UseGuards(new RolesGuard(['isStudent', 'isTeacher', 'isAdmin']))
  async findAll(
    @Req() req: Request,
    @Query() query: QueryNotificationFilterDto,
  ) {
    return await this.notificationsService.getMyNotifications(req, query);
  }

  @Get('count')
  @UseGuards(new RolesGuard(['isStudent', 'isTeacher', 'isAdmin']))
  async getNotificationCount(@Req() req: Request) {
    return await this.notificationsService.getNotificationCount(req);
  }

  @Post('broadcast')
  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  async broadcastMessage(
    @Req() req: Request,
    @Body() body: BroadcastNotificationDto,
  ) {
    return await this.notificationsService.broadcastMessage(req, body);
  }

  @Delete('clear')
  @UseGuards(new RolesGuard(['isStudent', 'isTeacher', 'isAdmin']))
  async clearAll(@Req() req: Request) {
    return await this.notificationsService.clearAllNotifications(req);
  }

  @Delete(':id')
  @UseGuards(new RolesGuard(['isStudent', 'isTeacher', 'isAdmin']))
  async clearNotification(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return await this.notificationsService.clearNotification(id, req);
  }
}
