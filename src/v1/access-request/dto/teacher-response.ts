import { IsBoolean, IsInt, IsOptional, IsString } from 'class-validator';

export class TeacherResponseDto {
  @IsInt()
  id!: number;

  @IsBoolean()
  response!: boolean;
}
