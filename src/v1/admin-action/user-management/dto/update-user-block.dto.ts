import { IsString, IsNotEmpty, Length, IsBoolean } from 'class-validator';

export class UpdateUserBlockDto {
  @IsNotEmpty()
  @IsBoolean()
  isBlocked!: boolean;
}
