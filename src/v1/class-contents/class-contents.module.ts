import { Module } from '@nestjs/common';
import { ClassContentsService } from './services/class-contents.service.js';
import { ClassContentsController } from './class-contents.controller.js';
import { DatabaseModule } from '../../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ClassContentsController],
  providers: [ClassContentsService],
})
export class ClassContentsModule {}
