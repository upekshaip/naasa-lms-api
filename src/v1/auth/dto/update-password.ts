import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

// update password with token DTO
export class UpdatePasswordDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @IsNotEmpty()
  newPassword!: string;
}
