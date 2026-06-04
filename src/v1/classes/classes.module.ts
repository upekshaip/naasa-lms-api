import { Module } from '@nestjs/common';
import { ClassesService } from './services/classes.service.js';
import { ClassesController } from './classes.controller.js';
import { DatabaseModule } from '../../database/database.module.js';
import { FilterClassesService } from './services/filter-classes.service.js';
import { StudentClassesService } from './services/student-classes.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [ClassesController],
  providers: [ClassesService, FilterClassesService, StudentClassesService],
})
export class ClassesModule {}
