/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  HttpException,
  HttpStatus,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import jwt from 'jsonwebtoken';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class VideoKeyAuthMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const userAgent = req.headers['user-agent'] || '';
    const authHeader = req.headers['authorization'];
    const cookieToken = (req as any).cookies?.accessToken;

    // Detect if it's a mobile device (Phone/Tablet)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(userAgent);

    let accessToken: string | undefined;

    if (isMobile) {
      // MOBILE: Accept either Header OR Cookie (favoring cookie for native players)
      accessToken = authHeader?.startsWith('Bearer ')
        ? authHeader.split(' ')[1]
        : cookieToken
          ? decodeURIComponent(cookieToken)
          : undefined;
    } else {
      // DESKTOP: Strictly require the Authorization Header
      // This is where IDM and VDH will fail because they don't inject headers.
      if (authHeader?.startsWith('Bearer ')) {
        accessToken = authHeader.split(' ')[1];
      }
    }

    if (!accessToken) {
      throw new HttpException(
        'Unauthorized: Missing valid token for this device',
        HttpStatus.UNAUTHORIZED,
      );
    }

    // MANDATORY: Extra safety layers for both
    const referer = req.headers['referer'];
    const allowedReferers = [
      process.env.FRONTEND_URL,
      'nasagampaha.com',
      'deamoz.com',
      'http://localhost:3001',
    ].filter((value): value is string => Boolean(value));
    if (
      !referer ||
      !allowedReferers.some((allowed) => referer.includes(allowed))
    ) {
      throw new HttpException(
        'Forbidden: Invalid Referer' + `(Received: ${referer})`,
        HttpStatus.FORBIDDEN,
      );
    }

    jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET || 'default_access_token_secret',
      (err, decoded: any) => {
        if (err)
          throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);

        req.userId = decoded.userId;
        req.email = decoded.email;
        req.isAdmin = decoded.isAdmin;
        req.isStudent = decoded.isStudent;
        req.isTeacher = decoded.isTeacher;
        req.studentId = decoded.studentId;
        req.teacherId = decoded.teacherId;
        req.adminId = decoded.adminId;

        next();
      },
    );
  }
}
