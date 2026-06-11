import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { ClassesService } from './services/classes.service.js';
import { TeacherCreateClassDto } from './dto/create-class.dto.js';
import { TeacherUpdateClassDto } from './dto/update-class.dto.js';
import { RolesGuard } from '../../guard/roles/roles.guard.js';
import type { Request } from 'express';
import { QueryTeacherClassesDto } from './dto/query-teacher-classes.dto.js';
import { FilterClassesService } from './services/filter-classes.service.js';
import { StudentClassesService } from './services/student-classes.service.js';
import { QueryStudentFilterDto } from './dto/query-student-filter.dto.js';
import { QueryStudentCourseFilterDto } from './dto/query-student-course-filter.dto.js';
import { QueryAdminClassesDto } from './dto/query-admin-classes.dto.js';

@Controller('classes')
export class ClassesController {
  constructor(
    private readonly classesService: ClassesService,
    private readonly filterClassesService: FilterClassesService,
    private readonly studentClassService: StudentClassesService,
  ) {}

  @Post()
  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  async create(
    @Body() createClassDto: TeacherCreateClassDto,
    @Req() req: Request,
  ) {
    return await this.classesService.createClass(createClassDto, req);
  }

  @Get()
  @UseGuards(new RolesGuard(['isStudent', 'isTeacher', 'isAdmin']))
  async findAll() {
    return await this.classesService.findAll();
  }

  // get all classes learned by a specific student
  @Get('my')
  @UseGuards(new RolesGuard(['isStudent']))
  async findEnrolledClassesByStudent(
    @Req() req: Request,
    @Query() query: QueryStudentFilterDto,
  ) {
    return await this.studentClassService.findEnrolledClassesByStudent(
      req,
      query,
    );
  }

  // teacher
  @Get('all')
  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  async getAllClassesforTeacher(@Req() req: Request) {
    return await this.filterClassesService.getAllClassesforTeacher(req);
  }

  // admin: paginated list of all classes across teachers (with stats)
  @Get('admin/all')
  @UseGuards(new RolesGuard(['isAdmin']))
  async getAllClassesForAdmin(
    @Req() req: Request,
    @Query() query: QueryAdminClassesDto,
  ) {
    return await this.filterClassesService.getAllClassesForAdmin(req, query);
  }

  // student
  @Get('available')
  @UseGuards(new RolesGuard(['isStudent']))
  async getAllClasses(
    @Req() req: Request,
    @Query() query: QueryStudentCourseFilterDto,
  ) {
    return await this.studentClassService.getAllAvailableClassesGroupedByTeacher(
      req,
      query,
    );
  }

  @Get('c/:slug')
  @UseGuards(new RolesGuard(['isStudent']))
  async getStudentCourse(@Req() req: Request, @Param('slug') slug: string) {
    return await this.studentClassService.getStudentCourse(req, slug);
  }

  @Get(':slug')
  @UseGuards(new RolesGuard(['isStudent', 'isTeacher', 'isAdmin']))
  findOne(@Param('slug') slug: string) {
    return this.classesService.findOne(slug);
  }

  @Patch(':slug')
  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  async update(
    @Param('slug') slug: string,
    @Body() updateClassDto: TeacherUpdateClassDto,
    @Req() req: Request,
  ) {
    return await this.classesService.updateClass(slug, updateClassDto, req);
  }

  @Delete(':slug')
  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  async remove(@Param('slug') slug: string, @Req() req: Request) {
    return await this.classesService.removeClass(slug, req);
  }

  // get all classes teaught by a specific teacher (For admins as well as students)
  @Get('teacher/:teacherId')
  @UseGuards(new RolesGuard(['isStudent', 'isTeacher', 'isAdmin']))
  async findClassesByTeacher(
    @Param('teacherId', ParseIntPipe) teacherId: number,
    @Query() query: QueryTeacherClassesDto,
    @Req() req: Request,
  ) {
    return await this.filterClassesService.findClassesByTeacher(
      req,
      teacherId,
      query,
    );
  }
}
