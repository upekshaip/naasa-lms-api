import { Controller, Get } from '@nestjs/common';
import { TestsService } from './tests.service.js';

@Controller('tests')
export class TestsController {
  constructor(private readonly testsService: TestsService) {}

  @Get('send-test-email')
  async sendTestEmail() {
    return await this.testsService.sendTestEmail();
  }
}
