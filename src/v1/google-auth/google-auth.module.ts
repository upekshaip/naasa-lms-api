import { Module } from '@nestjs/common';
import { GoogleAuthService } from './google-auth.service.js';
import { GoogleAuthController } from './google-auth.controller.js';
import { GoogleDriveService } from '../../utils/google-drive.js';

@Module({
  controllers: [GoogleAuthController],
  providers: [GoogleAuthService, GoogleDriveService],
})
export class GoogleAuthModule {}
