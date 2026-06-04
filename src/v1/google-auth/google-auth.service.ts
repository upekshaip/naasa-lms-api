import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { GoogleDriveService } from '../../utils/google-drive.js';
import { Auth } from 'googleapis';

@Injectable()
export class GoogleAuthService {
  constructor(private readonly driveService: GoogleDriveService) {}

  getLoginUrl(): string {
    return this.driveService.getAuthUrl();
  }

  async exchangeCode(code: string): Promise<Auth.Credentials> {
    if (!code) {
      throw new HttpException(
        'No authorization code provided by Google.',
        HttpStatus.BAD_REQUEST,
      );
    }

    return await this.driveService.exchangeCodeForTokens(code);
  }
}
