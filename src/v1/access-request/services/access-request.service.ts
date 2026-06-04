import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

import { DatabaseService } from '../../../database/database.service.js';
import { StudentAccessRequestDto } from '../dto/student-access-request.js';
import { Request } from 'express';
import { TeacherResponseDto } from '../dto/teacher-response.js';
import {
  calculateEnrollment,
  calculateEnrollmentDuration,
} from '../../../calculations/enrollments.js';
import { QueryFilterRequestsDto } from '../dto/query-filter-requests.js';
import { CheckPromoDto } from '../dto/check-promo.js';
import { EmailsService } from '../../emails/emails.service.js';
import { ReceiptFileService } from '../../media/services/receipt-file.service.js';

@Injectable()
export class AccessRequestService {
  constructor(
    private readonly db: DatabaseService,
    private readonly receiptFileservice: ReceiptFileService,
    private readonly emailsService: EmailsService,
  ) {}

  async uploadRequestReceipt(
    req: Request,
    planSlug: string,
    file: Express.Multer.File,
    studentAccessReq: StudentAccessRequestDto,
  ) {
    // student can only upload receipt for themselves,
    // so we check if the studentId in the request matches the authenticated student
    // if student already enrolled and not expired, they should not be able to upload receipt

    const request = await this.db.accessRequest.findMany({
      where: {
        studentId: req.studentId,
        classPricePlan: {
          slug: planSlug,
        },
      },
      select: {
        id: true,
      },
    });
    if (request.length > 0) {
      throw new HttpException(
        'Request already submitted',
        HttpStatus.BAD_REQUEST,
      );
    }

    const classPricePlan = await this.db.classPricePlan.findFirst({
      where: {
        slug: planSlug,
        status: 'active',
        teacher: {
          status: 'active',
        },
        isAdminApproved: 'approved',
        classEnrollments: {
          none: {
            studentId: req.studentId,
            expiresAt: {
              // if the student is already enrolled and the enrollment has not expired, they should not be able to upload receipt
              gt: new Date(),
            },
          },
        },
      },
    });

    if (!classPricePlan) {
      throw new HttpException(
        'No active and approved plan found for the given slug or you are already enrolled',
        HttpStatus.BAD_REQUEST,
      );
    }
    if (
      classPricePlan.promocode &&
      studentAccessReq.promocode &&
      studentAccessReq.promocode !== classPricePlan.promocode
    ) {
      throw new HttpException('Invalid promo code', HttpStatus.BAD_REQUEST);
    }
    if (!classPricePlan.teacherId) {
      throw new HttpException(
        'The class price plan is not associated with a teacher',
        HttpStatus.BAD_REQUEST,
      );
    }

    const uploadResult = await this.receiptFileservice.uploadReceipt(
      file,
      classPricePlan.teacherId,
    );
    // create access request record in the database
    const res = await this.db.accessRequest.create({
      data: {
        studentId: req.studentId!,
        classPricePlanId: classPricePlan.id,
        requestNote: studentAccessReq.message || null,
        promoCode: studentAccessReq.promocode || null,
        fileId: uploadResult.fileId,
        mimetype: uploadResult.mimetype || null,
      },
    });
    return res;
  }

