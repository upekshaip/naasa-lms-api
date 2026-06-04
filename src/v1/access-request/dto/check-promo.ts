import { Type } from 'class-transformer';
import { IsOptional, IsInt, IsIn, IsEnum, IsString } from 'class-validator';

export class CheckPromoDto {
  @IsString()
  promocode: string;
}
