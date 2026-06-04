import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  IsNumber,
  IsBoolean,
  Min,
  Max,
  IsInt,
} from 'class-validator';

export class CreatePricePlanDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  name: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsNumber()
  @Min(100)
  @Max(10000)
  price: number;

  @IsNumber()
  @Min(1)
  duration: number;

  @IsOptional()
  @IsInt()
  teacherId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  promocode?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  promoDiscountPercentage?: number = 0;

  @IsOptional()
  @IsBoolean()
  isPromoActive?: boolean = false;

  @IsOptional()
  @IsNumber()
  @Min(0)
  earlyBirdMaxCount?: number = 0;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  earlyBirdDiscountPercentage?: number = 0;

  @IsOptional()
  @IsBoolean()
  isEarlyBirdActive?: boolean = false;

  @IsOptional()
  @IsString()
  @MaxLength(7)
  color: string | null; // Hex color code for the price plan, e.g., #FF5733
}
