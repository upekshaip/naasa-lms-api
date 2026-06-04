import { Type } from 'class-transformer';
import { IsOptional, IsInt, IsIn, IsEnum } from 'class-validator';
import { ClassStatus, ClassType } from '../../../../generated/prisma/client.js';

export class QueryTeacherClassesDto {
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
  // active, inactive, archived
  @IsEnum(ClassStatus)
  status?: ClassStatus;

  @IsOptional()
  // onetime, monthly
  @IsEnum(ClassType)
  type?: ClassType;
}
