import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
  ListObjectsV2CommandOutput,
} from '@aws-sdk/client-s3';
import { Readable } from 'stream';

@Injectable()
export class R2Service {
  private s3Client: S3Client;
  private bucketName = process.env.R2_BUCKET_NAME as string;

  constructor() {
    // We use 'as string' to satisfy TypeScript's strict null checks for process.env
    const accountId = process.env.R2_ACCOUNT_ID as string;
    const accessKeyId = process.env.R2_ACCESS_KEY_ID as string;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY as string;

    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: accessKeyId,
        secretAccessKey: secretAccessKey,
      },
    });
  }

  createContentPath(fileId: string, teacherId: number): string {
    return `teacher/${teacherId}/content/${fileId}`;
  }
  createReceiptPath(fileId: string, teacherId: number): string {
    return `teacher/${teacherId}/receipt/${fileId}`;
  }

  async uploadBuffer(fileBuffer: Buffer, fileId: string, mimetype: string) {
    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: fileId,
          Body: fileBuffer,
          ContentType: mimetype,
        }),
      );
      return fileId;
    } catch (error) {
      throw new InternalServerErrorException('Failed to upload to R2');
    }
  }

  // Gets the raw read stream from Cloudflare R2
  async getFileStream(fileId: string): Promise<Readable> {
    try {
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.bucketName,
          Key: fileId,
        }),
      );
      return response.Body as Readable;
    } catch (error) {
      throw new InternalServerErrorException('File not found in R2');
    }
  }

  async deleteFile(fileId: string) {
    try {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: fileId,
        }),
      );
    } catch (error) {
      throw new InternalServerErrorException('Failed to delete from R2');
    }
  }

  async deleteFilesWithPrefix(prefix: string) {
    try {
      let isTruncated = true;
      let continuationToken: string | undefined = undefined;

      while (isTruncated) {
        const listCommand = new ListObjectsV2Command({
          Bucket: this.bucketName,
          Prefix: prefix,
          ContinuationToken: continuationToken,
        });

        const listResult: ListObjectsV2CommandOutput =
          await this.s3Client.send(listCommand);

        if (listResult.Contents && listResult.Contents.length > 0) {
          const deleteCommand = new DeleteObjectsCommand({
            Bucket: this.bucketName,
            Delete: {
              Objects: listResult.Contents.map((item) => ({
                Key: item.Key as string,
              })),
              Quiet: true,
            },
          });

          await this.s3Client.send(deleteCommand);
        }

        isTruncated = listResult.IsTruncated ?? false;
        continuationToken = listResult.NextContinuationToken;
      }
    } catch (error) {
      throw new InternalServerErrorException(
        'Failed to delete prefixed files from R2',
      );
    }
  }
}
