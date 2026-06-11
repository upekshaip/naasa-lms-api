import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { UserFilterDto } from '../dto/student-filter.dto.js';
import { DatabaseService } from '../../../../database/database.service.js';
import { Prisma } from '../../../../../generated/prisma/client.js';
import { hashPassword } from '../../../../utils/bcrypt.js';
import { UpdateTeacherPermissionDto } from '../dto/update-teacher-permission.dto.js';
import { UpdateUserPasswordDto } from '../dto/update-user-password.dto.js';
import { UpdateUserRolesDto } from '../dto/update-user-roles.dto.js';
import { UpdateUserBlockDto } from '../dto/update-user-block.dto.js';
import { UpdateUserDto } from '../dto/update-user.dto.js';
import { ActiveUserFilterDto } from '../dto/active-student-filter.dto.js';

@Injectable()
export class UserManagementService {
  constructor(private readonly db: DatabaseService) {}

  userSelectCommonFields = {
    userId: true,
    name: true,
    email: true,
    phone: true,
    gender: true,
    createdAt: true,
    isBlocked: true,
    isAdmin: true,
    isStudent: true,
    isTeacher: true,
    lastLoginAt: true,
    device: true,
    dob: true,
    address: true,
    studentProfile: {
      select: {
        studentId: true,
      },
    },
    teacherProfile: {
      select: {
        teacherId: true,
        canCreatePlan: true,
        canEditPlan: true,
        canBroadcastMessage: true,
        canBroadcastSMS: true,
        maxMonthlyClasslimit: true,
        maxOnetimeClasslimit: true,
        maxPricePlanLimit: true,
        maxVideoStorageLimit: true,
        maxMediaStorageLimit: true,
      },
    },
    adminProfile: {
      select: {
        adminId: true,
      },
    },
  };

  async ckeckIfDefaultAdmin(userId: number) {
    const defaultAdmin = await this.db.user.findUnique({
      where: { email: process.env.DEFAULT_ADMIN_EMAIL || '' },
      select: {
        userId: true,
        email: true,
      },
    });
    if (userId === defaultAdmin?.userId) {
      throw new HttpException(
        'Cannot modify default admin user',
        HttpStatus.FORBIDDEN,
      );
    }
  }

