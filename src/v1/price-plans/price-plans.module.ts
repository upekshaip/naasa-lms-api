import { Module } from '@nestjs/common';
import { PricePlansService } from './services/price-plans.service.js';
import { PricePlansController } from './price-plans.controller.js';
import { DatabaseModule } from '../../database/database.module.js';
import { FilterPricePlansService } from './services/filter-price-plans.service.js';
import { StudentPricePlansServices } from './services/student-price-plans.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [PricePlansController],
  providers: [
    PricePlansService,
    FilterPricePlansService,
    StudentPricePlansServices,
  ],
})
export class PricePlansModule {}
