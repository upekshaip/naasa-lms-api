import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { R2Service } from '../../cloudfalre/services/r2.service.js';
import { Request } from 'express';

@Injectable()
export class ReceiptFileService {
  constructor(
    private readonly db: DatabaseService,
    private readonly r2Service: R2Service,
  ) {}

  // --- FILE UPLOAD LOGIC ---
  async uploadReceipt(file: Express.Multer.File, teacherId: number) {
    // 1. Generate the unique filename
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    // 2. Build the exact R2 key using the prefix
    const r2Key = this.r2Service.createReceiptPath(uniqueName, teacherId);

    // 3. Upload using the full path
    await this.r2Service.uploadBuffer(file.buffer, r2Key, file.mimetype);
    const fileExtension = file.originalname.split('.').pop() || 'unknown';

    return {
      fileId: uniqueName,
      fileName: file.originalname,
      fileType: fileExtension,
      mimetype: file.mimetype,
      size: file.size,
    };
  }
}
