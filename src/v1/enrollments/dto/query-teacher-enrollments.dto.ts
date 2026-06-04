import { Type } from 'class-transformer';
import { IsOptional, IsInt, IsIn, IsEnum, IsString } from 'class-validator';
// import { ClassStatus, ClassType } from '../../../../generated/prisma/client.js';

export class QueryTeacherEnrollmentsDto {
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
  @Type(() => Number)
  @IsInt()
  studentId?: number;

  @IsOptional()
  @IsString()
  planSlug?: string;

  @IsOptional()
  @IsEnum(['active', 'expired'], {
    message: 'status must be either active or expired',
  })
  status?: 'active' | 'expired';
}
