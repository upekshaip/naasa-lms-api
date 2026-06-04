import { ClassPricePlanStatus } from '../../../../generated/prisma/client.js';
import { Type } from 'class-transformer';
import { IsOptional, IsInt, IsIn, IsEnum } from 'class-validator';

export class QueryTeacherPricePlansDto {
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
  // active, pending, archived
  @IsEnum(ClassPricePlanStatus)
  status?: ClassPricePlanStatus;
}
