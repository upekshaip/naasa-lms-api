import { ClassStatus, ClassType } from '../../../../generated/prisma/client.js';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsDefined,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export class TeacherCreateClassDto {
  @IsString()
  @MaxLength(255)
  name: string;

  @IsString()
  description: string;

  @IsInt()
  @IsOptional()
  classgroupId?: number;

  @IsInt()
  @IsOptional()
  teacherId?: number | null;

  // active, inactive, archived
  @IsEnum(ClassStatus)
  status: ClassStatus;

  // onetime, monthly
  @IsEnum(ClassType)
  classType: ClassType;

  @IsBoolean()
  isFeatured: boolean;

  @IsBoolean()
  isActiveForever: boolean;

  // must provide: 1-12 or null (only for monthly classes)
  @ValidateIf((o: TeacherCreateClassDto) => o.classMonth !== null) // Only validate if it's not null
  @IsInt()
  @Min(1)
  @Max(12)
  classMonth: number | null;

  @IsBoolean()
  firstSectionFreeApplied?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(7)
  color: string | null; // Hex color code for the class, e.g., #FF5733
}
