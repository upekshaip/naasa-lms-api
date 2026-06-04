import { IsInt, IsOptional, IsString, Length } from 'class-validator';

export class CreateFolderDto {
  @IsString()
  @Length(1, 255)
  name!: string;

  // is int or null
  @IsOptional()
  @IsInt()
  parentId?: number | null;
}
