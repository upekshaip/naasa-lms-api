import {
  SESClient,
  SESClientConfig,
  SendEmailCommand,
} from '@aws-sdk/client-ses';
import { Injectable } from '@nestjs/common';
import { INSTITUTION_NAME } from './config.js';

@Injectable()
export class AWSMailService {
  private sesClient: SESClient;

  constructor() {
    const sesConfig: SESClientConfig = {
      region: process.env.AWS_REGION as string,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
      },
    };
    this.sesClient = new SESClient(sesConfig);
    console.log('✅ Initialized AWS SES Client with region:', sesConfig.region);
  }

  async sendEmail(to: string, subject: string, htmlBody: string) {
    const command = new SendEmailCommand({
      Destination: { ToAddresses: [to] },
      Message: {
        Body: {
          Html: { Data: htmlBody, Charset: 'UTF-8' },
        },
        Subject: { Data: subject, Charset: 'UTF-8' },
      },
      // Ensure this email or domain is verified in your SES console
      Source: `"${INSTITUTION_NAME}" <noreply@naasa-lms.deamoz.com>`,
    });

    try {
      return await this.sesClient.send(command);
    } catch (error) {
      console.log('SES Email Error:', error);
      return null;
    }
  }
}
