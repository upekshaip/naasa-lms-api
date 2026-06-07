import { Transform, Type } from 'class-transformer';
import {
  IsOptional,
  IsInt,
  IsIn,
  IsEnum,
  IsString,
  IsBoolean,
  IsNumber,
} from 'class-validator';

export class ActiveUserFilterDto {
  @IsOptional()
  @Type(() => Number)
  @IsIn([10, 20, 50], {
    message: 'limit must be one of: 10, 20, 50',
  })
  limit?: number = 10; // default

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1; // default

  @IsOptional()
  @IsString()
  search?: string;

  @IsEnum(['student', 'teacher', 'admin'], {
    message: 'userType must be one of: student, teacher, admin',
  })
  userType?: string = 'student';

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  duration?: number = 1; // in days, optional filter for active users
}
