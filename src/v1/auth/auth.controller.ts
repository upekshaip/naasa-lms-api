import {
  Controller,
  Post,
  Body,
  HttpCode,
  Res,
  Patch,
  Req,
  UseGuards,
  ParseIntPipe,
  Param,
  Get,
} from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { SignupDto } from './dto/signup.js';
import { LoginDto } from './dto/login.js';
import type { Response } from 'express';
import type { Request } from 'express';
import { SignupUpdateDto } from './dto/signup-update.js';
import { RefreshUserDto } from './dto/refresh-token.js';
import { UpdateUserDto } from './dto/update-user.js';
import { RolesGuard } from '../../guard/roles/roles.guard.js';
import { ChangePasswordDto } from './dto/change-password.js';
import { ResetPasswordDto } from './dto/reset-password.js';
import { UpdatePasswordDto } from './dto/update-password.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @HttpCode(200)
  @Post('signup')
  async signup(
    @Body() signupDto: SignupDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { mod: user, refreshToken } =
      await this.authService.signup(signupDto);

    // res.cookie('jwt', refreshToken, {
    //   httpOnly: true, //  prevents access via JS
    //   secure: true, //  only send over HTTPS (set false if dev)
    //   sameSite: 'strict', //  CSRF protection
    //   maxAge: 24 * 60 * 60 * 1000, // 1 days
    // });

    return { ...user, refreshToken };
  }

  @Patch('signup')
  async signupUpdate(
    @Body() signupUpdateDto: SignupUpdateDto,
    @Req() req: Request,
  ) {
    return await this.authService.signupUpdate(signupUpdateDto, req);
  }

  @HttpCode(200)
  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const {
      mod: user,
      refreshToken,
      accessToken,
    } = await this.authService.login(loginDto);

    // res.cookie('accessToken', accessToken, {
    //   httpOnly: true, //  prevents access via JS
    //   secure: true, //  only send over HTTPS (set false if dev)
    //   sameSite: 'strict', //  CSRF protection
    //   maxAge: 30 * 60 * 1000, // 30 minutes
    // });
    // res.cookie('jwt', refreshToken, {
    //   httpOnly: true, //  prevents access via JS
    //   secure: true, //  only send over HTTPS (set false if dev)
    //   sameSite: 'strict', //  CSRF protection
    //   maxAge: 24 * 60 * 60 * 1000, // 1 days
    // });
    return { ...user, refreshToken };
  }

  @Patch('profile')
  @UseGuards(new RolesGuard(['isStudent', 'isTeacher', 'isAdmin']))
  async update(@Body() updateUserDto: UpdateUserDto, @Req() req: Request) {
    return await this.authService.updateByUser(updateUserDto, req);
  }

  @Patch('update-password')
  @UseGuards(new RolesGuard(['isStudent', 'isTeacher', 'isAdmin']))
  async changePassword(
    @Body() changePasswordDto: ChangePasswordDto,
    @Req() req: Request,
  ) {
    return await this.authService.changePasswordByUser(changePasswordDto, req);
  }

  @Post('refresh')
  async refresh(@Body() refreshUserInfo: RefreshUserDto, @Req() req: Request) {
    const { userId, accessToken, refreshToken } =
      await this.authService.getAccessToken(refreshUserInfo, req);
    return { userId, accessToken };
  }

  @Post('reset-password')
  async resetPassword(@Body() ResetPasswordDto: ResetPasswordDto) {
    return await this.authService.sendPasswordResetEmail(ResetPasswordDto);
  }

  @Get('validate-token/:token')
  async validateToken(@Param('token') token: string) {
    return await this.authService.validatePasswordResetToken(token);
  }

  @Post('update-password')
  async updatePassword(@Body() UpdatePasswordDto: UpdatePasswordDto) {
    return await this.authService.resetPasswordWithToken(UpdatePasswordDto);
  }
}
