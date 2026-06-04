import { Type } from 'class-transformer';
import { IsOptional, IsInt, IsIn, IsEnum, IsString } from 'class-validator';
// import { ClassStatus, ClassType } from '../../../../generated/prisma/client.js';

export class QueryStudentFilterDto {
  @IsEnum(['active', 'expired'], {
    message: 'status must be either active or expired',
  })
  status?: 'active' | 'expired' = 'active'; // default to active

  @IsOptional()
  @Type(() => Number)
  @IsIn([5, 10, 20, 50], {
    message: 'limit must be one of: 5, 10, 20, 50',
  })
  limit?: number = 5; // default

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  page?: number = 1; // default
}
