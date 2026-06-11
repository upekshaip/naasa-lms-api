import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { TeacherCreateClassDto } from '../dto/create-class.dto.js';
import { TeacherUpdateClassDto } from '../dto/update-class.dto.js';
import { DatabaseService } from '../../../database/database.service.js';
import { Request } from 'express';

@Injectable()
export class ClassesService {
  constructor(private readonly db: DatabaseService) {}

  async createClass(createClassDto: TeacherCreateClassDto, req: Request) {
    if (!req.isTeacher) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    // if admin
    if (req.isAdmin && req.isTeacher) {
      const teacher = await this.db.teacherProfile.findUnique({
        where: { teacherId: createClassDto.teacherId || req.teacherId },
      });
      if (!teacher) {
        throw new HttpException('Teacher not found', HttpStatus.NOT_FOUND);
      }
      const newClassByAdmin = await this.db.class.create({
        data: {
          ...createClassDto,
          creatorId: req.teacherId,
          teacherId: teacher.teacherId,
        },
      });
      return newClassByAdmin;
    }
    // if teacher
    if (!req.isAdmin && req.isTeacher) {
      // Enforce the teacher's class limit for this class type
      const teacher = await this.db.teacherProfile.findUnique({
        where: { teacherId: req.teacherId },
        select: { maxMonthlyClasslimit: true, maxOnetimeClasslimit: true },
      });
      if (!teacher) {
        throw new HttpException(
          'Teacher profile not found',
          HttpStatus.NOT_FOUND,
        );
      }

      const isMonthly = createClassDto.classType === 'monthly';
      const limit = isMonthly
        ? teacher.maxMonthlyClasslimit
        : teacher.maxOnetimeClasslimit;

      // Count non-archived classes of this type owned by the teacher
      const currentCount = await this.db.class.count({
        where: {
          teacherId: req.teacherId,
          classType: createClassDto.classType,
          status: { not: 'archived' },
        },
      });

      if (currentCount >= limit) {
        throw new HttpException(
          `You have reached your ${isMonthly ? 'monthly' : 'one-time'} class limit (${limit}). Please contact an admin to increase it.`,
          HttpStatus.FORBIDDEN,
        );
      }

      const newClassByTeacher = await this.db.class.create({
        data: {
          ...createClassDto,
          creatorId: req.teacherId,
          teacherId: req.teacherId,
        },
      });
      return newClassByTeacher;
    }
  }

  async findAll() {
    return await this.db.class.findMany({
      include: {
        createdBy: { include: { user: { select: { name: true } } } },
        teacher: { include: { user: { select: { name: true } } } },
        classgroup: true,
      },
    });
  }

  async findOne(slug: string) {
    const classData = await this.db.class.findUnique({
      where: { slug },
      include: {
        teacher: { include: { user: { select: { name: true } } } },
        classPricePlans: { include: { pricePlan: true } },
      },
    });
    if (!classData) {
      throw new HttpException('Class not found', HttpStatus.NOT_FOUND);
    }
    return classData;
  }

  /**
   * Note that: if the admin changes the teacherId of a class, all of the linked price plans will be unlinked automatically. (Reason: different teacher)
   *
   * Unlink all price plans connected to a class
   * when their teacherId does not match the class's new teacherId.
   */
  async unlinkTeacherFromClasses(
    existingClassId: number,
    newTeacherId: number,
  ) {
    const linkedPlans = await this.db.classPricePlanConnection.findMany({
      where: { classId: existingClassId },
      include: { pricePlan: true },
    });

    const invalidLinks = linkedPlans.filter(
      (link) => link.pricePlan?.teacherId !== newTeacherId,
    );

    if (invalidLinks.length > 0) {
      const planIdsToUnlink = invalidLinks.map((l) => l.pricePlanId);
      await this.db.classPricePlanConnection.deleteMany({
        where: {
          classId: existingClassId,
          pricePlanId: { in: planIdsToUnlink },
        },
      });
    }

    return invalidLinks.length;
  }

  async updateClass(
    slug: string,
    updateClassDto: TeacherUpdateClassDto,
    req: Request,
  ) {
    if (!req.isTeacher || !req.teacherId) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    const existingClass = await this.db.class.findUnique({
      where: { slug: slug },
    });
    if (!existingClass) {
      throw new HttpException('Class not found', HttpStatus.NOT_FOUND);
    }

    // if admin
    if (req.isAdmin && req.isTeacher) {
      if (updateClassDto.teacherId) {
        const teacher = await this.db.teacherProfile.findUnique({
          where: { teacherId: updateClassDto.teacherId },
        });
        if (!teacher) {
          throw new HttpException('Teacher not found', HttpStatus.NOT_FOUND);
        }

        // if admin cghanges the teacherId, unlink invalid price plans
        if (updateClassDto.teacherId !== existingClass.teacherId) {
          await this.unlinkTeacherFromClasses(
            existingClass.id,
            updateClassDto.teacherId,
          );
        }
      }
      const updatedByAdmin = await this.db.class.update({
        where: { slug: slug },
        data: { ...updateClassDto },
      });
      return updatedByAdmin;
    }

    // if teacher
    if (req.teacherId === existingClass.teacherId) {
      // teacher cannot update teacherId
      const { teacherId, ...rest } = updateClassDto;
      const updatedClassByTeacher = await this.db.class.update({
        where: { slug: slug },
        data: { ...rest },
      });
      return updatedClassByTeacher;
    } else {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
  }

  async removeClass(slug: string, req: Request) {
    if (!req.isTeacher || !req.teacherId) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    const existingClass = await this.db.class.findUnique({
      where: { slug: slug },
    });
    if (!existingClass) {
      throw new HttpException('Class not found', HttpStatus.NOT_FOUND);
    }

    // if admin or owner teacher
    if (req.teacherId === existingClass.teacherId || req.isAdmin) {
      await this.db.classPricePlanConnection.deleteMany({
        where: { classId: existingClass.id },
      });

      const archived = await this.db.class.update({
        where: { slug: slug },
        data: { status: 'archived' },
      });
      return archived;
    }
    // forbidden
    else {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
  }
}
