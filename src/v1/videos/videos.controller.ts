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
  Res,
} from '@nestjs/common';
import { VideosService } from './services/videos.service.js';
import { CreateVideoDto } from './dto/create-video.dto.js';
import { UpdateStatusDto } from './dto/update-status.dto.js';
import { RolesGuard } from '../../guard/roles/roles.guard.js';
import type { Request, Response } from 'express';
import { RenameVideoDto } from './dto/rename-video.dto.js';
import { QueryVideoDto } from './dto/query-video.dto.js';
import { VideoKeyService } from './services/vide-key.service.js';

@Controller('videos')
export class VideosController {
  constructor(
    private readonly videosService: VideosService,
    private readonly videoKeyService: VideoKeyService,
  ) {}

  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  @Post('create')
  createVideo(@Body() createVideoDto: CreateVideoDto, @Req() req: Request) {
    return this.videosService.createVideo(req, createVideoDto);
  }

  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  @Post('status')
  updateVideoStatus(@Body() statusDto: UpdateStatusDto, @Req() req: Request) {
    return this.videosService.updateVideoStatus(req, statusDto);
  }

  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  @Patch(':videoId/rename')
  renameVideo(
    @Body() renameVideoDto: RenameVideoDto,
    @Req() req: Request,
    @Param('videoId') videoId: string,
  ) {
    return this.videosService.renameVideo(req, videoId, renameVideoDto);
  }

  // get all videos
  @Get('all')
  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  async getTeacherVideos(@Req() req: Request, @Query() query: QueryVideoDto) {
    return await this.videosService.getVideos(req, query);
  }

  @Get('key/:videoId')
  async getVideoKey(
    @Param('videoId') videoId: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    res.set(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate',
    );
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');

    delete req.headers['if-none-match'];
    return await this.videoKeyService.findVideoKey(videoId, req, res);
  }

  @Delete(':videoId')
  @UseGuards(new RolesGuard(['isTeacher', 'isAdmin']))
  async deleteVideo(@Param('videoId') videoId: string, @Req() req: Request) {
    return await this.videosService.deleteVideo(videoId, req);
  }
}
