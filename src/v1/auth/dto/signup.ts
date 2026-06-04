import { IsEmail, IsEnum, IsNotEmpty, IsString, Length } from 'class-validator';
import { UserDevice } from '../../../../generated/prisma/client.js';

export class SignupDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsNotEmpty()
  @IsString()
  @Length(5, 50)
  password!: string;

  @IsNotEmpty()
  @IsEnum(UserDevice)
  device!: UserDevice;
}
