import { IsNotEmpty, IsBoolean, IsNumber } from 'class-validator';

export class ChangeRoleDto {
  @IsNotEmpty()
  @IsBoolean()
  isStudent: boolean;

  @IsNotEmpty()
  @IsBoolean()
  isTeacher: boolean;

  @IsNotEmpty()
  @IsBoolean()
  isAdmin: boolean;

  @IsNotEmpty()
  @IsNumber()
  userId: number;
}
