import { Module } from '@nestjs/common';
import { ClassPlanLinkService } from './services/class-plan-link.service.js';
import { ClassPlanLinkController } from './class-plan-link.controller.js';
import { DatabaseModule } from '../../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ClassPlanLinkController],
  providers: [ClassPlanLinkService],
})
export class ClassPlanLinkModule {}
