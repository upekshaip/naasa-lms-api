import {
  IsDateString,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  Length,
} from 'class-validator';

export class SignupUpdateDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNotEmpty()
  @Length(3, 50)
  name: string;

  @IsNotEmpty()
  @IsPhoneNumber('LK') // "null" = any country
  phone: string;

  @IsNotEmpty()
  @IsEnum(['m', 'f', 'o'], { message: 'Gender must be either m, f or o' })
  gender: 'm' | 'f' | 'o';

  @IsNotEmpty()
  @IsDateString()
  dob: string;

  @IsOptional()
  @IsString()
  @Length(0, 200)
  address?: string;
}
