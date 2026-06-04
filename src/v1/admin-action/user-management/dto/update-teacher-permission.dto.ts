import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  Length,
} from 'class-validator';

export class UpdateTeacherPermissionDto {
  @IsNotEmpty()
  @IsBoolean()
  canCreatePlan!: boolean;

  @IsNotEmpty()
  @IsBoolean()
  canEditPlan!: boolean;

  @IsNotEmpty()
  @IsBoolean()
  canBroadcastMessage!: boolean;

  @IsNotEmpty()
  @IsBoolean()
  canBroadcastSMS!: boolean;

  @IsNotEmpty()
  @IsInt()
  maxMonthlyClasslimit!: number;

  @IsNotEmpty()
  @IsInt()
  maxOnetimeClasslimit!: number;

  @IsNotEmpty()
  @IsInt()
  maxPricePlanLimit!: number;

  @IsNotEmpty()
  @IsNumber()
  maxVideoStorageLimit!: number;

  @IsNotEmpty()
  @IsNumber()
  maxMediaStorageLimit!: number;
}
