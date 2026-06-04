import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { SignupDto } from './dto/signup.js';
import { LoginDto } from './dto/login.js';
import { Prisma } from '../../../generated/prisma/client.js';
import { DatabaseService } from '../../database/database.service.js';
import { comparePassword, hashPassword } from '../../utils/bcrypt.js';
import { getNewAccessToken, issueJWT } from '../../utils/jwt.js';
// import { GoogleSpreadSheetService } from '../../utils/google-spreadsheet.js';
import { RefreshUserDto } from './dto/refresh-token.js';
import { Request } from 'express';
import { UpdateUserDto } from './dto/update-user.js';
import { ChangePasswordDto } from './dto/change-password.js';
import { EmailsService } from '../emails/emails.service.js';
import { ResetPasswordDto } from './dto/reset-password.js';
import { randomUUID } from 'node:crypto';
import { UpdatePasswordDto } from './dto/update-password.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    // private readonly googleSheets: GoogleSpreadSheetService,
    private readonly emailsService: EmailsService,
  ) {}

  async signup(signupDto: SignupDto) {
    const isInDb = await this.db.user.findUnique({
      where: { email: signupDto.email },
    });
    if (isInDb) {
      throw new HttpException('User already exists', HttpStatus.CONFLICT);
    }
    const hashed = await hashPassword(signupDto.password);
    const user = await this.db.user.create({
      data: {
        email: signupDto.email,
        name: null,
        gender: null,
        device: signupDto.device,
        phone: null,
        dob: null,
        address: null,
        password: hashed,
        isStudent: true, // Set to true for new users
        lastLoginAt: new Date(),
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
        device: true,
        address: true,
        createdAt: true,
        updatedAt: true,
        studentProfile: true,
        teacherProfile: true,
        adminProfile: true,
        isStudent: true,
        isTeacher: true,
        isAdmin: true,
      },
    });
    const loggedUser = await this.login({
      email: signupDto.email,
      password: signupDto.password,
      device: signupDto.device,
    });
    return loggedUser;
  }

  async signupUpdate(signupUpdateDto: Prisma.UserUpdateInput, req: Request) {
    if (req.email && req.email !== signupUpdateDto.email) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const userToUpdate = await this.db.user.findFirst({
      where: {
        email: signupUpdateDto.email as string,
      },
    });

    if (!userToUpdate) {
      throw new HttpException(
        'User already signed up or not found',
        HttpStatus.NOT_FOUND,
      );
    }

    const dob = signupUpdateDto.dob
      ? new Date(signupUpdateDto.dob as string)
      : null;

    if (dob && dob > new Date()) {
      throw new HttpException('Invalid date of birth', HttpStatus.BAD_REQUEST);
    }

    const user = await this.db.user.update({
      where: {
        email: signupUpdateDto.email as string,
      },
      data: {
        name: signupUpdateDto.name,
        phone: signupUpdateDto.phone,
        gender: signupUpdateDto.gender,
        dob: dob,
        address: signupUpdateDto.address,
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
        studentProfile: true,
        teacherProfile: true,
        adminProfile: true,
        isStudent: true,
        isTeacher: true,
        isAdmin: true,
      },
    });
    // await this.googleSheets.writeToUsers({
    //   createdAt: user.createdAt.toISOString(),
    //   userId: user.userId,
    //   name: user.name,
    //   email: user.email,
    //   phone: user.phone,
    //   gender: user.gender,
    // });

    // send welcome email
    await this.emailsService.sendWelcomeEmail(user.email, user.name || 'User');
    return user;
  }

  async login(loginDto: LoginDto) {
    const user = await this.db.user.findFirst({
      where: { email: loginDto.email },
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
        password: true,
        isAdmin: true,
        isStudent: true,
        isTeacher: true,
        studentProfile: true,
        teacherProfile: true,
        adminProfile: true,
      },
    });
    if (!user) {
      throw new HttpException(
        'Email or Password is incorrect',
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (user.password === null) {
      await this.sendPasswordResetEmail({ email: user.email });
      throw new HttpException('passwordExpired', HttpStatus.BAD_REQUEST);
    }

    const isPasswordValid = await comparePassword(
      loginDto.password,
      user.password || '',
    );
    const { password, ...filtered } = user;
    if (user && user.email === loginDto.email && isPasswordValid) {
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
      const updated = await this.db.user.update({
        where: { userId: user.userId },
        data: {
          refreshToken: refreshToken,
          lastLoginAt: new Date(),
          device: loginDto.device,
        },
        select: {
          userId: true,
          email: true,
          name: true,
          phone: true,
          gender: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      if (!updated) {
        throw new HttpException(
          'Error updating refresh token',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
      const mod = { ...filtered, accessToken: accessToken };
      return { mod, refreshToken, accessToken };
    } else {
      throw new HttpException(
        'Email or Password is incorrect',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }

  async getAccessToken(refreshUserInfo: RefreshUserDto, req: Request) {
    const accessToken = req.headers.authorization?.split(' ')[1];
    if (!req.cookies) {
      throw new HttpException('Enable Cookies', HttpStatus.BAD_REQUEST);
    }
    if (!accessToken) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    if (!req.cookies) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    if (req.cookies && !req.cookies['jwt']) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
    const refreshToken = req.cookies['jwt'] as string;

    const newAccessToken = await getNewAccessToken(
      refreshUserInfo.userId,
      refreshToken,
      this.db,
    );
    return {
      userId: refreshUserInfo.userId,
      accessToken: newAccessToken,
      refreshToken: refreshToken,
    };
  }

  async updateByUser(updateUserDto: UpdateUserDto, req: Request) {
    if (!req.userId) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
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

    // future: change emails
    if (req.email !== updateUserDto.email) {
      const isEmailExists = await this.db.user.findUnique({
        where: { email: updateUserDto.email },
      });
      if (isEmailExists && isEmailExists.userId !== req.userId) {
        throw new HttpException(
          'Email already exists. Choose another one.',
          HttpStatus.CONFLICT,
        );
      }
    }

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

    const data = await this.db.user.update({
      where: { userId: req.userId },
      data: {
        ...updateUserDto,
        dob: updateUserDto.dob ? new Date(updateUserDto.dob) : null,
        address: updateUserDto.address || null,
        refreshToken: refreshToken,
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

    return {
      user: data,
      refreshToken: refreshToken,
      accessToken: accessToken,
    };
  }

  async changePasswordByUser(
    changePasswordDto: ChangePasswordDto,
    req: Request,
  ) {
    console.log(req);
    if (!(req.email === changePasswordDto.email)) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    if (changePasswordDto.newPassword !== changePasswordDto.confirmPassword) {
      throw new HttpException('Passwords do not match', HttpStatus.BAD_REQUEST);
    }
    const user = await this.db.user.findUnique({
      where: { userId: req.userId, email: changePasswordDto.email },
    });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    const isMatch = await comparePassword(
      changePasswordDto.oldPassword,
      user.password || '',
    );

    if (!isMatch) {
      throw new HttpException(
        'Old password does not match',
        HttpStatus.BAD_REQUEST,
      );
    }
    const newHash = await hashPassword(changePasswordDto.newPassword);
    return await this.db.user.update({
      where: { userId: req.userId },
      data: { password: newHash },
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
        studentProfile: true,
        teacherProfile: true,
        adminProfile: true,
      },
    });
  }

  async sendPasswordResetEmail(resetPasswordDto: ResetPasswordDto) {
    if (!resetPasswordDto.email) {
      throw new HttpException('Email is required', HttpStatus.BAD_REQUEST);
    }
    const user = await this.db.user.findUnique({
      where: { email: resetPasswordDto.email },
    });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    // check if there's already a valid token for this user and delete it
    const existingToken = await this.db.passwordResetToken.findFirst({
      where: {
        email: user.email,
      },
    });
    if (existingToken) {
      await this.db.passwordResetToken.delete({
        where: { email: resetPasswordDto.email },
      });
    }

    // UUID
    const resetToken = randomUUID();

    await this.db.passwordResetToken.create({
      data: {
        email: resetPasswordDto.email,
        userId: user.userId,
        token: resetToken,
        expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes expiration
      },
    });

    const res = await this.emailsService.sendPasswordResetEmail(
      user.name || 'User',
      resetPasswordDto.email,
      resetToken,
    );
    if (res === false) {
      throw new HttpException(
        'Failed to send password reset email',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
    return { message: 'EMAIL_SENT' };
  }

  async validatePasswordResetToken(token: string) {
    if (!token) {
      throw new HttpException('Invalid token', HttpStatus.BAD_REQUEST);
    }
    const tokenRecord = await this.db.passwordResetToken.findUnique({
      where: { token },
    });
    if (!tokenRecord) {
      throw new HttpException('Invalid token', HttpStatus.BAD_REQUEST);
    }
    if (tokenRecord.expiresAt < new Date()) {
      throw new HttpException('Token has expired', HttpStatus.BAD_REQUEST);
    }
    return { email: tokenRecord.email, userId: tokenRecord.userId };
  }

  async resetPasswordWithToken(updatePasswordDto: UpdatePasswordDto) {
    const tokenRecord = await this.validatePasswordResetToken(
      updatePasswordDto.token,
    );
    const user = await this.db.user.findUnique({
      where: { userId: tokenRecord.userId },
    });
    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }
    const newHash = await hashPassword(updatePasswordDto.newPassword);
    await this.db.user.update({
      where: { userId: user.userId },
      data: { password: newHash },
    });
    await this.db.passwordResetToken.delete({
      where: { token: updatePasswordDto.token },
    });
    return { message: 'PASSWORD_RESET_SUCCESS', ok: true };
  }
}
