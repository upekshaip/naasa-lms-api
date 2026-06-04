import { Module } from '@nestjs/common';
import { ChangeRole } from './services/changeRole.service.js';
import { UsersController } from './users.controller.js';
import { DatabaseModule } from '../../database/database.module.js';

@Module({
  imports: [DatabaseModule],
  controllers: [UsersController],
  providers: [ChangeRole],
})
export class UsersModule {}
