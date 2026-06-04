import { Injectable } from '@nestjs/common';
import { EmailsService } from '../emails/emails.service.js';

@Injectable()
export class TestsService {
  constructor(private readonly emailsService: EmailsService) {}

  async sendTestEmail() {
    return await this.emailsService.sendWelcomeEmail(
      'ztoxys@gmail.com',
      'Ztoxy',
    );
  }
}
