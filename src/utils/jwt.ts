/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import {
  HttpException,
  HttpStatus,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
// import { ACCESS_TOKEN_SECRET, REFRESH_TOKEN_SECRET } from './config.js';
import jwt from 'jsonwebtoken';
import { NextFunction, Request } from 'express';
import { DatabaseService } from '../database/database.service.js';

declare module 'express-serve-static-core' {
  interface Request {
    userId?: number;
    email?: string;
    isAdmin?: boolean;
    isStudent?: boolean;
    isTeacher?: boolean;
    studentId?: number;
    teacherId?: number;
    adminId?: number;
  }
}

// this is a middleware (But function / can use anywhere)
export const issueJWT = (
  userId: number,
  email: string,
  isAdmin: boolean,
  isStudent: boolean,
  isTeacher: boolean,
  studentId?: number,
  teacherId?: number,
  adminId?: number,
): { accessToken: string; refreshToken: string } => {
  const accessToken: string = jwt.sign(
    {
      email: email,
      userId: userId,
      isAdmin,
      isStudent,
      isTeacher,
      studentId,
      teacherId,
      adminId,
    },
    process.env.ACCESS_TOKEN_SECRET || 'default_access_token_secret',
    { expiresIn: '30m' },
  );

  const refreshToken: string = jwt.sign(
    {
      email: email,
      userId: userId,
      isAdmin,
      isStudent,
      isTeacher,
      studentId,
      teacherId,
      adminId,
    },
    process.env.REFRESH_TOKEN_SECRET || 'default_refresh_token_secret',
    { expiresIn: '24h' },
  );

  return { accessToken, refreshToken };
};

export const getNewAccessToken = async (
  userId: number,
  clientRefreshToken: string,
  db: DatabaseService,
) => {
  const user = await db.user.findFirst({
    where: { userId: userId },
    select: {
      userId: true,
      email: true,
      isAdmin: true,
      isStudent: true,
      isTeacher: true,
      refreshToken: true,
      studentProfile: true,
      teacherProfile: true,
      adminProfile: true,
    },
  });
  if (!user || !user.refreshToken) {
    throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
  }

  if (user.refreshToken !== clientRefreshToken) {
    throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
  }
  // client side refresh token is valid
  jwt.verify(
    clientRefreshToken,
    process.env.REFRESH_TOKEN_SECRET || 'default_refresh_token_secret',
    (err, decoded) => {
      if (err) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }
      if (userId !== parseInt(decoded.userId as string)) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }
    },
  );
  // server side refresh token is valid
  jwt.verify(
    user.refreshToken,
    process.env.REFRESH_TOKEN_SECRET || 'default_refresh_token_secret',
    (err, decoded) => {
      if (err) {
        throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
      }
    },
  );
  const { accessToken, refreshToken } = issueJWT(
    user.userId,
    user.email,
    user.isAdmin,
    user.isStudent,
    user.isTeacher,
    user.studentProfile?.studentId,
    user.teacherProfile?.teacherId,
    user.adminProfile?.adminId,
  );
  return accessToken;
};

// this is a middleware (added inside app.module.ts - Verify JWT for protected routes)
@Injectable()
export class JWTService implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const authHeader: string | undefined = req.headers['authorization'];
    if (!authHeader) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    const accessToken = authHeader.split(' ')[1];
    if (!accessToken) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET || 'default_access_token_secret',
      (err, decoded) => {
        if (err) {
          throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
        }

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
