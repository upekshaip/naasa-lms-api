-- AlterTable
ALTER TABLE "TeacherProfile" ADD COLUMN     "maxMediaStorageLimit" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
ADD COLUMN     "maxMonthlyClasslimit" INTEGER NOT NULL DEFAULT 5,
ADD COLUMN     "maxOnetimeClasslimit" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "maxPricePlanLimit" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "maxVideoStorageLimit" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
ADD COLUMN     "subscription" VARCHAR(50),
ADD COLUMN     "subscriptionEndDate" TIMESTAMP(3),
ADD COLUMN     "subscriptionStartDate" TIMESTAMP(3);