  async sendResponse(teacherResponse: TeacherResponseDto) {
    // Fetch access request, including necessary relations and counts for calculations
    const accessRequest = await this.db.accessRequest.findFirst({
      where: {
        id: teacherResponse.id,
      },
      include: {
        student: {
          select: {
            userId: true,
            user: {
              select: {
                name: true,
                email: true,
              },
            },
          }, // Fetches the correct User ID for the notification table
        },
        classPricePlan: {
          include: {
            _count: {
              select: { classEnrollments: true }, // Required for calculateEnrollment to work
            },
            classes: {
              select: {
                class: {
                  select: {
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!accessRequest) {
      throw new HttpException('Access request not found', HttpStatus.NOT_FOUND);
    }

    // Check if student is already actively enrolled
    const enrollment = await this.db.classEnrollment.findFirst({
      where: {
        studentId: accessRequest.studentId,
        classPricePlanId: accessRequest.classPricePlanId,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (enrollment) {
      throw new HttpException(
        'Student is already enrolled in this plan',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Array to hold database operations for the transaction
    const transactionOperations: any[] = [];

    let receiptDetails: any = null;

    // Process Approval
    if (teacherResponse.response) {
      const plan = accessRequest.classPricePlan;

      const {
        price,
        purchasedAmount,
        earlyBirdDiscountAmount,
        promoDiscountAmount,
        isEarlyBirdApplied,
        earlyBirdNumber,
        isPromoApplied,
        promoCodeUsed,
      } = calculateEnrollment(
        plan,
        accessRequest.promoCode ? true : false,
        false,
      );

      const paymentRecordQuery = this.db.enrollmentPayment.create({
        data: {
          studentId: accessRequest.studentId,
          fullPaymentAmount: price,
          discountAmount: earlyBirdDiscountAmount + promoDiscountAmount,
          purchasedAmount: purchasedAmount,
          paymentStatus: 'completed',
          paymentType: 'offline',
          fileId: accessRequest.fileId || null, // Link the receipt file to the payment record
          enrollments: {
            create: {
              studentId: accessRequest.studentId,
              classPricePlanId: plan.id,
              teacherId: plan.teacherId,
              price,
              earlyBirdDiscountAmount,
              promoDiscountAmount,
              purchasedAmount,
              expiresAt: calculateEnrollmentDuration(plan.duration),
              isEarlyBirdApplied,
              earlyBirdNumber,
              isPromoApplied,
              promoCodeUsed,
            },
          },
        },
      });

      transactionOperations.push(paymentRecordQuery);

      receiptDetails = {
        planName: plan.name,
        planSlug: plan.slug,
        price: price,
        earlyBirdDiscountAmount: earlyBirdDiscountAmount,
        promoDiscountAmount: promoDiscountAmount,
        purchasedAmount: purchasedAmount,
        isEarlyBirdApplied: isEarlyBirdApplied,
        isPromoApplied: isPromoApplied,
        expiresAt: calculateEnrollmentDuration(plan.duration),
        classes: plan.classes.map((c) => ({ name: c.class.name })),
      };
    }

    if (!accessRequest.student.userId) {
      throw new HttpException(
        'Student profile is not linked to a valid user account',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Create Notification
    const message = teacherResponse.response
      ? `Your access request for the plan "${accessRequest.classPricePlan.name}" has been approved.`
      : `Your access request for the plan "${accessRequest.classPricePlan.name}" has been rejected. You can try again by uploading a new receipt if you think there was an issue with the previous one or contact the teacher for more information.`;

    const notificationQuery = this.db.notification.create({
      data: {
        userId: accessRequest.student.userId, // Uses the actual User ID linked to the StudentProfile
        title: 'Price Plan Access Request Update',
        message: message,
        url: `/student/plans/view/${accessRequest.classPricePlan.slug}`,
      },
    });
    transactionOperations.push(notificationQuery);

    // Delete Access Request
    const deleteRequestQuery = this.db.accessRequest.delete({
      where: {
        id: teacherResponse.id,
      },
    });
    transactionOperations.push(deleteRequestQuery);

    // Execute all operations safely in a single transaction
    await this.db.$transaction(transactionOperations);
    // approved
    if (
      teacherResponse.response &&
      receiptDetails &&
      accessRequest.student.user?.email
    ) {
      await this.emailsService.sendEnrollmentReceiptEmail(
        accessRequest.student.user.email,
        accessRequest.student.user.name ?? 'Student',
        receiptDetails,
      );
    }
    // reject
    if (!teacherResponse.response && accessRequest.student.user?.email) {
      await this.emailsService.sendRejectedEnrollmentEmail(
        accessRequest.student.user.email,
        accessRequest.student.user.name ?? 'Student',
        accessRequest.classPricePlan.name,
      );
    }

    return { message: 'Response sent successfully' };
  }

  async getTeacherRequests(req: Request, query: QueryFilterRequestsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const [requests, total] = await Promise.all([
      this.db.accessRequest.findMany({
        where: {
          id: query.requestId,
          classPricePlan: {
            teacherId: req.teacherId,
          },
        },
        include: {
          student: {
            select: {
              user: {
                select: {
                  email: true,
                  name: true,
                  phone: true,
                },
              },
            },
          },
          classPricePlan: {
            include: {
              classes: {
                select: {
                  class: {
                    select: {
                      name: true,
                      slug: true,
                    },
                  },
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.db.accessRequest.count({
        where: {
          id: query.requestId,
          classPricePlan: {
            teacherId: req.teacherId,
          },
        },
      }),
    ]);

    return {
      accessRequests: requests,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async checkPromo(req: Request, planSlug: string, promo: CheckPromoDto) {
    const classPricePlan = await this.db.classPricePlan.findFirst({
      where: {
        slug: planSlug,
        status: 'active',
        isAdminApproved: 'approved',
        isPromoActive: true,
        promocode: promo.promocode.trim(),
        classEnrollments: {
          none: {
            studentId: req.studentId,
            expiresAt: {
              gt: new Date(),
            },
          },
        },
      },
    });
    if (!classPricePlan) {
      throw new HttpException('Invalid promo code', HttpStatus.BAD_REQUEST);
    }
    return {
      message: 'Promo code is valid',
      promoDiscountPercentage: classPricePlan.promoDiscountPercentage,
    };
  }

  async sendResponseAsTeacher(
    req: Request,
    teacherResponse: TeacherResponseDto,
  ) {
    if (!req.teacherId) {
      throw new HttpException('Request ID is required', HttpStatus.BAD_REQUEST);
    }
    return await this.sendResponse(teacherResponse);
  }

  async sendResponseAsAdmin(req: Request, teacherResponse: TeacherResponseDto) {
    if (!req.adminId) {
      throw new HttpException('Admin ID is required', HttpStatus.BAD_REQUEST);
    }
    return await this.sendResponse(teacherResponse);
  }
}
