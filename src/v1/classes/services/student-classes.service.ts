import { Request } from 'express';
import { DatabaseService } from '../../../database/database.service.js';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { QueryStudentFilterDto } from '../dto/query-student-filter.dto.js';
import {
  ClassPricePlanStatus,
  ClassStatus,
} from '../../../../generated/prisma/enums.js';
import { QueryStudentCourseFilterDto } from '../dto/query-student-course-filter.dto.js';
import { $Enums, Prisma } from '../../../../generated/prisma/client.js';

@Injectable()
export class StudentClassesService {
  constructor(private readonly db: DatabaseService) {}

  async findEnrolledClassesByStudent(
    req: Request,
    query: QueryStudentFilterDto,
  ): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
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

    const select = {
      classPricePlan: {
        select: {
          classes: {
            where: {
              class: { status: ClassStatus.active },
            },
            select: {
              class: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  color: true,
                  status: true,
                  classMonth: true,
                  classType: true,
                  isFeatured: true,
                  slug: true,
                  teacher: {
                    select: {
                      user: {
                        select: { name: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    };

    const [enrollments, total] = await Promise.all([
      this.db.classEnrollment.findMany({
        where,
        select,
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

  async getAllAvailableClassesGroupedByTeacher(
    req: Request,
    query: QueryStudentCourseFilterDto,
  ) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;
    const teacherId = query.teacherId;
    const search = query.search;

    const where = {
      teacher: {
        status: $Enums.UserRoleStatus.active,
      },
      status: ClassStatus.active,
      ...(search && {
        name: {
          contains: search,
          mode: Prisma.QueryMode.insensitive,
        },
      }),
      ...(teacherId && {
        teacherId: teacherId,
      }),
      classPricePlans: {
        some: {
          pricePlan: {
            status: ClassPricePlanStatus.active,
            isAdminApproved: $Enums.isAdminApproved.approved,
          },
        },
      },
    };
    // class needs to be active and should have at least one active price plan to be shown in the list of available classes for students
    const classes = {
      where: where,
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        color: true,
        status: true,
        classMonth: true,
        classType: true,
        isFeatured: true,
        teacher: {
          select: {
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },

      skip,
      take: limit,
    };

    const [cls, total] = await Promise.all([
      this.db.class.findMany(classes),
      this.db.class.count({ where }),
    ]);
    return {
      courses: cls,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // get course for student
  async getStudentCourse(req: Request, slug: string) {
    // 1. Initial lightweight fetch to verify class existence and get baseline data
    const myClass = await this.db.class.findFirst({
      where: {
        slug: slug,
        status: ClassStatus.active,
        classPricePlans: {
          some: {
            pricePlan: { status: ClassPricePlanStatus.active },
          },
        },
        teacher: {
          status: 'active',
        },
      },
      select: {
        firstSectionFreeApplied: true,
        id: true,
        teacherId: true,
        contents: {
          where: { sectionId: 1 },
          include: {
            media: true,
            video: {
              select: {
                videoId: true,
                id: true,
                title: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (!myClass) {
      throw new HttpException('Class not found', HttpStatus.NOT_FOUND);
    }

    // 2. Determine if the user has full access (Admin, Course Owner, or Enrolled Student)
    let hasAccess =
      req.isAdmin || (req.isTeacher && req.teacherId === myClass.teacherId);

    if (!hasAccess && req.studentId) {
      const enrollmentCount = await this.db.classEnrollment.count({
        where: {
          studentId: req.studentId,
          createdAt: { lt: new Date() }, // Ensure the enrollment actually started
          OR: [
            // Scenario A: Enrollment is active (unexpired) and includes this class
            {
              expiresAt: { gt: new Date() },
              classPricePlan: {
                classes: { some: { classId: myClass.id } },
              },
            },
            // Scenario B: Enrollment might be expired, but this SPECIFIC class grants permanent access
            {
              classPricePlan: {
                classes: {
                  some: {
                    classId: myClass.id,
                    class: { isActiveForever: true },
                  },
                },
              },
            },
          ],
        },
      });
      hasAccess = enrollmentCount > 0;
    }

    let classContent: any;
    let availablePlans: any[] = [];

    // 3. Fetch specific data based on access level
    if (hasAccess) {
      classContent = await this.db.class.findUnique({
        where: { id: myClass.id },
        include: {
          teacher: { select: { user: { select: { name: true } } } },
          contents: {
            include: { media: true, video: true }, // Full content access
          },
        },
      });
    } else {
      // Fetch limited class content and available price plans concurrently
      [availablePlans, classContent] = await Promise.all([
        this.db.classPricePlan.findMany({
          where: {
            status: ClassPricePlanStatus.active,
            classes: { some: { classId: myClass.id } },
            isAdminApproved: $Enums.isAdminApproved.approved,
          },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            status: true,
            price: true,
            duration: true,
            color: true,
            teacherId: true,
            isAdminApproved: true,
            promoDiscountPercentage: true,
            isPromoActive: true,
            isEarlyBirdActive: true,
            earlyBirdMaxCount: true,
            earlyBirdDiscountPercentage: true,
            createdAt: true,
            updatedAt: true,
            classes: { select: { class: { select: { name: true } } } },
            teacher: { select: { user: { select: { name: true } } } },
          },
        }),
        this.db.class.findUnique({
          where: { id: myClass.id },
          include: {
            teacher: { select: { user: { select: { name: true } } } },
            contents: {
              select: {
                // Restricted content access
                title: true,
                sectionId: true,
                contentId: true,
                type: true,
                media: {
                  select: { mimetype: true, mediaId: true },
                },
              },
            },
          },
        }),
      ]);
    }

    return {
      availablePlans,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      classContent,
      firstSection: myClass.firstSectionFreeApplied ? myClass.contents : [],
    };
  }
}
