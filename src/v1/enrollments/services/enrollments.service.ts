import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { DatabaseService } from '../../../database/database.service.js';
import { CreateEnrollmentsArrayDto } from '../dto/create-enrollments-array.dto.js';
import {
  calculateEnrollment,
  calculateEnrollmentDuration,
} from '../../../calculations/enrollments.js';
import { EmailsService } from '../../emails/emails.service.js';
// import { UpdateEnrollmentDto } from './dto/update-enrollment.dto';

export interface PrefetchedStudentData {
  studentId: number;
  userId: number | null;
  user: {
    name: string | null;
    email: string;
    phone: string | null;
  } | null;
}
@Injectable()
export class EnrollmentsService {
  constructor(
    private readonly db: DatabaseService,
    private readonly emailsService: EmailsService,
  ) {}

  // teacher focused - create enrollments for a student
  // Define an interface for the prefetched student to completely avoid 'any'

  async getStudentEnrollments(
    studentId: number,
    req: Request,
    preFetchedStudent?: PrefetchedStudentData, // Replaced 'any' with the specific interface
  ) {
    if (!req.teacherId) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const now = new Date();

    const studentPromise = preFetchedStudent
      ? Promise.resolve(preFetchedStudent)
      : this.db.studentProfile.findUnique({
          where: { studentId: studentId },
          include: {
            user: { select: { name: true, email: true, phone: true } },
          },
        });

    const [student, _enrollments, availablePlans] = await Promise.all([
      studentPromise,
      this.db.classEnrollment.findMany({
        where: {
          studentId: studentId,
          teacherId: req.teacherId,
        },
        include: {
          classPricePlan: {
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
            },
          },
        },
      }),
      this.db.classPricePlan.findMany({
        where: {
          teacherId: req.teacherId,
          status: 'active',
          isAdminApproved: 'approved',
          classEnrollments: {
            none: {
              studentId: studentId,
              expiresAt: {
                gt: now,
              },
              payment: {
                paymentStatus: 'completed',
              },
            },
          },
        },
        include: {
          classes: {
            select: {
              class: {
                select: { id: true, name: true, description: true, slug: true },
              },
            },
          },
          _count: {
            select: {
              classEnrollments: {
                where: {
                  isEarlyBirdApplied: true,
                },
              },
            },
          },
        },
      }),
    ]);

    if (!student) {
      throw new HttpException('Student not found', HttpStatus.NOT_FOUND);
    }

    const availablePlansWithEarlyBird = availablePlans.map((plan) => {
      const counts = plan._count as { classEnrollments: number };
      const usedEarlyBirdCount = counts.classEnrollments;

      const canApplyEarlyBird =
        plan.isEarlyBirdActive &&
        plan.earlyBirdMaxCount > 0 &&
        usedEarlyBirdCount < plan.earlyBirdMaxCount;

      return {
        ...plan,
        earlyBirdUsedCount: usedEarlyBirdCount,
        canApplyEarlyBird,
      };
    });

