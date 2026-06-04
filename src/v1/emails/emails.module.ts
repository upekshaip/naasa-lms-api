import { Module } from '@nestjs/common';
import { EmailsService } from './emails.service.js';
import { AWSMailService } from '../../utils/aws-ses.js';

@Module({
  imports: [],
  providers: [EmailsService, AWSMailService],
  exports: [EmailsService],
})
export class EmailsModule {}
