import { Type } from 'class-transformer';
import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class QueryStatDto {
  @IsString()
  @IsNotEmpty()
  @Type(() => String)
  @IsIn(['month', 'week'], {
    message: 'period must be one of: month, week',
  })
  period: string = 'week'; // default
}
