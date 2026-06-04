import { IsString, MaxLength } from 'class-validator';

export class CreateClassPlanLinkDto {
  @IsString()
  @MaxLength(255)
  classSlug: string;

  @IsString({ each: true })
  @MaxLength(255, { each: true })
  pricePlanSlugs: string[];
}
