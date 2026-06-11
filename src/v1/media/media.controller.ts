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
  Res,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { MediaFolderService } from './services/media-folder.service.js';
import { RolesGuard } from '../../guard/roles/roles.guard.js';
import type { Request, Response } from 'express';
import { CreateFolderDto } from './dto/create-folder.dto.js';
import { GetContentQueryDto } from './dto/query-teacher-content.js';
import { RenameFolderDto } from './dto/rename-folder.dto.js';
import { MoveFolderDto } from './dto/move-folder.dto.js';
import { MediaFileService } from './services/media-file.service.js';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('media')
export class MediaController {
  constructor(
    private readonly mediaFolderService: MediaFolderService,
    private readonly mediaFileService: MediaFileService,
  ) {}

  // ------------- FOLDER MANAGEMENT ENDPOINTS ------------- //

  @Get('teacher-content')
  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  async getTeacherContent(
    @Req() req: Request,
    @Query() query: GetContentQueryDto,
  ) {
    return await this.mediaFolderService.getTeacherContent(req, query);
  }

  @Post('folders/create')
  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  async createFolder(
    @Req() req: Request,
    @Body() createFolderDto: CreateFolderDto,
    @Query('teacherId') teacherId?: string,
  ) {
    return await this.mediaFolderService.createFolder(
      req,
      createFolderDto,
      teacherId,
    );
  }

  @Patch('folders/:id/rename')
  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  async renameFolder(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() renameFolderDto: RenameFolderDto,
    @Query('teacherId') teacherId?: string,
  ) {
    return await this.mediaFolderService.renameFolder(
      req,
      id,
      renameFolderDto,
      teacherId,
    );
  }

  @Patch('folders/:id/move')
  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  async moveFolder(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Body() moveFolderDto: MoveFolderDto,
    @Query('teacherId') teacherId?: string,
  ) {
    return await this.mediaFolderService.moveFolder(
      req,
      id,
      moveFolderDto,
      teacherId,
    );
  }

  @Delete('folders/:id')
  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  async deleteFolder(
    @Req() req: Request,
    @Param('id', ParseIntPipe) id: number,
    @Query('teacherId') teacherId?: string,
  ) {
    return await this.mediaFolderService.deleteFolder(req, id, teacherId);
  }

  // ------------- FILE ACCESS ENDPOINTS ------------- //
  // RAW
  @Get('raw/:fileId')
  @UseGuards(new RolesGuard(['isStudent', 'isTeacher', 'isAdmin']))
  async sendRawFile(
    @Req() req: Request,
    @Param('fileId') fileId: string,
    @Res() res: Response,
  ) {
    return await this.mediaFileService.getRawFile(fileId, req, res);
  }

  @Post('files/upload')
  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  @UseInterceptors(FileInterceptor('file')) // Uses memory storage by default, which is perfect for streaming to R2
  async uploadFile(
    @Req() req: Request,
    @UploadedFile() file: Express.Multer.File,
    @Body('folderId') folderId?: string,
    @Query('teacherId') teacherId?: string,
  ) {
    const parsedFolderId = folderId ? parseInt(folderId, 10) : undefined;
    return await this.mediaFileService.uploadLessonFile(
      req,
      file,
      parsedFolderId,
      teacherId,
    );
  }

  @Patch('files/:fileId/rename')
  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  async renameFile(
    @Req() req: Request,
    @Param('fileId') fileId: string,
    @Body('newName') newName: string,
    @Query('teacherId') teacherId?: string,
  ) {
    return await this.mediaFileService.renameFile(
      req,
      fileId,
      newName,
      teacherId,
    );
  }

  @Patch('files/:fileId/move')
  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  async moveFile(
    @Req() req: Request,
    @Param('fileId') fileId: string,
    @Body() moveDto: MoveFolderDto, // Reusing the same DTO since it just validates { parentId }
    @Query('teacherId') teacherId?: string,
  ) {
    return await this.mediaFileService.moveFile(
      req,
      fileId,
      moveDto.parentId,
      teacherId,
    );
  }

  @Delete('files/:fileId')
  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  async deleteFile(
    @Req() req: Request,
    @Param('fileId') fileId: string,
    @Query('teacherId') teacherId?: string,
  ) {
    return await this.mediaFileService.deleteFile(req, fileId, teacherId);
  }

  // ------------- RECEIPT FILE ENDPOINTS ------------- //
}
