import { Controller, Get, Query, Redirect } from '@nestjs/common';
import { GoogleAuthService } from './google-auth.service.js';

@Controller('google-auth')
export class GoogleAuthController {
  constructor(private readonly googleAuthService: GoogleAuthService) {}

  @Get()
  @Redirect()
  getLoginUrl() {
    const url = this.googleAuthService.getLoginUrl();
    return { url };
  }

  @Get('callback')
  async handleCallback(@Query('code') code: string) {
    const tokens = await this.googleAuthService.exchangeCode(code);

    return {
      message: 'Authentication Successful!',
      instructions:
        'Copy the refresh_token below, paste it into your .env file, and restart your server.',
      tokens: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date,
      },
    };
  }
}
