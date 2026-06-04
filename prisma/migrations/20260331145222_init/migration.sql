-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('m', 'f', 'o');

-- CreateEnum
CREATE TYPE "UserRoleStatus" AS ENUM ('active', 'deleted');

-- CreateEnum
CREATE TYPE "isAdminApproved" AS ENUM ('approved', 'pending', 'rejected');

-- CreateEnum
CREATE TYPE "ClassStatus" AS ENUM ('active', 'inactive', 'archived');

-- CreateEnum
CREATE TYPE "ClassType" AS ENUM ('monthly', 'onetime');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('video', 'media', 'url', 'live');

-- CreateEnum
CREATE TYPE "ClassPricePlanStatus" AS ENUM ('pending', 'active', 'archived');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "PaymentType" AS ENUM ('offline', 'online');

-- CreateEnum
CREATE TYPE "MediaDrive" AS ENUM ('g1', 'r2', 's3');

-- CreateTable
CREATE TABLE "User" (
    "userId" SERIAL NOT NULL,
    "name" VARCHAR(50),
    "password" VARCHAR(255) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "phone" VARCHAR(15),
    "gender" "Gender",
    "refreshToken" TEXT,
    "dob" DATE,
    "address" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isTeacher" BOOLEAN NOT NULL DEFAULT false,
    "isStudent" BOOLEAN NOT NULL DEFAULT false,
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "TeacherProfile" (
    "teacherId" SERIAL NOT NULL,
    "userId" INTEGER,
    "status" "UserRoleStatus" NOT NULL DEFAULT 'active',
    "canCreatePlan" BOOLEAN NOT NULL DEFAULT false,
    "canEditPlan" BOOLEAN NOT NULL DEFAULT false,
    "canBroadcastMessage" BOOLEAN NOT NULL DEFAULT false,
    "canBroadcastSMS" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TeacherProfile_pkey" PRIMARY KEY ("teacherId")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "studentId" SERIAL NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("studentId")
);

-- CreateTable
CREATE TABLE "AdminProfile" (
    "adminId" SERIAL NOT NULL,
    "userId" INTEGER,

    CONSTRAINT "AdminProfile_pkey" PRIMARY KEY ("adminId")
);

-- CreateTable
CREATE TABLE "ClassGroup" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "ClassGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Class" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" TEXT NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "teacherId" INTEGER,
    "creatorId" INTEGER,
    "status" "ClassStatus" NOT NULL DEFAULT 'active',
    "classType" "ClassType" NOT NULL DEFAULT 'onetime',
    "classMonth" INTEGER,
    "classgroupId" INTEGER,
    "color" VARCHAR(9),
    "isActiveForever" BOOLEAN NOT NULL DEFAULT false,
    "firstSectionFreeApplied" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassContent" (
    "contentId" SERIAL NOT NULL,
    "classId" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT NOT NULL,
    "type" "ContentType" NOT NULL,
    "contentUrl" TEXT,
    "mediaId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "sectionId" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "ClassContent_pkey" PRIMARY KEY ("contentId")
);

