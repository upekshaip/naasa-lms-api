// src/media/dto/rename-folder.dto.ts
import { IsString, IsNotEmpty } from 'class-validator';

export class RenameFolderDto {
  @IsString()
  @IsNotEmpty({ message: 'Folder name cannot be empty' })
  name!: string;
}
