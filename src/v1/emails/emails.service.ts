import { Injectable } from '@nestjs/common';
import { AWSMailService } from '../../utils/aws-ses.js';
import { enrollementReceiptTemplate } from './template/enrollment-receipt.js';
import { welcomeMessageTemplate } from './template/welcome-message.js';
import { enrollementRejectionTemplate } from './template/enrollment-reject-message.js';
import { passwordResetTemplate } from './template/passwordResetTemplate.js';

@Injectable()
export class EmailsService {
  constructor(private readonly awsMailService: AWSMailService) {}

  async sendWelcomeEmail(email: string, name: string) {
    const { subject, htmlBody } = welcomeMessageTemplate(name);

    const result = await this.awsMailService.sendEmail(
      email,
      subject,
      htmlBody,
    );
    if (result === null) {
      console.log(`Failed to send welcome email to ${email}`);
    }
  }

  async sendPasswordResetEmail(name: string, email: string, token: string) {
    const resetUrl = `${process.env.FRONTEND_URL}/update-password?token=${token}`;
    const { subject, htmlBody } = passwordResetTemplate(name, resetUrl);

    const result = await this.awsMailService.sendEmail(
      email,
      subject,
      htmlBody,
    );
    if (result === null) {
      console.log(`Failed to send password reset email to ${email}`);
      return false;
    }
    return true;
  }

  async sendRejectedEnrollmentEmail(
    email: string,
    name: string,
    planName: string,
  ) {
    const { subject, htmlBody } = enrollementRejectionTemplate(name, planName);

    const result = await this.awsMailService.sendEmail(
      email,
      subject,
      htmlBody,
    );
    if (result === null) {
      console.log(`Failed to send rejected enrollment email to ${email}`);
    }
  }

  async sendEnrollmentReceiptEmail(
    email: string,
    name: string,
    enrollmentDetails: {
      planName: string;
      planSlug: string;
      price: number;
      earlyBirdDiscountAmount: number;
      promoDiscountAmount: number;
      purchasedAmount: number;
      isEarlyBirdApplied: boolean;
      isPromoApplied: boolean;
      expiresAt: Date;
      classes: { name: string }[];
    },
  ) {
    const { subject, htmlBody } = enrollementReceiptTemplate(
      name,
      enrollmentDetails,
    );
    const result = await this.awsMailService.sendEmail(
      email,
      subject,
      htmlBody,
    );
    if (result === null) {
      console.log(`Failed to send enrollment receipt email to ${email}`);
    }
  }
}
