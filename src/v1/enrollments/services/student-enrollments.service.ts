import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { QueryStudentEnrollmentsDto } from '../dto/query-student-enrollments.dto.js';
import { Request } from 'express';

@Injectable()
export class StudentEnrollmentsService {
  constructor(private readonly db: DatabaseService) {}

  // get all enrollments for a specific student
  async getAllStudentEnrollments(
    req: Request,
    query: QueryStudentEnrollmentsDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where = {
      studentId: req.studentId,
      ...(query.status === 'active' && {
        expiresAt: { gt: new Date() },
      }),
      ...(query.status === 'expired' && {
        expiresAt: { lt: new Date() },
      }),
    };

    const include = {
      classPricePlan: {
        select: {
          teacher: {
            select: {
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
          id: true,
          name: true,
          color: true,
          slug: true,
          classes: {
            select: {
              class: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      },
    };

    const [enrollments, total] = await Promise.all([
      this.db.classEnrollment.findMany({
        where: where,
        include: include,
        skip,
        take: limit,
      }),
      this.db.classEnrollment.count({ where }),
    ]);

    return {
      data: enrollments,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}
