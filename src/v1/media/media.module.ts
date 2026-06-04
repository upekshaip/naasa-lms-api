import { Module } from '@nestjs/common';
import { MediaFolderService } from './services/media-folder.service.js';
import { MediaController } from './media.controller.js';
import { DatabaseModule } from '../../database/database.module.js';
import { MediaFileService } from './services/media-file.service.js';
import { ReceiptFileService } from './services/receipt-file.service.js';
import { R2Service } from '../cloudfalre/services/r2.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [MediaController],
  providers: [
    MediaFolderService,
    MediaFileService,
    ReceiptFileService,
    R2Service,
  ],
  exports: [ReceiptFileService],
})
export class MediaModule {}
