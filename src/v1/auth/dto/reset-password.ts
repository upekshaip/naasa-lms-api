import { IsEmail, IsNotEmpty } from 'class-validator';

// forgot password DTO
export class ResetPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}
