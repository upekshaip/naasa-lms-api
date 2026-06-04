import { Module } from '@nestjs/common';
import { UserManagementService } from './services/user-management.service.js';
import { UserManagementController } from './user-management.controller.js';
import { DatabaseModule } from '../../../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [UserManagementController],
  providers: [UserManagementService],
})
export class UserManagementModule {}
