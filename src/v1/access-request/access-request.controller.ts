import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Req,
  Query,
} from '@nestjs/common';
import { AccessRequestService } from './services/access-request.service.js';
import { RolesGuard } from '../../guard/roles/roles.guard.js';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { StudentAccessRequestDto } from './dto/student-access-request.js';
import type { Request } from 'express';
import { TeacherResponseDto } from './dto/teacher-response.js';
import { QueryFilterRequestsDto } from './dto/query-filter-requests.js';
import { CheckPromoDto } from './dto/check-promo.js';

// Reusable Multer options to keep decorators clean
const multerOptions = {
  storage: memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
};
@Controller('access-request')
export class AccessRequestController {
  constructor(private readonly accessRequestService: AccessRequestService) {}

  @Post('upload-receipt/:planSlug')
  @UseGuards(new RolesGuard(['isStudent']))
  @UseInterceptors(FileInterceptor('file', multerOptions))
  async uploadRequestReceipt(
    @Req() req: Request,
    @Param('planSlug') planSlug: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() studentAccessReq: StudentAccessRequestDto,
  ) {
    return await this.accessRequestService.uploadRequestReceipt(
      req,
      planSlug,
      file,
      studentAccessReq,
    );
  }
  @Post('promo/:planSlug')
  @UseGuards(new RolesGuard(['isStudent']))
  async checkPromo(
    @Req() req: Request,
    @Param('planSlug') planSlug: string,
    @Body() promo: CheckPromoDto,
  ) {
    return await this.accessRequestService.checkPromo(req, planSlug, promo);
  }

  @Get('teacher/requests')
  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  async getTeacherRequests(
    @Req() req: Request,
    @Query() query: QueryFilterRequestsDto,
  ) {
    return await this.accessRequestService.getTeacherRequests(req, query);
  }

  @Post('response')
  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  async sendResponse(
    @Req() req: Request,
    @Body() teacherResponse: TeacherResponseDto,
  ) {
    return await this.accessRequestService.sendResponseAsTeacher(
      req,
      teacherResponse,
    );
  }
}
