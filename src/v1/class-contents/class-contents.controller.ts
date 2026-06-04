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
} from '@nestjs/common';
import { ClassContentsService } from './services/class-contents.service.js';
import { RolesGuard } from '../../guard/roles/roles.guard.js';
import { UpdateClassContentsDto } from './dto/update-class-content.dto.js';
import type { Request } from 'express';

@Controller('class-contents')
export class ClassContentsController {
  constructor(private readonly classContentsService: ClassContentsService) {}

  @Get(':slug')
  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  async findOne(@Req() req: Request, @Param('slug') slug: string) {
    return await this.classContentsService.getClassContent(req, slug);
  }

  @Patch(':slug')
  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  async update(
    @Param('slug') slug: string,
    @Req() req: Request,
    @Body() updateClassContentsDto: UpdateClassContentsDto,
  ) {
    return await this.classContentsService.updateContents(
      slug,
      updateClassContentsDto,
      req,
    );
  }
}
