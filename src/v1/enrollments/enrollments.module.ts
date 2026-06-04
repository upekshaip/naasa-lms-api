import { Module } from '@nestjs/common';
import { EnrollmentsService } from './services/enrollments.service.js';
import { EnrollmentsController } from './enrollments.controller.js';
import { EnrollmentStatsService } from './services/entollment-stats.service.js';
import { DatabaseModule } from '../../database/database.module.js';
import { FilterEnrollmentsService } from './services/filter-enrollments.service.js';
import { StudentEnrollmentsService } from './services/student-enrollments.service.js';
import { EmailsModule } from '../emails/emails.module.js';

@Module({
  imports: [DatabaseModule, EmailsModule],
  controllers: [EnrollmentsController],
  providers: [
    EnrollmentsService,
    EnrollmentStatsService,
    FilterEnrollmentsService,
    StudentEnrollmentsService,
  ],
  exports: [FilterEnrollmentsService],
})
export class EnrollmentsModule {}
