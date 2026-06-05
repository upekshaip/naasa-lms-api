/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

// Use your actual environment variables here.
// CRITICAL: VIDEO_KEY_SECRET must be exactly 32 characters long for AES-256.
const ENCRYPTION_KEY =
  process.env.VIDEO_KEY_SECRET || '1551f98cfa7b3ba7dc72abd95bbf6ff0';
const IV_LENGTH = 16;

@Injectable()
export class VideoKeyService {
  constructor(private readonly db: DatabaseService) {}

  // --- ENCRYPTION UTILS ---
  private encryptKey(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY),
      iv,
    );
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
  }

  private decryptKey(text: string): string {
    const textParts = text.split(':');
    const iv = Buffer.from(textParts.shift() as string, 'hex');
    const encryptedText = Buffer.from(textParts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY),
      iv,
    );
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  }

  // --- MAIN KEY FETCH LOGIC ---
  async findVideoKey(videoId: string, req: Request, res: Response) {
    // 1. Check for the specific video token cookie
    const videoToken = req.cookies?.videoToken;
    const tokenSecret =
      process.env.ACCESS_TOKEN_SECRET || 'default_access_token_secret';

    // 2. FAST PATH: Validate Token & Decrypt (Zero DB Hits)
    if (videoToken) {
      try {
        const decodedToken = jwt.verify(videoToken, tokenSecret) as any;

        if (decodedToken && decodedToken.videoId === videoId) {
          // Token matches the requested video. Decrypt and serve instantly.
          const rawKeyString = this.decryptKey(decodedToken.encryptedKey);
          const buffer = Buffer.from(rawKeyString, 'hex');

          res.set('Content-Type', 'application/octet-stream');
          return res.send(buffer);
        }
      } catch (err) {
        // Token is expired, tampered with, or for the wrong video.
        // We catch this quietly and fall back to the database check.
      }
    }

    // 3. FALLBACK PATH: DB Authorization
    const video = await this.db.video.findFirst({
      where: { videoId },
      select: { videoKey: true, id: true, status: true, videoId: true },
    });

    if (!video) throw new HttpException('Key not found', HttpStatus.NOT_FOUND);

    const isAbleToAccess = await this.ableToAccessFile(
      video.videoId,
      req,
      video.id,
    );

    if (!isAbleToAccess) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    // 4. GENERATE NEW TOKEN
    const encryptedKey = this.encryptKey(video.videoKey);
    const newToken = jwt.sign(
      { videoId, encryptedKey },
      tokenSecret,
      { expiresIn: '30m' }, // Rotates every 30 mins
    );

    // 5. SET COOKIE (Scoped safely to prevent multi-tab overwrites)
    res.cookie('videoToken', newToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      domain: '.nasagampaha.com', // Set your domain here
      path: '/', // Only sends this cookie on requests to THIS specific video ID
      maxAge: 30 * 60 * 1000,
    });

    // 6. SERVE KEY
    const buffer = Buffer.from(video.videoKey, 'hex');
    res.set('Content-Type', 'application/octet-stream');
    return res.send(buffer);
  }

  // --- AUTHORIZATION CHECK ---
  async ableToAccessFile(
    videoId: string,
    req: Request,
    videoPrimaryId: number,
  ) {
    // 1. Admins have universal access
    if (req.isAdmin) return true;

    // 2. Teacher Owner Check
    if (req.isTeacher && req.teacherId) {
      const videRecord = await this.db.video.findFirst({
        where: {
          videoId: videoId,
          teacherId: req.teacherId,
        },
      });
      if (videRecord) return true;
    }

    // 3. Student Enrollment Check
    if (req.isStudent && req.studentId) {
      // 3. Free First Section Check (No enrollment required)
      const isFreeFile = await this.db.classContent.findFirst({
        where: {
          sectionId: 1,
          videoId: videoPrimaryId,
          class: { firstSectionFreeApplied: true },
        },
        select: { contentId: true }, // Lightweight select
      });

      if (isFreeFile) return true;

      // 4. Enrolled Student Check
      const whereClause = {
        studentId: req.studentId,
        createdAt: { lt: new Date() },

        OR: [
          // Scenario A: Enrollment is active (unexpired), and the class has the file
          {
            expiresAt: { gt: new Date() },
            classPricePlan: {
              classes: {
                some: {
                  class: {
                    contents: {
                      some: { videoId: videoPrimaryId },
                    },
                  },
                },
              },
            },
          },
          // Scenario B: Enrollment might be expired, but the SPECIFIC class containing the file is active forever
          {
            classPricePlan: {
              classes: {
                some: {
                  class: {
                    isActiveForever: true,
                    contents: {
                      some: { videoId: videoPrimaryId },
                    },
                  },
                },
              },
            },
          },
        ],
      };

      const enrollmentCount = await this.db.classEnrollment.count({
        where: whereClause,
      });

      return enrollmentCount > 0;
    }

    return false; // Default deny
  }
}
