import { IsOptional, IsString } from 'class-validator';

export class BroadcastNotificationDto {
  @IsString()
  classSlug: string;

  @IsString()
  title: string;

  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  url?: string | null;
}