    return {
      enrollments: _enrollments,
      availablePlans: availablePlansWithEarlyBird,
      student,
    };
  }

  async makeEnrollments(
    createEnrollmentsArrayDto: CreateEnrollmentsArrayDto,
    studentId: number,
    req: Request,
  ) {
    if (!req.teacherId) {
      throw new HttpException('Unauthorized', HttpStatus.UNAUTHORIZED);
    }

    const planIds = createEnrollmentsArrayDto.enrollments.map(
      (e) => e.classPricePlanId,
    );

    if (planIds.length === 0) {
      throw new HttpException(
        'No enrollments provided',
        HttpStatus.BAD_REQUEST,
      );
    }

    const [student, pricePlans, existingEnrollments] = await Promise.all([
      this.db.studentProfile.findUnique({
        where: { studentId: studentId },
        include: {
          user: {
            select: { name: true, email: true, phone: true },
          },
        },
      }),
      this.db.classPricePlan.findMany({
        where: {
          id: { in: planIds },
          teacherId: req.teacherId,
        },
        include: {
          _count: {
            select: {
              classEnrollments: {
                where: { isEarlyBirdApplied: true },
              },
            },
          },
          classes: {
            select: { class: { select: { id: true, name: true } } },
          },
        },
      }),
      this.db.classEnrollment.findMany({
        where: {
          studentId: studentId,
          classPricePlanId: { in: planIds },
          expiresAt: { gt: new Date() },
        },
      }),
    ]);

    if (!student) {
      throw new HttpException('Student not found', HttpStatus.NOT_FOUND);
    }

    // Switched from student.user?.userId to student.userId since it lives on the profile
    if (!student.userId) {
      throw new HttpException(
        'Student profile is not linked to a valid user account',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (pricePlans.length !== planIds.length) {
      throw new HttpException(
        'One or more price plans are invalid',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (existingEnrollments.length > 0) {
      throw new HttpException(
        `Student is already enrolled in price plan. ID - ${existingEnrollments[0].classPricePlanId}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const pricePlanMap = new Map(pricePlans.map((p) => [p.id, p]));

    // Replaced any[] with explicit inline types to satisfy ESLint
    const createEnrollmentTransactions: Array<{
      studentId: number;
      classPricePlanId: number;
      teacherId: number | null;
      price: number;
      earlyBirdDiscountAmount: number;
      promoDiscountAmount: number;
      purchasedAmount: number;
      expiresAt: Date;
      isEarlyBirdApplied: boolean;
      earlyBirdNumber: number | null;
      isPromoApplied: boolean;
      promoCodeUsed: string | null;
    }> = [];

    const notifications: Array<{
      title: string;
      message: string;
      url: string;
      userId: number;
    }> = [];

    let paymentAmountTotal = 0;
    let discountAmountTotal = 0;
    let purchasedAmountTotal = 0;

    createEnrollmentsArrayDto.enrollments.forEach((enrollment) => {
      const plan = pricePlanMap.get(enrollment.classPricePlanId);

      if (!plan) return;

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
        enrollment.promoApplied || false,
        enrollment.earlyBirdApplied || false,
      );

      paymentAmountTotal += price;
      discountAmountTotal += earlyBirdDiscountAmount + promoDiscountAmount;
      purchasedAmountTotal += purchasedAmount;

      createEnrollmentTransactions.push({
        studentId: student.studentId,
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
      });

      notifications.push({
        title: `You've been enrolled in ${plan.name || 'a class'}!`,
        message: `You have been enrolled in ${plan.name || 'a class'} by your teacher. Click to view details.`,
        url: `/student/plans/view/${plan.slug}`,
        userId: student.userId!, // Uses the student profile's direct userId, non-null asserted
      });
    });

    await this.db.$transaction([
      this.db.enrollmentPayment.create({
        data: {
          studentId: student.studentId,
          fullPaymentAmount: paymentAmountTotal,
          discountAmount: discountAmountTotal,
          purchasedAmount: purchasedAmountTotal,
          paymentStatus: 'completed',
          paymentType: 'offline',
          fileId: null, // No receipt file
          enrollments: {
            createMany: {
              data: createEnrollmentTransactions,
            },
          },
        },
      }),
      this.db.notification.createMany({
        data: notifications,
      }),
      this.db.accessRequest.deleteMany({
        where: {
          studentId: student.studentId,
          classPricePlanId: { in: planIds },
        },
      }),
    ]);

    // After await this.db.$transaction([...])

    for (const tx of createEnrollmentTransactions) {
      const plan = pricePlanMap.get(tx.classPricePlanId);
      if (!plan || !student.user) continue;

      await this.emailsService.sendEnrollmentReceiptEmail(
        student.user.email,
        student.user.name ?? 'Student',
        {
          planName: plan.name,
          planSlug: plan.slug,
          price: tx.price,
          earlyBirdDiscountAmount: tx.earlyBirdDiscountAmount,
          promoDiscountAmount: tx.promoDiscountAmount,
          purchasedAmount: tx.purchasedAmount,
          isEarlyBirdApplied: tx.isEarlyBirdApplied,
          isPromoApplied: tx.isPromoApplied,
          expiresAt: tx.expiresAt,
          classes: plan.classes.map((c) => ({ name: c.class.name })),
        },
      );
    }

    return await this.getStudentEnrollments(student.studentId, req, student);
  }

  // admin and students (for their own enrollments) only
  getAllEnrollmentsforStudent(req: Request) {
    return `This action returns all enrollments`;
  }

  // admin only
  remove(id: number) {
    return `This action removes a #${id} enrollment`;
  }
}
