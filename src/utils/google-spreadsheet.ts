import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { google, drive_v3, sheets_v4 } from 'googleapis';
import { GaxiosError } from 'gaxios';

export class GoogleSpreadSheetService {
  private sheets: sheets_v4.Sheets;

  constructor(private readonly config: ConfigService) {}

  authorize = async () => {
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key:
        process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n') ||
        '',
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    await auth.authorize();
    this.sheets = google.sheets({ version: 'v4', auth });
  };

  writeData = async (
    spreadsheetId: string,
    sheetType: 'users' | 'enrollments' | 'payments',
    values: (string | number)[][],
  ) => {
    try {
      if (!this.sheets) {
        await this.authorize();
      }

      const res = await this.sheets.spreadsheets.values.append({
        spreadsheetId,
        range: sheetType,
        valueInputOption: 'RAW',
        requestBody: { values },
      });

      return res.data;
    } catch (e) {
      console.log(`Failed to write to spreadsheet ${sheetType}`);
    }
  };

  //   Write data to Users table
  writeToUsers = async (userSheetInputData: {
    createdAt: string;
    userId: number;
    name: string | null;
    email: string;
    phone: string | null;
    gender: string | null;
  }) => {
    await this.writeData(process.env.GOOGLE_SHEETS_USERS || '', 'users', [
      [
        userSheetInputData.createdAt,
        userSheetInputData.userId,
        `${userSheetInputData.name || ''}`,
        userSheetInputData.email,
        `${userSheetInputData.phone || ''}`,
        `${userSheetInputData.gender || ''}`,
      ],
    ]);
  };

  //   Write data to Enrollment table
  writeToEnrollments = async (enrollmentSheetInputData: {
    createdAt: string;
    userId: string;
    name: string;
    email: string;
    phone: string;
    gender: string;
  }) => {
    await this.writeData(
      process.env.GOOGLE_SHEETS_ENROLLMENTS || '',
      'enrollments',
      [
        [
          enrollmentSheetInputData.createdAt,
          enrollmentSheetInputData.userId,
          enrollmentSheetInputData.name,
          enrollmentSheetInputData.email,
          enrollmentSheetInputData.phone,
          enrollmentSheetInputData.gender,
        ],
      ],
    );
  };

  //   Write data to Enrollment table
  writeToPayments = async (paymentSheetInputData: {
    createdAt: string;
    userId: string;
    name: string;
    email: string;
    phone: string;
    gender: string;
  }) => {
    await this.writeData(process.env.GOOGLE_SHEETS_PAYMENTS || '', 'payments', [
      [
        paymentSheetInputData.createdAt,
        paymentSheetInputData.userId,
        paymentSheetInputData.name,
        paymentSheetInputData.email,
        paymentSheetInputData.phone,
        paymentSheetInputData.gender,
      ],
    ]);
  };
}
