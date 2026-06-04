import { IsString, MaxLength } from 'class-validator';

export class CreateVideoDto {
  // max 255 characters
  @IsString()
  @MaxLength(255)
  title!: string;

  @IsString()
  @MaxLength(255)
  videoId!: string;

  @IsString()
  @MaxLength(255)
  videoKey!: string;
}
