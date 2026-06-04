import { IsInt, IsOptional, IsString } from 'class-validator';

export class StudentAccessRequestDto {
  @IsOptional()
  @IsString()
  message?: string;

  @IsOptional()
  @IsString()
  promocode?: string;
}
