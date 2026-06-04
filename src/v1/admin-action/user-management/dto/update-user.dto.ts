import { Transform, Type } from 'class-transformer';
import {
  IsOptional,
  IsInt,
  IsIn,
  IsEnum,
  IsString,
  IsBoolean,
  IsNotEmpty,
  Length,
  IsEmail,
  ValidateIf,
  IsDateString,
} from 'class-validator';

export class UpdateUserDto {
  @IsNotEmpty()
  @Length(3, 50)
  name!: string;

  @IsEmail()
  @IsNotEmpty()
  @Length(5, 100)
  email!: string;

  @IsNotEmpty()
  @IsString()
  @Length(10, 15)
  phone!: string;

  @IsNotEmpty()
  @IsEnum(['m', 'f', 'o'], { message: 'Gender must be either m, f or o' })
  gender!: 'm' | 'f' | 'o';

  @IsOptional()
  @IsDateString()
  dob?: Date | null;

  @IsOptional()
  @IsString()
  @Length(0, 255)
  address?: string | null;
}
