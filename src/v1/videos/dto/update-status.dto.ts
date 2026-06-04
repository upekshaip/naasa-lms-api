import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateStatusDto {
  // max 255 characters
  @IsString()
  @IsEnum(['processing', 'uploading', 'ready', 'failed', 'canceled'])
  status: string = 'processing';

  @IsString()
  @MaxLength(255)
  videoId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  videoKey: string | undefined;
}
