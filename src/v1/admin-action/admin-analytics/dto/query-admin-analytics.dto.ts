import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class QueryRevenueAnalyticsDto {
  @IsString()
  @IsOptional()
  @IsIn(['daily', 'monthly', 'yearly'])
  period?: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  // Admin-only scope to a single teacher's enrollments.
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  teacherId?: number;
}

export class QueryFinanceByTeacherDto {
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;
}

export class QueryEnrollmentReportDto {
  @IsString()
  @IsOptional()
  @IsIn(['daily', 'monthly', 'yearly'])
  period?: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  teacherId?: number;
}

export class QueryUserGrowthDto {
  @IsString()
  @IsOptional()
  @IsIn(['daily', 'monthly', 'yearly'])
  period?: string;

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;
}

export class QueryRecentActivityDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;
}