  async getStudentStats() {
    const now = new Date();

    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [totalStudents, activeStudents, newStudents] = await Promise.all([
      this.db.user.count({
        where: { isStudent: true },
      }),
      this.db.user.count({
        where: {
          isStudent: true,
          lastLoginAt: { gte: twentyFourHoursAgo },
        },
      }),
      this.db.user.count({
        where: {
          isStudent: true,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
    ]);

    return {
      totalStudents,
      activeStudents,
      newStudents,
    };
  }

  async getStudents(req: Request, query: UserFilterDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = query.search ? query.search.trim() : null;
    const isBlocked = query.isBlocked;
    const userType = query.userType;

    const whereClause: Prisma.UserWhereInput = {
      isStudent: true,
    };
    if (userType) {
      if (userType === 'teacher') {
        whereClause.isTeacher = true;
      } else if (userType === 'admin') {
        whereClause.isAdmin = true;
      } else {
        whereClause.isStudent = true;
      }
    }

    if (isBlocked !== undefined) {
      whereClause.isBlocked = String(isBlocked) === 'true';
    }

    if (query.joinedWithinDays) {
      const joinedAfter = new Date(
        Date.now() - 24 * 60 * 60 * 1000 * Number(query.joinedWithinDays),
      );
      whereClause.createdAt = { gte: joinedAfter };
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [students, totalCount] = await Promise.all([
      this.db.user.findMany({
        where: whereClause,
        skip: offset,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        select: this.userSelectCommonFields,
      }),
      this.db.user.count({
        where: whereClause,
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: students,
      meta: {
        totalItems: totalCount,
        itemCount: students.length,
        itemsPerPage: limit,
        totalPages: totalPages,
        currentPage: page,
      },
    };
  }
  async getActiveUsers(req: Request, query: ActiveUserFilterDto) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = query.search ? query.search.trim() : null;
    const userType = query.userType;
    const duration = query.duration || 1;

    const now = new Date();
    const durationAgo = new Date(
      now.getTime() - 24 * 60 * 60 * 1000 * duration,
    );

    const whereClause: Prisma.UserWhereInput = {
      isStudent: true,
      lastLoginAt: { gte: durationAgo },
    };
    if (userType) {
      if (userType === 'teacher') {
        whereClause.isTeacher = true;
      } else if (userType === 'admin') {
        whereClause.isAdmin = true;
      } else {
        whereClause.isStudent = true;
      }
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [students, totalCount] = await Promise.all([
      this.db.user.findMany({
        where: whereClause,
        skip: offset,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        select: this.userSelectCommonFields,
      }),
      this.db.user.count({
        where: whereClause,
      }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return {
      data: students,
      meta: {
        totalItems: totalCount,
        itemCount: students.length,
        itemsPerPage: limit,
        totalPages: totalPages,
        currentPage: page,
      },
    };
  }

  // Quick teacher search for admin selectors (name/email), active teachers only
  async searchTeachers(q: string) {
    const query = q ? q.trim() : '';
    if (!query) return [];
    return this.db.teacherProfile.findMany({
      where: {
        status: 'active',
        user: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { email: { contains: query, mode: 'insensitive' } },
          ],
        },
      },
      select: {
        teacherId: true,
        user: { select: { name: true, email: true } },
      },
      take: 10,
    });
  }

  // Teacher summary (by teacherId) for the admin teacher-inspection hub
  async getTeacherById(teacherId: number) {
    const teacher = await this.db.teacherProfile.findUnique({
      where: { teacherId },
      select: {
        teacherId: true,
        status: true,
        canCreatePlan: true,
        canEditPlan: true,
        maxMonthlyClasslimit: true,
        maxOnetimeClasslimit: true,
        maxPricePlanLimit: true,
        maxMediaStorageLimit: true,
        user: {
          select: { userId: true, name: true, email: true, phone: true },
        },
      },
    });
    if (!teacher) {
      throw new HttpException('Teacher not found', HttpStatus.NOT_FOUND);
    }
    return teacher;
  }

  async getUserDetails(userId: number) {
    const user = await this.db.user.findUnique({
      where: { userId: userId },
      select: this.userSelectCommonFields,
    });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // For teachers, attach current usage so the admin UI can show usage vs limits
    const teacherId = user.teacherProfile?.teacherId;
    if (user.isTeacher && teacherId) {
      const [monthlyClasses, onetimeClasses, pricePlans, mediaAgg] =
        await Promise.all([
          this.db.class.count({
            where: {
              teacherId,
              classType: 'monthly',
              status: { not: 'archived' },
            },
          }),
          this.db.class.count({
            where: {
              teacherId,
              classType: 'onetime',
              status: { not: 'archived' },
            },
          }),
          this.db.classPricePlan.count({
            where: { teacherId, status: { not: 'archived' } },
          }),
          this.db.media.aggregate({
            _sum: { fileSize: true },
            where: { teacherId },
          }),
        ]);

      return {
        ...user,
        teacherUsage: {
          monthlyClasses,
          onetimeClasses,
          pricePlans,
          mediaStorageBytes: mediaAgg._sum.fileSize
            ? Number(mediaAgg._sum.fileSize)
            : 0,
        },
      };
    }

    return user;
  }

  async updateUserDetails(userId: number, updateUser: UpdateUserDto) {
    await this.ckeckIfDefaultAdmin(userId);
    const myuser = await this.db.user.findUnique({
      where: { email: updateUser.email },
    });
    if (myuser && myuser.userId !== userId) {
      throw new HttpException('Email already in use', HttpStatus.BAD_REQUEST);
    }

    const user = await this.db.user.update({
      where: { userId },
      data: updateUser,
      select: this.userSelectCommonFields,
    });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  async expireUserPassword(userId: number) {
    await this.ckeckIfDefaultAdmin(userId);
    const user = await this.db.user.update({
      where: { userId },
      data: {
        password: null,
      },
      select: this.userSelectCommonFields,
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }

  async changeUserPassword(userId: number, pwdDto: UpdateUserPasswordDto) {
    await this.ckeckIfDefaultAdmin(userId);
    if (!pwdDto.password) {
      throw new HttpException('Password is required', HttpStatus.BAD_REQUEST);
    }

    const hashedPassword = await hashPassword(pwdDto.password);

    const user = await this.db.user.update({
      where: { userId },
      data: {
        password: hashedPassword,
      },
      select: this.userSelectCommonFields,
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return user;
  }

  async blockUnblockUser(userId: number, blockDto: UpdateUserBlockDto) {
    await this.ckeckIfDefaultAdmin(userId);
    const user = await this.db.user.update({
      where: { userId },
      data: {
        isBlocked: blockDto.isBlocked,
      },
      select: this.userSelectCommonFields,
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return user;
  }

  async changeUserRoles(userId: number, dto: UpdateUserRolesDto) {
    await this.ckeckIfDefaultAdmin(userId);
    const user = await this.db.user.findUnique({
      where: { userId },
      select: this.userSelectCommonFields,
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // EARLY EXITS: Prevent unnecessary database writes if the user is already in the exact requested state
    if (
      dto.role === 'student' &&
      user.isStudent &&
      !user.isTeacher &&
      !user.isAdmin
    ) {
      return user;
    }

    if (
      dto.role === 'teacher' &&
      user.isStudent &&
      user.isTeacher &&
      !user.isAdmin &&
      user.teacherProfile?.teacherId
    ) {
      return user;
    }

    if (
      dto.role === 'admin' &&
      user.isStudent &&
      user.isTeacher &&
      user.isAdmin &&
      user.teacherProfile?.teacherId &&
      user.adminProfile?.adminId
    ) {
      return user;
    }

    // Handle role changes and profile unlinking safely
    if (dto.role === 'student') {
      if (user.teacherProfile?.teacherId) {
        await this.db.teacherProfile.update({
          where: { teacherId: user.teacherProfile.teacherId },
          data: { status: 'deleted', userId: null },
        });
      }

      if (user.adminProfile?.adminId) {
        await this.db.adminProfile.update({
          where: { adminId: user.adminProfile.adminId },
          data: { status: 'deleted', userId: null },
        });
      }

      return await this.db.user.update({
        where: { userId },
        data: {
          isStudent: true,
          isTeacher: false,
          isAdmin: false,
        },
        select: this.userSelectCommonFields,
      });
    } else if (dto.role === 'teacher') {
      if (user.adminProfile?.adminId) {
        await this.db.adminProfile.update({
          where: { adminId: user.adminProfile.adminId },
          data: { status: 'deleted', userId: null },
        });
      }

      return await this.db.user.update({
        where: { userId },
        data: {
          isStudent: true,
          isTeacher: true,
          isAdmin: false,
          teacherProfile: {
            upsert: {
              create: { status: 'active' },
              update: { status: 'active' },
            },
          },
        },
        select: this.userSelectCommonFields,
      });
    } else if (dto.role === 'admin') {
      return await this.db.user.update({
        where: { userId },
        data: {
          isStudent: true,
          isTeacher: true,
          isAdmin: true,
          teacherProfile: {
            upsert: {
              create: { status: 'active' },
              update: { status: 'active' },
            },
          },
          adminProfile: {
            upsert: {
              create: { status: 'active' },
              update: { status: 'active' },
            },
          },
        },
        select: this.userSelectCommonFields,
      });
    }
  }

  async setTeacherPermissions(
    userId: number,
    permissions: UpdateTeacherPermissionDto,
  ) {
    await this.ckeckIfDefaultAdmin(userId);
    const user = await this.db.user.update({
      where: { userId, isTeacher: true },
      data: {
        teacherProfile: {
          update: {
            canBroadcastMessage: permissions.canBroadcastMessage,
            canCreatePlan: permissions.canCreatePlan,
            canEditPlan: permissions.canEditPlan,
            canBroadcastSMS: permissions.canBroadcastSMS,
            maxMonthlyClasslimit: permissions.maxMonthlyClasslimit,
            maxOnetimeClasslimit: permissions.maxOnetimeClasslimit,
            maxPricePlanLimit: permissions.maxPricePlanLimit,
            maxVideoStorageLimit: permissions.maxVideoStorageLimit,
            maxMediaStorageLimit: permissions.maxMediaStorageLimit,
          },
        },
      },
    });
    if (!user) {
      throw new HttpException('Teacher not found', HttpStatus.NOT_FOUND);
    }
    return user;
  }
}
