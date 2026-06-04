import { Module } from '@nestjs/common';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { DatabaseModule } from '../../database/database.module.js';
import { EmailsModule } from '../emails/emails.module.js';

@Module({
  imports: [DatabaseModule, EmailsModule],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
