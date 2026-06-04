import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class RenameVideoDto {
  @IsString()
  @MaxLength(255)
  title!: string;
}
