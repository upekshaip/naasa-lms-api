import {
  IsDate,
  IsDateString,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class QueryPlanAnalyticsDto {
  @IsString()
  @IsOptional()
  @IsIn(['daily', 'monthly', 'yearly'])
  period?: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: Date;

  @IsDateString()
  @IsNotEmpty()
  endDate: Date;
}
