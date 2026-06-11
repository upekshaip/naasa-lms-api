import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { Request } from 'express';
import { QueryTeacherClassesDto } from '../dto/query-teacher-classes.dto.js';
import { QueryAdminClassesDto } from '../dto/query-admin-classes.dto.js';
import { Prisma } from '../../../../generated/prisma/client.js';

@Injectable()
export class FilterClassesService {
  constructor(private readonly db: DatabaseService) {}

  async findClassesByTeacher(
    req: Request,
    teacherId: number,
    query: QueryTeacherClassesDto,
  ) {
    const limit = query.limit || 10;
    const page = query.page || 1;
    const offset = (page - 1) * limit;
    const status = query.status || undefined;
    const classType = query.type || undefined;

    // Remove $transaction and use Promise.all for parallel read operations
    const [classes, active, allClasses, onetime, filteredTotal] =
      await Promise.all([
        this.db.class.findMany({
          where: { teacherId, status, classType },
          skip: offset,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            teacher: { include: { user: { select: { name: true } } } },
            classgroup: true,
          },
        }),
        this.db.class.count({ where: { teacherId, status: 'active' } }),
        this.db.class.count({ where: { teacherId } }),
        this.db.class.count({ where: { teacherId, classType: 'onetime' } }),
        this.db.class.count({ where: { teacherId, status, classType } }),
      ]);

    const totalPages = Math.ceil(Number(filteredTotal) / limit);

    return {
      data: classes,
      counts: {
        active,
        total: allClasses,
        onetime,
        monthly: Number(allClasses) - Number(onetime),
      },
      pagination: {
        page,
        limit,
        offset,
        totalPages,
        filteredTotal,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        nextPage: page < totalPages ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null,
      },
    };
  }

  /**
   * Admin: paginated classes across all teachers, enriched with enrollment count,
   * linked price-plan count and content count. Supports search + status/type filters.
   */
  async getAllClassesForAdmin(req: Request, query: QueryAdminClassesDto) {
    if (!req.isAdmin) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;
    const search = query.search?.trim();

    const where: Prisma.ClassWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.classType) where.classType = query.classType;
    if (query.teacherId) where.teacherId = Number(query.teacherId);
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        {
          teacher: {
            user: { name: { contains: search, mode: 'insensitive' } },
          },
        },
      ];
    }

    const [classes, filteredTotal, total, active, archived, featured] =
      await Promise.all([
        this.db.class.findMany({
          where,
          skip: offset,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            teacher: { select: { user: { select: { name: true } } } },
            createdBy: { select: { user: { select: { name: true } } } },
            classgroup: true,
            _count: { select: { contents: true } },
            classPricePlans: {
              select: {
                pricePlan: {
                  select: { _count: { select: { classEnrollments: true } } },
                },
              },
            },
          },
        }),
        this.db.class.count({ where }),
        this.db.class.count(),
        this.db.class.count({ where: { status: 'active' } }),
        this.db.class.count({ where: { status: 'archived' } }),
        this.db.class.count({ where: { isFeatured: true } }),
      ]);

    const data = classes.map((c) => ({
      ...c,
      contentCount: c._count.contents,
      planCount: c.classPricePlans.length,
      enrollmentCount: c.classPricePlans.reduce(
        (sum, conn) => sum + (conn.pricePlan?._count?.classEnrollments || 0),
        0,
      ),
    }));

    const totalPages = Math.ceil(filteredTotal / limit);

    return {
      data,
      counts: { total, active, archived, featured },
      pagination: {
        page,
        limit,
        offset,
        totalPages,
        filteredTotal,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        nextPage: page < totalPages ? page + 1 : null,
        prevPage: page > 1 ? page - 1 : null,
      },
    };
  }

  async getAllClassesforTeacher(req: Request) {
    const allClasses = await this.db.class.findMany({
      where: {
        teacherId: req.teacherId,
      },
      select: {
        slug: true,
        name: true,
        status: true,
      },
    });

    return allClasses;
  }
}
