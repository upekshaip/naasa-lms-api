import { PartialType } from '@nestjs/mapped-types';
import { CreatePricePlanDto } from './create-price-plan.js';

export class UpdatePricePlanDto extends PartialType(CreatePricePlanDto) {}
