import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { Request } from 'express';
import { QueryTeacherClassesDto } from '../dto/query-teacher-classes.dto.js';

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
