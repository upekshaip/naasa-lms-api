import { Module } from '@nestjs/common';
import { AccessRequestService } from './services/access-request.service.js';
import { AccessRequestController } from './access-request.controller.js';
import { DatabaseModule } from '../../database/database.module.js';
import { EmailsModule } from '../emails/emails.module.js';
import { MediaModule } from '../media/media.module.js';

@Module({
  imports: [DatabaseModule, EmailsModule, MediaModule],
  controllers: [AccessRequestController],
  providers: [AccessRequestService],
  exports: [AccessRequestService],
})
export class AccessRequestModule {}
