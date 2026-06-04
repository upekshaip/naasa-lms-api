import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreatePricePlanDto } from '../dto/create-price-plan.js';
import { UpdatePricePlanDto } from '../dto/update-price-plan.js';
import { DatabaseService } from '../../../database/database.service.js';
import { Request } from 'express';
import { GetAllPricePlanDto } from '../dto/get-all-price-plans.js';

@Injectable()
export class PricePlansService {
  constructor(private readonly db: DatabaseService) {}

  async createPricePlan(createPricePlanDto: CreatePricePlanDto, req: Request) {
    if (!req.isTeacher || !req.teacherId) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    // if admin
    if (req.isAdmin && req.isTeacher) {
      const teacher = await this.db.teacherProfile.findUnique({
        where: { teacherId: createPricePlanDto.teacherId || req.teacherId },
      });
      if (!teacher) {
        throw new HttpException('Teacher not found', HttpStatus.NOT_FOUND);
      }
      const newPlan = await this.db.classPricePlan.create({
        data: {
          ...createPricePlanDto,
          creatorId: req.teacherId,
          teacherId: teacher.teacherId,
          isAdminApproved: 'approved',
          status: 'active',
          approvedAdminId: req.adminId,
        },
      });
      return newPlan;
    }
    // if teacher
    if (!req.isAdmin && req.isTeacher) {
      const hasPriviladgeToCreateWithoutApproval =
        await this.db.teacherProfile.findUnique({
          where: { teacherId: req.teacherId },
          select: { canCreatePlan: true },
        });

      let isAdminAdminApproved: 'approved' | 'pending' = 'pending';
      let approvedAdminId: number | undefined = undefined;
      let status: 'active' | 'pending' = 'pending';

      if (hasPriviladgeToCreateWithoutApproval?.canCreatePlan) {
        const defaultAdmin = await this.db.user.findFirst({
          where: {
            email: process.env.DEFAULT_ADMIN_EMAIL,
          },
          select: {
            adminProfile: {
              select: {
                adminId: true,
              },
            },
          },
        });
        if (!defaultAdmin || !defaultAdmin.adminProfile) {
          throw new HttpException(
            'Default admin not found',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }
        isAdminAdminApproved = 'approved';
        approvedAdminId = defaultAdmin.adminProfile.adminId;
        status = 'active';
      }

      const newPlanByTeacher = await this.db.classPricePlan.create({
        data: {
          ...createPricePlanDto,
          creatorId: req.teacherId,
          teacherId: req.teacherId,
          isAdminApproved: isAdminAdminApproved,
          approvedAdminId: approvedAdminId,
          status: status,
        },
      });
      return newPlanByTeacher;
    }
  }

  async findAll(query: GetAllPricePlanDto) {
    const all = await this.db.classPricePlan.findMany({
      where: {
        ...(query.status
          ? { status: query.status }
          : { OR: [{ status: 'active' }, { status: 'pending' }] }),
        ...(query.teacherId ? { creatorId: query.teacherId } : {}),
      },
    });
    return all;
  }

  async findOne(slug: string) {
    const plan = await this.db.classPricePlan.findUnique({
      where: { slug: slug },
    });
    if (!plan) {
      throw new HttpException('Price plan not found', HttpStatus.NOT_FOUND);
    }
    return plan;
  }

  /**
   * Note that: if the admin changes the teacherId of a price plan, all of the linked classes will be unlinked automatically. (Reason: different teacher)
   *
   * Unlink all classes connected to a price plan
   * when their teacherId does not match the plan's new teacherId.
   */
  async unlinkTeacherFromPricePlans(
    existingPlanId: number,
    newTeacherId: number,
  ) {
    const linkedClasses = await this.db.classPricePlanConnection.findMany({
      where: { pricePlanId: existingPlanId },
      include: { class: true },
    });
    const invalidLinks = linkedClasses.filter(
      (link) => link.class?.teacherId !== newTeacherId,
    );
    if (invalidLinks.length > 0) {
      const classIdsToUnlink = invalidLinks.map((l) => l.classId);
      await this.db.classPricePlanConnection.deleteMany({
        where: {
          pricePlanId: existingPlanId,
          classId: { in: classIdsToUnlink },
        },
      });
    }

    return invalidLinks.length;
  }

  async updatePricePlan(
    slug: string,
    updatePricePlanDto: UpdatePricePlanDto,
    req: Request,
  ) {
    if (!req.isTeacher || !req.teacherId) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    const existingPlan = await this.db.classPricePlan.findUnique({
      where: { slug: slug },
      select: {
        id: true,
        teacherId: true,
        teacher: {
          select: { canEditPlan: true, teacherId: true },
        },
      },
    });
    if (!existingPlan) {
      throw new HttpException('Price plan not found', HttpStatus.NOT_FOUND);
    }

    // if admin
    if (req.isAdmin && req.isTeacher) {
      if (updatePricePlanDto.teacherId) {
        const teacher = await this.db.teacherProfile.findUnique({
          where: { teacherId: updatePricePlanDto.teacherId },
        });
        if (!teacher) {
          throw new HttpException('Teacher not found', HttpStatus.NOT_FOUND);
        }
        if (updatePricePlanDto.teacherId !== existingPlan.teacherId) {
          await this.unlinkTeacherFromPricePlans(
            existingPlan.id,
            updatePricePlanDto.teacherId,
          );
        }
      }

      const updatedPlanByAdmin = await this.db.classPricePlan.update({
        where: { slug: slug },
        data: {
          ...updatePricePlanDto,
          isAdminApproved: 'approved',
          approvedAdminId: req.teacherId,
        },
      });
      return updatedPlanByAdmin;
    }

    // if teacher
    if (req.teacherId === existingPlan.teacherId) {
      // teacher cannot update teacherId
      const { teacherId, ...rest } = updatePricePlanDto;

      let isAdminAdminApproved: 'approved' | 'pending' = 'pending';
      let approvedAdminId: number | undefined = undefined;
      let status: 'active' | 'pending' = 'pending';

      if (existingPlan.teacher?.canEditPlan) {
        const defaultAdmin = await this.db.user.findFirst({
          where: {
            email: process.env.DEFAULT_ADMIN_EMAIL,
          },
          select: {
            adminProfile: {
              select: {
                adminId: true,
              },
            },
          },
        });
        if (!defaultAdmin || !defaultAdmin.adminProfile) {
          throw new HttpException(
            'Default admin not found',
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
        }

        isAdminAdminApproved = 'approved';
        approvedAdminId = defaultAdmin.adminProfile.adminId;
        status = 'active';
      }

      const updatedPlanByTeacher = await this.db.classPricePlan.update({
        where: { slug: slug },
        data: {
          ...rest,
          approvedAdminId: approvedAdminId,
          isAdminApproved: isAdminAdminApproved,
          status: status,
        },
      });
      return updatedPlanByTeacher;
    } else {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
  }

  async remove(slug: string, req: Request) {
    const existingPlan = await this.db.classPricePlan.findFirst({
      where: { slug: slug, OR: [{ status: 'active' }, { status: 'pending' }] },
    });
    if (!existingPlan) {
      throw new HttpException('Price plan not found', HttpStatus.NOT_FOUND);
    }
    // if admin or owner teacher
    if (req.teacherId === existingPlan.teacherId || req.isAdmin) {
      await this.db.classPricePlanConnection.deleteMany({
        where: { pricePlanId: existingPlan.id },
      });

      const achived = await this.db.classPricePlan.update({
        where: { slug: slug },
        data: { status: 'archived' },
      });
      return achived;
    }
    // forbidden
    else {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
  }
}
