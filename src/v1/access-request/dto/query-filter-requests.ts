import { Type } from 'class-transformer';
import { IsOptional, IsInt, IsIn, IsEnum, IsString } from 'class-validator';

export class QueryFilterRequestsDto {
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

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  requestId?: number; // optional filter by price plan
}
