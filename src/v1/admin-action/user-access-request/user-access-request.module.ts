import { Module } from '@nestjs/common';
import { UserAccessRequestService } from './services/user-access-request.service.js';
import { UserAccessRequestController } from './user-access-request.controller.js';
import { DatabaseModule } from '../../../database/database.module.js';
import { EmailsModule } from '../../emails/emails.module.js';
import { MediaModule } from '../../media/media.module.js';
import { AccessRequestService } from '../../access-request/services/access-request.service.js';

@Module({
  imports: [DatabaseModule, EmailsModule, MediaModule],
  controllers: [UserAccessRequestController],
  providers: [UserAccessRequestService, AccessRequestService],
})
export class UserAccessRequestModule {}
