import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
} from '@nestjs/common';
import { UserEnrollmentService } from './services/user-enrollment.service.js';
import { UserEnrollmentFilterDto } from './dto/get-user-enrollments.dto.js';
import type { Request } from 'express';

@Controller('user-enrollment')
export class UserEnrollmentController {
  constructor(private readonly userEnrollmentService: UserEnrollmentService) {}

  // getUserEnrollments (as student)
  @Get('users/:userId')
  async getUserEnrollments(
    @Req() req: Request,
    @Param('userId', ParseIntPipe) userId: number,
    @Query() query: UserEnrollmentFilterDto,
  ) {
    return await this.userEnrollmentService.getUserEnrollments(userId, query);
  }
}
