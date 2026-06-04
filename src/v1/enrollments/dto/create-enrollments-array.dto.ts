import { Type } from 'class-transformer';
import { ValidateNested, IsArray } from 'class-validator';
import { CreateEnrollmentDto } from './create-enrollment.dto.js';

export class CreateEnrollmentsArrayDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEnrollmentDto)
  enrollments: CreateEnrollmentDto[];
}
