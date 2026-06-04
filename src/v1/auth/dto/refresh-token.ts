import { IsNotEmpty, IsNumber } from 'class-validator';

export class RefreshUserDto {
  @IsNumber()
  @IsNotEmpty()
  userId!: number;
}
