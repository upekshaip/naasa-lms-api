import { ClassPricePlanStatus } from '../../../../generated/prisma/client.js';
import { Type } from 'class-transformer';
import { IsOptional, IsNumber, IsEnum } from 'class-validator';

export class GetAllPricePlanDto {
  @IsOptional()
  @IsEnum(ClassPricePlanStatus)
  status?: ClassPricePlanStatus;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  teacherId?: number;
}
