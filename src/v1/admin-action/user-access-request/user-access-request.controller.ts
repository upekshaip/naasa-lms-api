import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserAccessRequestService } from './services/user-access-request.service.js';
import { RolesGuard } from '../../../guard/roles/roles.guard.js';
import { QueryGetStudentRequestsDto } from './dto/query-get-student-requests.js';
import { TeacherResponseDto } from '../../access-request/dto/teacher-response.js';
import { AccessRequestService } from '../../access-request/services/access-request.service.js';
import type { Request } from 'express';

@Controller('user-access-request')
export class UserAccessRequestController {
  constructor(
    private readonly userAccessRequestService: UserAccessRequestService,
    private readonly accessRequestService: AccessRequestService,
  ) {}

  @Get('student/:studentId')
  @UseGuards(new RolesGuard(['isAdmin']))
  async getStudentRequests(
    @Req() req: Request,
    @Param('studentId', ParseIntPipe) studentId: number,
    @Query() query: QueryGetStudentRequestsDto,
  ) {
    return await this.userAccessRequestService.getAllStudentAccessRequests(
      studentId,
      query,
    );
  }

  @Post('response')
  @UseGuards(new RolesGuard(['isAdmin']))
  async sendResponse(
    @Req() req: Request,
    @Body() teacherResponse: TeacherResponseDto,
  ) {
    return await this.accessRequestService.sendResponseAsAdmin(
      req,
      teacherResponse,
    );
  }
}
