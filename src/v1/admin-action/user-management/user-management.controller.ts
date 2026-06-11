import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { UserManagementService } from './services/user-management.service.js';
import { RolesGuard } from '../../../guard/roles/roles.guard.js';
import { UserFilterDto } from './dto/student-filter.dto.js';
import type { Request } from 'express';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UpdateUserPasswordDto } from './dto/update-user-password.dto.js';
import { UpdateTeacherPermissionDto } from './dto/update-teacher-permission.dto.js';
import { UpdateUserRolesDto } from './dto/update-user-roles.dto.js';
import { UpdateUserBlockDto } from './dto/update-user-block.dto.js';
import { ActiveUserFilterDto } from './dto/active-student-filter.dto.js';

@Controller('user-management')
@UseGuards(new RolesGuard(['isAdmin']))
export class UserManagementController {
  constructor(private readonly userManagementService: UserManagementService) {}

  @Get()
  async getAllStudents(@Req() req: Request, @Query() query: UserFilterDto) {
    return await this.userManagementService.getStudents(req, query);
  }

  @Get('users/stats')
  async getStudentStats(@Req() req: Request) {
    return await this.userManagementService.getStudentStats();
  }

  // quick teacher search for admin selectors
  @Get('teachers/search')
  async searchTeachers(@Query('q') q: string) {
    return await this.userManagementService.searchTeachers(q);
  }

  // teacher summary by teacherId (admin inspection hub) — declared after /teachers/search
  @Get('teachers/:teacherId')
  async getTeacherById(@Param('teacherId', ParseIntPipe) teacherId: number) {
    return await this.userManagementService.getTeacherById(teacherId);
  }

  // get all active users (need )
  @Get('users/active')
  async getActiveUsers(
    @Req() req: Request,
    @Query() query: ActiveUserFilterDto,
  ) {
    return await this.userManagementService.getActiveUsers(req, query);
  }

  @Get('users/:userId')
  async getUserDetails(
    @Req() req: Request,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return await this.userManagementService.getUserDetails(userId);
  }

  @Post('users/:userId')
  async updateUserDetails(
    @Req() req: Request,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() updateUser: UpdateUserDto,
  ) {
    return await this.userManagementService.updateUserDetails(
      userId,
      updateUser,
    );
  }

  @Post('users/:userId/update-password')
  async updatePassword(
    @Req() req: Request,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() password: UpdateUserPasswordDto,
  ) {
    return await this.userManagementService.changeUserPassword(
      userId,
      password,
    );
  }

  @Patch('users/:userId/expire-password')
  async expirePassword(
    @Req() req: Request,
    @Param('userId', ParseIntPipe) userId: number,
  ) {
    return await this.userManagementService.expireUserPassword(userId);
  }

  @Post('users/:userId/block-user')
  async blockUser(
    @Req() req: Request,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() userBlock: UpdateUserBlockDto,
  ) {
    return await this.userManagementService.blockUnblockUser(userId, userBlock);
  }

  @Post('users/:userId/change-role')
  async changeUserRole(
    @Req() req: Request,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() role: UpdateUserRolesDto,
  ) {
    return await this.userManagementService.changeUserRoles(userId, role);
  }

  @Post('users/:userId/teacher-permissions')
  async setTeacherPermissions(
    @Req() req: Request,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() permissions: UpdateTeacherPermissionDto,
  ) {
    return await this.userManagementService.setTeacherPermissions(
      userId,
      permissions,
    );
  }
}
