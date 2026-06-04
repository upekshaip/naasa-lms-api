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
} from '@nestjs/common';
import { ClassPlanLinkService } from './services/class-plan-link.service.js';
import { CreateClassPlanLinkDto } from './dto/create-class-plan-link.js';
import { RolesGuard } from '../../guard/roles/roles.guard.js';
import type { Request } from 'express';

@Controller('class-plan-connection')
export class ClassPlanLinkController {
  constructor(private readonly classPlanLinkService: ClassPlanLinkService) {}

  @Post()
  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  create(
    @Body() createClassPlanLinkDto: CreateClassPlanLinkDto,
    @Req() req: Request,
  ) {
    return this.classPlanLinkService.linkClassToMultiplePricePlans(
      createClassPlanLinkDto.classSlug,
      createClassPlanLinkDto.pricePlanSlugs,
      req,
    );
  }

  @Get()
  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  get(@Req() req: Request) {
    return this.classPlanLinkService.getAllClassPricePlanConnections(req);
  }

  @Get('map')
  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  getMap(@Req() req: Request) {
    return this.classPlanLinkService.getMapByTeacher(req);
  }
}
