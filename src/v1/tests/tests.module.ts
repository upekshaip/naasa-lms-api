import { Module } from '@nestjs/common';
import { TestsService } from './tests.service.js';
import { TestsController } from './tests.controller.js';
import { EmailsModule } from '../emails/emails.module.js';

@Module({
  imports: [EmailsModule],
  controllers: [TestsController],
  providers: [TestsService],
})
export class TestsModule {}
