import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.js';
import { UpdateUserDto } from './dto/update-user.js';
import { ChangePasswordDto } from '../auth/dto/change-password.js';
import { RolesGuard } from '../../guard/roles/roles.guard.js';
import { UserIdentifyGuard } from '../../guard/user-identify/user-identify.guard.js';
import type { Request } from 'express';

@Controller('users')
@UseGuards(new RolesGuard(['isStudent', 'isTeacher', 'isAdmin']))
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // @Post()
  // @UseGuards(new RolesGuard(['isAdmin']))
  // async create(@Body() createUserDto: CreateUserDto) {
  //   return await this.usersService.create(createUserDto);
  // }

  // @Get()
  // @UseGuards(new RolesGuard(['isAdmin']))
  // async findAll() {
  //   return await this.usersService.findAll();
  // }

  @Get('me')
  @UseGuards(new RolesGuard(['isStudent', 'isTeacher', 'isAdmin']))
  async findOne(@Req() req: Request) {
    return await this.usersService.getMyDetails(req);
  }

  @Delete(':userId')
  @UseGuards(UserIdentifyGuard)
  async remove(@Param('userId', ParseIntPipe) userId: number) {
    return await this.usersService.remove(userId);
  }
}
