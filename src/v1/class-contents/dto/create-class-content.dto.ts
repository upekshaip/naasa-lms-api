import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { ContentType } from '../../../../generated/prisma/browser.js';

export class CreateClassContentDto {
  @IsOptional() // new rows use Date.now()
  @IsInt()
  contentId?: number;

  @IsInt()
  classId!: number;

  // @ValidateIf((o) => o.title !== '')
  @IsString()
  @MaxLength(255)
  title!: string;

  // @ValidateIf((o) => o.description !== '')
  @IsString()
  @IsOptional()
  @MaxLength(255)
  description?: string;

  @IsEnum(ContentType)
  type!: ContentType;

  // URL required ONLY for certain content types
  // @ValidateIf((o) => ['video', 'audio', 'image', 'url'].includes(o.contentType))
  @IsString()
  contentUrl!: string;

  @IsInt()
  @Min(1)
  sectionId!: number;

  @IsInt()
  @Min(1)
  orderId!: number;

  @IsBoolean()
  isNew!: boolean;

  @IsOptional()
  @IsInt()
  mediaId?: number | null; // Optional mediaId for linking to uploaded files

  @IsOptional()
  @IsInt()
  videoId?: number | null; // Optional videoId for linking to uploaded videos (video -> id in video table)
}
