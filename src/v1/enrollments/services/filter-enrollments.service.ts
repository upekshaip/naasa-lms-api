import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { DatabaseService } from '../../../database/database.service.js';
import { Request } from 'express';
import { QueryTeacherEnrollmentsDto } from '../dto/query-teacher-enrollments.dto.js';

@Injectable()
export class FilterEnrollmentsService {
  constructor(private readonly db: DatabaseService) {}

  async getAllEnrollmentsforTeacher(
    req: Request,
    teacherId: number,
    query: QueryTeacherEnrollmentsDto,
  ) {
    if (!req.teacherId) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    if (req.teacherId !== teacherId && !req.isAdmin) {
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const offset = (page - 1) * limit;

    const whereCondition = {
      teacherId: teacherId,
      ...(query.planSlug && {
        classPricePlan: {
          slug: query.planSlug,
          teacherId: teacherId,
        },
      }),
      ...(query.studentId && {
        studentId: query.studentId,
      }),
      ...(query.status === 'active' && {
        expiresAt: { gt: new Date() },
      }),
      ...(query.status === 'expired' && {
        expiresAt: { lt: new Date() },
      }),
    };

    const totalCount = await this.db.classEnrollment.count({
      where: whereCondition,
    });

    const enrollments = await this.db.classEnrollment.findMany({
      where: whereCondition,
      include: {
        student: {
          select: {
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          },
        },
        classPricePlan: {
          select: {
            slug: true,
            name: true,
          },
        },
      },
      skip: offset,
      take: limit,
    });

    const modEnrollments = enrollments.map((enrollment) => ({
      ...enrollment,
      status: enrollment.expiresAt > new Date() ? 'active' : 'expired',
    }));

    return {
      enrollments: modEnrollments,
      pagination: {
        page,
        limit,
        offset,
        count: totalCount,
        planSlug: query.planSlug || null,
        status: query.status || null,
        studentId: query.studentId || null,
      },
    };
  }

  // get enrollment details - mainly for teachers (for their students)
  async getEnrollmentDetails(enrollmentId: number, req: Request) {
    const enrollment = await this.db.classEnrollment.findUnique({
      where: { id: enrollmentId, teacherId: req.teacherId },
      include: {
        student: {
          select: {
            user: {
              select: {
                name: true,
                email: true,
                phone: true,
              },
            },
          },
        },
        payment: {
          include: {
            enrollments: {
              include: {
                classPricePlan: {
                  select: {
                    slug: true,
                    name: true,
                    price: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!enrollment) {
      throw new HttpException('Enrollment not found', HttpStatus.NOT_FOUND);
    }

    return enrollment;
  }

  // get student details (all enrollments for single student)
  async getStudentDetailsForTeacher(studentId: number, req: Request) {
    const studentDetails = await this.db.studentProfile.findFirst({
      where: {
        studentId: studentId,
      },
      select: {
        user: {
          select: {
            name: true,
            email: true,
            phone: true,
          },
        },
        studentPayments: {
          ...(req.teacherId && {
            where: {
              enrollments: {
                some: {
                  teacherId: req.teacherId,
                },
              },
            },
          }),
          include: {
            enrollments: {
              include: {
                classPricePlan: {
                  select: {
                    slug: true,
                    name: true,
                    price: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!studentDetails) {
      throw new HttpException('Student not found', HttpStatus.NOT_FOUND);
    }
    return studentDetails;
  }
}
