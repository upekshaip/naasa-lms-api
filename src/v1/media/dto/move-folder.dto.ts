// src/media/dto/move-folder.dto.ts
import { IsInt, IsOptional } from 'class-validator';

export class MoveFolderDto {
  @IsOptional()
  @IsInt()
  parentId?: number | null;
}
