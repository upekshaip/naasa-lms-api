import { PartialType } from '@nestjs/mapped-types';
import { TeacherCreateClassDto } from './create-class.dto.js';

export class TeacherUpdateClassDto extends PartialType(TeacherCreateClassDto) {}