-- CreateTable
CREATE TABLE "ClassPricePlanConnection" (
    "id" SERIAL NOT NULL,
    "classId" INTEGER NOT NULL,
    "pricePlanId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "teacherId" INTEGER,

    CONSTRAINT "ClassPricePlanConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassPricePlan" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" VARCHAR(255) NOT NULL,
    "status" "ClassPricePlanStatus" NOT NULL DEFAULT 'pending',
    "slug" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 35,
    "color" VARCHAR(9),
    "teacherId" INTEGER,
    "creatorId" INTEGER,
    "isAdminApproved" "isAdminApproved" NOT NULL DEFAULT 'pending',
    "approvedAdminId" INTEGER,
    "promocode" VARCHAR(255),
    "promoDiscountPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isPromoActive" BOOLEAN NOT NULL DEFAULT false,
    "earlyBirdMaxCount" INTEGER NOT NULL DEFAULT 0,
    "earlyBirdDiscountPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isEarlyBirdActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassPricePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClassEnrollment" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "isPromoApplied" BOOLEAN NOT NULL DEFAULT false,
    "promoCodeUsed" VARCHAR(255),
    "isEarlyBirdApplied" BOOLEAN NOT NULL DEFAULT false,
    "earlyBirdNumber" INTEGER,
    "classPricePlanId" INTEGER NOT NULL,
    "teacherId" INTEGER,
    "price" DOUBLE PRECISION NOT NULL,
    "earlyBirdDiscountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "promoDiscountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "purchasedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paymentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrollmentPayment" (
    "paymentId" SERIAL NOT NULL,
    "paymentSlug" TEXT NOT NULL,
    "studentId" INTEGER NOT NULL,
    "fullPaymentAmount" DOUBLE PRECISION NOT NULL,
    "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "purchasedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "paymentType" "PaymentType" NOT NULL DEFAULT 'offline',
    "fileId" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnrollmentPayment_pkey" PRIMARY KEY ("paymentId")
);

-- CreateTable
CREATE TABLE "Media" (
    "mediaId" SERIAL NOT NULL,
    "fileId" VARCHAR(255) NOT NULL,
    "fileType" VARCHAR(20) NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimetype" VARCHAR(255) NOT NULL,
    "MediaDrive" "MediaDrive" NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Media_pkey" PRIMARY KEY ("mediaId")
);

-- CreateTable
CREATE TABLE "AccessRequest" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "classPricePlanId" INTEGER NOT NULL,
    "promoCode" VARCHAR(255),
    "requestNote" TEXT,
    "mimetype" VARCHAR(255),
    "fileId" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "url" VARCHAR(255),
    "title" VARCHAR(255) NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "TeacherProfile_userId_key" ON "TeacherProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentProfile_userId_key" ON "StudentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AdminProfile_userId_key" ON "AdminProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassGroup_slug_key" ON "ClassGroup"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Class_slug_key" ON "Class"("slug");

-- CreateIndex
CREATE INDEX "Class_teacherId_idx" ON "Class"("teacherId");

-- CreateIndex
CREATE INDEX "Class_creatorId_idx" ON "Class"("creatorId");

-- CreateIndex
CREATE INDEX "Class_classgroupId_idx" ON "Class"("classgroupId");

-- CreateIndex
CREATE INDEX "Class_status_idx" ON "Class"("status");

-- CreateIndex
CREATE INDEX "Class_classType_idx" ON "Class"("classType");

-- CreateIndex
CREATE INDEX "ClassContent_classId_idx" ON "ClassContent"("classId");

-- CreateIndex
CREATE INDEX "ClassContent_mediaId_idx" ON "ClassContent"("mediaId");

-- CreateIndex
CREATE INDEX "ClassPricePlanConnection_classId_idx" ON "ClassPricePlanConnection"("classId");

-- CreateIndex
CREATE INDEX "ClassPricePlanConnection_pricePlanId_idx" ON "ClassPricePlanConnection"("pricePlanId");

-- CreateIndex
CREATE INDEX "ClassPricePlanConnection_teacherId_idx" ON "ClassPricePlanConnection"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassPricePlanConnection_classId_pricePlanId_key" ON "ClassPricePlanConnection"("classId", "pricePlanId");

-- CreateIndex
CREATE UNIQUE INDEX "ClassPricePlan_slug_key" ON "ClassPricePlan"("slug");

-- CreateIndex
CREATE INDEX "ClassPricePlan_teacherId_idx" ON "ClassPricePlan"("teacherId");

-- CreateIndex
CREATE INDEX "ClassPricePlan_creatorId_idx" ON "ClassPricePlan"("creatorId");

-- CreateIndex
CREATE INDEX "ClassPricePlan_approvedAdminId_idx" ON "ClassPricePlan"("approvedAdminId");

-- CreateIndex
CREATE INDEX "ClassPricePlan_status_idx" ON "ClassPricePlan"("status");

-- CreateIndex
CREATE INDEX "ClassPricePlan_isAdminApproved_idx" ON "ClassPricePlan"("isAdminApproved");

-- CreateIndex
CREATE INDEX "ClassEnrollment_studentId_idx" ON "ClassEnrollment"("studentId");

-- CreateIndex
CREATE INDEX "ClassEnrollment_classPricePlanId_idx" ON "ClassEnrollment"("classPricePlanId");

-- CreateIndex
CREATE INDEX "ClassEnrollment_teacherId_idx" ON "ClassEnrollment"("teacherId");

-- CreateIndex
CREATE INDEX "ClassEnrollment_paymentId_idx" ON "ClassEnrollment"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentPayment_paymentSlug_key" ON "EnrollmentPayment"("paymentSlug");

-- CreateIndex
CREATE INDEX "EnrollmentPayment_studentId_idx" ON "EnrollmentPayment"("studentId");

-- CreateIndex
CREATE INDEX "Media_teacherId_idx" ON "Media"("teacherId");

-- CreateIndex
CREATE INDEX "Notification_userId_idx" ON "Notification"("userId");

-- AddForeignKey
ALTER TABLE "TeacherProfile" ADD CONSTRAINT "TeacherProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminProfile" ADD CONSTRAINT "AdminProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "TeacherProfile"("teacherId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("teacherId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_classgroupId_fkey" FOREIGN KEY ("classgroupId") REFERENCES "ClassGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassContent" ADD CONSTRAINT "ClassContent_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassContent" ADD CONSTRAINT "ClassContent_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("mediaId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassPricePlanConnection" ADD CONSTRAINT "ClassPricePlanConnection_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("teacherId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassPricePlanConnection" ADD CONSTRAINT "ClassPricePlanConnection_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassPricePlanConnection" ADD CONSTRAINT "ClassPricePlanConnection_pricePlanId_fkey" FOREIGN KEY ("pricePlanId") REFERENCES "ClassPricePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassPricePlan" ADD CONSTRAINT "ClassPricePlan_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("teacherId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassPricePlan" ADD CONSTRAINT "ClassPricePlan_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "TeacherProfile"("teacherId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassPricePlan" ADD CONSTRAINT "ClassPricePlan_approvedAdminId_fkey" FOREIGN KEY ("approvedAdminId") REFERENCES "AdminProfile"("adminId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("studentId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_classPricePlanId_fkey" FOREIGN KEY ("classPricePlanId") REFERENCES "ClassPricePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("teacherId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "EnrollmentPayment"("paymentId") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentPayment" ADD CONSTRAINT "EnrollmentPayment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("studentId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("teacherId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "StudentProfile"("studentId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessRequest" ADD CONSTRAINT "AccessRequest_classPricePlanId_fkey" FOREIGN KEY ("classPricePlanId") REFERENCES "ClassPricePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("userId") ON DELETE RESTRICT ON UPDATE CASCADE;
