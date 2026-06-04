import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Req,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { EnrollmentsService } from './services/enrollments.service.js';
import { RolesGuard } from '../../guard/roles/roles.guard.js';
import type { Request } from 'express';
import { CreateEnrollmentsArrayDto } from './dto/create-enrollments-array.dto.js';
import { EnrollmentStatsService } from './services/entollment-stats.service.js';
import { QueryStatDto } from './dto/query-stat.dto.js';
import { FilterEnrollmentsService } from './services/filter-enrollments.service.js';
import { QueryTeacherEnrollmentsDto } from './dto/query-teacher-enrollments.dto.js';
import { StudentEnrollmentsService } from './services/student-enrollments.service.js';
import { QueryStudentEnrollmentsDto } from './dto/query-student-enrollments.dto.js';

@Controller('enrollments')
export class EnrollmentsController {
  constructor(
    private readonly enrollmentsService: EnrollmentsService,
    private readonly enrollmentStatsService: EnrollmentStatsService,
    private readonly filterEnrollmentsService: FilterEnrollmentsService,
    private readonly studentEnrollmentsService: StudentEnrollmentsService,
  ) {}

  // for student
  @Get('my')
  @UseGuards(new RolesGuard(['isStudent']))
  async getAllStudentEnrollments(
    @Req() req: Request,
    @Query() query: QueryStudentEnrollmentsDto,
  ) {
    return await this.studentEnrollmentsService.getAllStudentEnrollments(
      req,
      query,
    );
  }

  // create enrollments
  @Post(':studentId')
  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  async create(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Body() createEnrollmentsArrayDto: CreateEnrollmentsArrayDto,
    @Req() req: Request,
  ) {
    return await this.enrollmentsService.makeEnrollments(
      createEnrollmentsArrayDto,
      studentId,
      req,
    );
  }

  @Get('details/:enrollmentId')
  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  async getEnrollmentDetails(
    @Param('enrollmentId', ParseIntPipe) enrollmentId: number,
    @Req() req: Request,
  ) {
    return await this.filterEnrollmentsService.getEnrollmentDetails(
      enrollmentId,
      req,
    );
  }

  @Get('student/:studentId')
  @UseGuards(new RolesGuard(['isStudent', 'isTeacher', 'isAdmin']))
  async getStudentDetailsForTeacher(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Req() req: Request,
  ) {
    return await this.filterEnrollmentsService.getStudentDetailsForTeacher(
      studentId,
      req,
    );
  }

  @Get('stats')
  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  async getEnrollmentStats(@Req() req: Request, @Query() query: QueryStatDto) {
    return await this.enrollmentStatsService.getEnrollmentStats(req, query);
  }

  // mainly teachers (only for their students) / can use students and admins some cases
  @Get(':studentId')
  @UseGuards(new RolesGuard(['isStudent', 'isTeacher', 'isAdmin']))
  async getStudentEnrollments(
    @Param('studentId', ParseIntPipe) studentId: number,
    @Req() req: Request,
  ) {
    return await this.enrollmentsService.getStudentEnrollments(studentId, req);
  }

  // get all enrollments for all students of the teacher
  @Get('teacher/:teacherId')
  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  async getAllEnrollmentsforTeacher(
    @Req() req: Request,
    @Param('teacherId', ParseIntPipe) teacherId: number,
    @Query() query: QueryTeacherEnrollmentsDto,
  ) {
    return await this.filterEnrollmentsService.getAllEnrollmentsforTeacher(
      req,
      teacherId,
      query,
    );
  }
}
