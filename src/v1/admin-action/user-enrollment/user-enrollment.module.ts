import { Module } from '@nestjs/common';
import { UserEnrollmentService } from './services/user-enrollment.service.js';
import { UserEnrollmentController } from './user-enrollment.controller.js';
import { DatabaseModule } from '../../../database/database.module.js';
import { FilterEnrollmentsService } from '../../enrollments/services/filter-enrollments.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [UserEnrollmentController],
  providers: [UserEnrollmentService],
})
export class UserEnrollmentModule {}
