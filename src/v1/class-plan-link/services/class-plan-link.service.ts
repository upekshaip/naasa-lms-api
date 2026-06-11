import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { Request } from 'express';

@Injectable()
export class ClassPlanLinkService {
  constructor(private readonly db: DatabaseService) {}

  // for multiple links between class and price plan (single class and multiple price plans)
  // only add the passed price plans, needs to remove all other existing links (only add sending price plans slugs)
  async linkClassToMultiplePricePlans(
    classSlug: string,
    pricePlanSlugs: string[],
    req: Request,
  ) {
    const classData = await this.db.class.findFirst({
      where: { slug: classSlug },
    });
    if (!classData) {
      throw new HttpException('Class not found', HttpStatus.NOT_FOUND);
    }
    // Teacher may only link their own class; admins can link for any teacher.
    if (classData.teacherId !== req.teacherId && !req.isAdmin) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    // check if this is an array of strings
    if (
      !Array.isArray(pricePlanSlugs) ||
      !pricePlanSlugs.every((slug) => typeof slug === 'string')
    ) {
      throw new HttpException(
        'pricePlanSlugs must be an array of strings',
        HttpStatus.BAD_REQUEST,
      );
    }

    const pricePlans = await this.db.classPricePlan.findMany({
      where: { slug: { in: pricePlanSlugs } },
    });

    // Teachers and admins can link; plans must belong to the class's teacher
    // (for a teacher acting on their own class this is the same as req.teacherId).
    if (req.isTeacher || req.isAdmin) {
      for (const pricePlan of pricePlans) {
        if (classData.teacherId !== pricePlan.teacherId) {
          throw new HttpException(
            'Class and Price Plan teacher mismatch',
            HttpStatus.BAD_REQUEST,
          );
        }
        if (pricePlan.isAdminApproved !== 'approved') {
          throw new HttpException(
            'One or more price plans are not approved by admin',
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // remove all existing links for this class
      await this.db.classPricePlanConnection.deleteMany({
        where: {
          classId: classData.id,
        },
      });

      // add only the passed price plans
      await this.db.classPricePlanConnection.createMany({
        data: pricePlans.map((pp) => ({
          classId: classData.id,
          pricePlanId: pp.id,
          teacherId: classData.teacherId,
        })),
        skipDuplicates: true,
      });
      const connections = await this.db.classPricePlanConnection.findMany({
        where: {
          classId: classData.id,
        },
      });
      return connections;
    }

    throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
  }

  // get all plans owned by teacher (only for testing for now)
  async getAllClassPricePlanConnections(req: Request) {
    const allData = await this.db.classPricePlanConnection.findMany({
      where: {
        teacherId: req.teacherId,
      },
    });
    return allData;
  }

  // get all plans and classes owned by teacher (unique for teacher)
  async getMapByTeacher(req: Request) {
    if (!req.isTeacher) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }
    const connections = await this.db.classPricePlanConnection.findMany({
      where: {
        teacherId: req.teacherId,
      },
      select: {
        classId: true,
        pricePlanId: true,
        pricePlan: {
          select: {
            id: true,
            slug: true,
            name: true,
            status: true,
            isAdminApproved: true,
          },
        },
        class: {
          select: {
            id: true,
            slug: true,
            name: true,
            status: true,
            classType: true,
            classMonth: true,
          },
        },
      },
    });

    return {
      connections,
    };
  }
}
