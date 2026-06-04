import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

// for teachers to enroll students into their classes (offline)
export class CreateEnrollmentDto {
  @IsNumber()
  @Min(1)
  @IsNotEmpty()
  classPricePlanId: number;

  @IsOptional()
  @IsBoolean()
  promoApplied?: boolean;

  @IsOptional()
  @IsBoolean()
  earlyBirdApplied?: boolean;
}
