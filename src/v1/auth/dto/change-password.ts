import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class ChangePasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @IsString()
  @Length(5, 50)
  oldPassword: string;

  @IsNotEmpty()
  @IsString()
  @Length(5, 50)
  newPassword: string;

  @IsNotEmpty()
  @IsString()
  @Length(5, 50)
  confirmPassword: string;
}
