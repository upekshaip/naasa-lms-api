import { IsIn, IsNotEmpty, IsString } from 'class-validator';

export class ApprovePricePlanDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['approved', 'rejected'])
  response: 'approved' | 'rejected';
}
