import { Module } from '@nestjs/common';
import { CloudfalreService } from './services/cloudfalre.service.js';
import { CloudfalreController } from './cloudfalre.controller.js';
import { R2Service } from './services/r2.service.js';

@Module({
  controllers: [CloudfalreController],
  providers: [CloudfalreService, R2Service],
  exports: [R2Service],
})
export class CloudfalreModule {}
