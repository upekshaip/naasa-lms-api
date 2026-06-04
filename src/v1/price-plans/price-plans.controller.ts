import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  UseGuards,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { PricePlansService } from './services/price-plans.service.js';
import { CreatePricePlanDto } from './dto/create-price-plan.js';
import { UpdatePricePlanDto } from './dto/update-price-plan.js';
import type { Request } from 'express';
import { RolesGuard } from '../../guard/roles/roles.guard.js';
import { FilterPricePlansService } from './services/filter-price-plans.service.js';
import { QueryTeacherPricePlansDto } from './dto/query-teacher-price-plans.dto.js';
import { StudentPricePlansServices } from './services/student-price-plans.service.js';
import { QueryStudentPlansFilterDto } from './dto/query-student-plans-filter.js';

@Controller('price-plans')
export class PricePlansController {
  constructor(
    private readonly pricePlansService: PricePlansService,
    private readonly filterPricePlansService: FilterPricePlansService,
    private readonly studentPricePlansService: StudentPricePlansServices,
  ) {}

  @Post()
  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  async create(
    @Body() createPricePlanDto: CreatePricePlanDto,
    @Req() req: Request,
  ) {
    return await this.pricePlansService.createPricePlan(
      createPricePlanDto,
      req,
    );
  }

  // @Get()
  // @UseGuards(new RolesGuard(['isTeacher', 'isAdmin', 'isStudent']))
  // async findAll(@Query() query: GetAllPricePlanDto) {
  //   return await this.pricePlansService.findAll(query);
  // }

  // teacher
  @Get('all')
  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  async getAllPricePlansforTeacher(@Req() req: Request) {
    return await this.filterPricePlansService.getAllPricePlansforTeacher(req);
  }

  @Get('all/:teacherId')
  @UseGuards(new RolesGuard(['isAdmin']))
  async getAllPricePlansforAdmin(
    @Req() req: Request,
    @Param('teacherId', ParseIntPipe) teacherId: number,
  ) {
    return await this.filterPricePlansService.getAllPricePlansforAdmin(
      req,
      teacherId,
    );
  }

  // student
  @Get('available')
  @UseGuards(new RolesGuard(['isStudent', 'isTeacher', 'isAdmin']))
  async getAllAvailablePricePlans(
    @Req() req: Request,
    @Query() query: QueryStudentPlansFilterDto,
  ) {
    return await this.studentPricePlansService.getAllAvailablePricePlans(
      req,
      query,
    );
  }

  // student
  @Get('p/:planSlug')
  @UseGuards(new RolesGuard(['isStudent', 'isTeacher', 'isAdmin']))
  async getPricePlanBySlug(
    @Req() req: Request,
    @Param('planSlug') planSlug: string,
  ) {
    return await this.studentPricePlansService.getPricePlanBySlug(
      req,
      planSlug,
    );
  }

  @Get(':slug')
  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin', 'isStudent']))
  async findOne(@Param('slug') slug: string) {
    return await this.pricePlansService.findOne(slug);
  }

  @Patch(':slug')
  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  async update(
    @Param('slug') slug: string,
    @Body() updatePricePlanDto: UpdatePricePlanDto,
    @Req() req: Request,
  ) {
    return await this.pricePlansService.updatePricePlan(
      slug,
      updatePricePlanDto,
      req,
    );
  }

  @Delete(':slug')
  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  async remove(@Param('slug') slug: string, @Req() req: Request) {
    return await this.pricePlansService.remove(slug, req);
  }

  // get all price plans taught by a specific teacher (For admins as well as students)
  @Get('teacher/:teacherId')
  @UseGuards(new RolesGuard(['isStudent', 'isTeacher', 'isAdmin']))
  async findPricePlansByTeacher(
    @Param('teacherId', ParseIntPipe) teacherId: number,
    @Query() query: QueryTeacherPricePlansDto,
    @Req() req: Request,
  ) {
    return await this.filterPricePlansService.findPricePlansByTeacher(
      req,
      teacherId,
      query,
    );
  }

  // get all approved price plans taught by a specific teacher (classSlug optional - to filter plans linked to that class)
  @Get('teacher/:teacherId/approved')
  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  async findApprovedPricePlansByTeacher(
    @Param('teacherId', ParseIntPipe) teacherId: number,
    @Query('classSlug') classSlug: string,
    @Req() req: Request,
  ) {
    return await this.filterPricePlansService.findApprovedPricePlansByTeacher(
      req,
      teacherId,
      classSlug,
    );
  }

  // TODO: get all classes learned by a specific student
}
