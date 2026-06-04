import { Transform, Type } from 'class-transformer';
import {
  IsOptional,
  IsInt,
  IsIn,
  IsEnum,
  IsString,
  IsBoolean,
} from 'class-validator';

export class UserEnrollmentFilterDto {
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
  @IsEnum(['expired', 'active', 'both'], {
    message: 'status must be one of: expired, active, both',
  })
  status?: 'expired' | 'active' | 'both' = 'both'; // default
}
