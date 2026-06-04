import { Controller } from '@nestjs/common';
import { CloudfalreService } from './services/cloudfalre.service.js';

@Controller('cloudfalre')
export class CloudfalreController {
  constructor(private readonly cloudfalreService: CloudfalreService) {}
}
