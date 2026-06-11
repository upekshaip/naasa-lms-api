import { Transform, Type } from 'class-transformer';
import {
  IsOptional,
  IsInt,
  IsIn,
  IsEnum,
  IsString,
  IsBoolean,
} from 'class-validator';

export class UserFilterDto {
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

  @IsOptional()
  @Transform(({ value }) => {
    // Check for string "1"/"0" or number 1/0
    if (value === '1' || value === 1) return true;
    if (value === '0' || value === 0) return false;

    // Optional fallback if you still want to support 'true'/'false' strings
    if (value === 'true') return true;
    if (value === 'false') return false;

    return value as boolean;
  })
  @IsBoolean()
  isBlocked?: boolean;

  @IsEnum(['student', 'teacher', 'admin'], {
    message: 'userType must be one of: student, teacher, admin',
  })
  userType?: string = 'student';

  // only users who joined within the last N days (new-users view)
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  joinedWithinDays?: number;
}
