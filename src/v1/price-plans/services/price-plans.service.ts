import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreatePricePlanDto } from '../dto/create-price-plan.js';
import { UpdatePricePlanDto } from '../dto/update-price-plan.js';
import { DatabaseService } from '../../../database/database.service.js';
import { Request } from 'express';
import { GetAllPricePlanDto } from '../dto/get-all-price-plans.js';
import { ApprovePricePlanDto } from '../dto/approve-price-plan.dto.js';

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
      const teacher = await this.db.teacherProfile.findUnique({
        where: { teacherId: req.teacherId },
        select: { canCreatePlan: true, maxPricePlanLimit: true },
      });
      if (!teacher) {
        throw new HttpException(
          'Teacher profile not found',
          HttpStatus.NOT_FOUND,
        );
      }

      // canCreatePlan gates plan creation entirely
      if (!teacher.canCreatePlan) {
        throw new HttpException(
          'You do not have permission to create price plans. Please contact an admin.',
          HttpStatus.FORBIDDEN,
        );
      }

      // Enforce the teacher's price-plan limit (non-archived plans count)
      const currentCount = await this.db.classPricePlan.count({
        where: { teacherId: req.teacherId, status: { not: 'archived' } },
      });
      if (currentCount >= teacher.maxPricePlanLimit) {
        throw new HttpException(
          `You have reached your price plan limit (${teacher.maxPricePlanLimit}). Please contact an admin to increase it.`,
          HttpStatus.FORBIDDEN,
        );
      }

      // Teacher-created plans always start pending → admin approval required
      const newPlanByTeacher = await this.db.classPricePlan.create({
        data: {
          ...createPricePlanDto,
          creatorId: req.teacherId,
          teacherId: req.teacherId,
          isAdminApproved: 'pending',
          status: 'pending',
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
      // canEditPlan gates plan editing entirely
      if (!existingPlan.teacher?.canEditPlan) {
        throw new HttpException(
          'You do not have permission to edit price plans. Please contact an admin.',
          HttpStatus.FORBIDDEN,
        );
      }

      // teacher cannot update teacherId; an edit sends the plan back for re-approval
      const { teacherId, ...rest } = updatePricePlanDto;

      const updatedPlanByTeacher = await this.db.classPricePlan.update({
        where: { slug: slug },
        data: {
          ...rest,
          isAdminApproved: 'pending',
          status: 'pending',
          approvedAdminId: null,
        },
      });
      return updatedPlanByTeacher;
    } else {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }
  }

  /**
   * Admin approves or rejects a teacher-submitted price plan.
   * approvedAdminId is taken from the authenticated admin (req.adminId), never the client.
   * Approved plans become "active"; rejected plans are sent back to "pending" so the
   * teacher can revise and resubmit. The owning teacher is notified either way.
   */
  async approvePricePlan(slug: string, dto: ApprovePricePlanDto, req: Request) {
    if (!req.isAdmin || !req.adminId) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    const existingPlan = await this.db.classPricePlan.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        teacher: { select: { user: { select: { userId: true } } } },
      },
    });
    if (!existingPlan) {
      throw new HttpException('Price plan not found', HttpStatus.NOT_FOUND);
    }

    const isApproved = dto.response === 'approved';

    const updatedPlan = await this.db.classPricePlan.update({
      where: { slug },
      data: {
        isAdminApproved: dto.response,
        approvedAdminId: req.adminId,
        status: isApproved ? 'active' : 'pending',
      },
    });

    // Notify the owning teacher
    const teacherUserId = existingPlan.teacher?.user?.userId;
    if (teacherUserId) {
      await this.db.notification.create({
        data: {
          userId: teacherUserId,
          title: 'Price Plan Review Update',
          message: isApproved
            ? `Your price plan "${existingPlan.name}" has been approved and is now active.`
            : `Your price plan "${existingPlan.name}" was rejected. Please review and resubmit it.`,
          url: `/teacher/price-plan-management`,
        },
      });
    }

    return updatedPlan;
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
