import { Type } from 'class-transformer';
import { ValidateNested, IsArray } from 'class-validator';
import { CreateClassContentDto } from './create-class-content.dto.js';

export class UpdateClassContentsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateClassContentDto)
  contents!: CreateClassContentDto[];
}
