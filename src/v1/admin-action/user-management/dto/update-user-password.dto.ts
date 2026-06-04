import { IsString, IsNotEmpty, Length } from 'class-validator';

export class UpdateUserPasswordDto {
  @IsNotEmpty()
  @IsString()
  @Length(6, 100)
  password!: string;
}
