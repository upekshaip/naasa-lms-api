import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  IsOptional,
  Length,
} from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  @Length(3, 50)
  name!: string;

  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsNotEmpty()
  @IsString()
  @Length(5, 50)
  password!: string;

  @IsNotEmpty()
  @IsString()
  @Length(10, 15)
  phone!: string;

  @IsNotEmpty()
  @IsEnum(['m', 'f', 'o'], { message: 'Gender must be either m, f or o' })
  gender!: 'm' | 'f' | 'o';
}
