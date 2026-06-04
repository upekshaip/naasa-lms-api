import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Prisma } from '../../../generated/prisma/client.js';
import { DatabaseService } from '../../database/database.service.js';
import { comparePassword, hashPassword } from '../../utils/bcrypt.js';
import { Request } from 'express';

@Injectable()
export class UsersService {
  constructor(private readonly db: DatabaseService) {}

  async create(createUserDto: Prisma.UserCreateInput) {
    if (!createUserDto.password) {
      throw new HttpException('Password is required', HttpStatus.BAD_REQUEST);
    }

    const isInDb = await this.db.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (isInDb) {
      throw new HttpException('User already exists', HttpStatus.CONFLICT);
    }
    const hashed = await hashPassword(createUserDto.password);
    const user = await this.db.user.create({
      data: {
        ...createUserDto,
        password: hashed,
        isStudent: true,
        studentProfile: {
          create: {},
        },
      },
      select: {
        userId: true,
        email: true,
        name: true,
        phone: true,
        gender: true,
        dob: true,
        address: true,
        createdAt: true,
        updatedAt: true,
        isAdmin: true,
        isStudent: true,
        isTeacher: true,
        studentProfile: true,
        teacherProfile: true,
        adminProfile: true,
      },
    });
    return user;
  }

  async findAll() {
    return await this.db.user.findMany({
      select: {
        userId: true,
        email: true,
        name: true,
        phone: true,
        gender: true,
        dob: true,
        address: true,
        createdAt: true,
        updatedAt: true,
        isAdmin: true,
        isStudent: true,
        isTeacher: true,
        studentProfile: true,
        teacherProfile: true,
        adminProfile: true,
      },
    });
  }

  async getMyDetails(req: Request) {
    const user = await this.db.user.findUnique({
      where: { userId: req.userId },
      select: {
        userId: true,
        email: true,
        name: true,
        phone: true,
        gender: true,
        dob: true,
        address: true,
        createdAt: true,
        updatedAt: true,
        isAdmin: true,
        isStudent: true,
        isTeacher: true,
        studentProfile: true,
        teacherProfile: true,
        adminProfile: true,
      },
    });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  async remove(userId: number) {
    const user = await this.db.user.findUnique({
      where: { userId },
    });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    if (user.isAdmin) {
      throw new HttpException(
        'Admin user cannot be deleted',
        HttpStatus.FORBIDDEN,
      );
    }
    return this.db.user.delete({
      where: { userId },
    });
  }
}
