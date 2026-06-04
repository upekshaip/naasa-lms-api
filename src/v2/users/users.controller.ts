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
import { ChangeRole } from './services/changeRole.service.js';
import { ChangeRoleDto } from './dto/change-role.js';
import { RolesGuard } from '../../guard/roles/roles.guard.js';
import type { Request } from 'express';

@Controller('v2/users')
export class UsersController {
  constructor(private readonly userRolesService: ChangeRole) {}

  @Post('change-role')
  // @UseGuards(new RolesGuard(['isAdmin']))
  async changeRole(@Body() changeRole: ChangeRoleDto, @Req() req: Request) {
    return await this.userRolesService.changeRole(changeRole, req);
  }

  @Get('test')
  test(@Req() req: Request) {
    return this.userRolesService.test(req);
  }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.usersService.findOne(+id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
  //   return this.usersService.update(+id, updateUserDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.usersService.remove(+id);
  // }
}
