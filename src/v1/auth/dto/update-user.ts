import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsString,
  Length,
  IsOptional,
  IsDateString,
  ValidateIf,
} from 'class-validator';

export class UpdateUserDto {
  @IsNotEmpty()
  @Length(3, 50)
  name: string;

  @IsEmail()
  @IsNotEmpty()
  @Length(5, 100)
  email: string;

  @IsNotEmpty()
  @IsString()
  @Length(10, 15)
  phone: string;

  @IsNotEmpty()
  @IsEnum(['m', 'f', 'o'], { message: 'Gender must be either m, f or o' })
  gender: 'm' | 'f' | 'o';

  @ValidateIf((_, value) => value !== null)
  @IsDateString()
  dob?: Date | null;

  @ValidateIf((_, value) => value !== null)
  @IsString()
  @Length(0, 255)
  address?: string | null;
}
