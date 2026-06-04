import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ChangeRoleDto } from '../dto/change-role.js';
import { DatabaseService } from '../../../database/database.service.js';
import { Request } from 'express';

@Injectable()
export class ChangeRole {
  constructor(private readonly db: DatabaseService) {}

  async changeRole(changeRole: ChangeRoleDto, req: Request) {
    const { userId, isAdmin, isStudent, isTeacher } = changeRole;
    if (req.userId === userId) {
      throw new HttpException(
        'You cannot change your own role',
        HttpStatus.FORBIDDEN,
      );
    }

    if (!isAdmin && !isStudent && !isTeacher) {
      throw new HttpException(
        'User must have at least one role',
        HttpStatus.BAD_REQUEST,
      );
    }

    const admin = await this.db.user.findUnique({
      where: { userId: req.userId },
      select: { isAdmin: true },
    });

    if (!admin?.isAdmin) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    const existingUser = await this.db.user.findUnique({
      where: { userId: userId },
      select: { userId: true, isAdmin: true, isStudent: true, isTeacher: true },
    });

    if (!existingUser) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const user = await this.db.user.update({
      where: { userId: userId },
      data: {
        isAdmin,
        isStudent,
        isTeacher,
        // if already has profile, do not create new one
        studentProfile: existingUser.isStudent
          ? isStudent
            ? {} // still student, keep
            : { delete: true } // remove profile
          : isStudent
            ? { create: {} } // create new
            : undefined, // do nothing

        teacherProfile: existingUser.isTeacher
          ? isTeacher
            ? {} // still teacher
            : { delete: true }
          : isTeacher
            ? { create: {} }
            : undefined,

        adminProfile: existingUser.isAdmin
          ? isAdmin
            ? {} // still admin
            : { delete: true }
          : isAdmin
            ? { create: {} }
            : undefined,
      },
      select: {
        userId: true,
        email: true,
        name: true,
        phone: true,
        gender: true,
        createdAt: true,
        updatedAt: true,
        isAdmin: true,
        isStudent: true,
        isTeacher: true,
      },
    });
    return user;
  }

  test(req: Request) {
    console.log(req.ip);
    console.log(req.headers);
    return { message: 'Test endpoint working', ip: req.ip };
  }
}
