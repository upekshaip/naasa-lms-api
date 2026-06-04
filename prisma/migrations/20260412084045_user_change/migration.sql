-- CreateEnum
CREATE TYPE "UserDevice" AS ENUM ('d', 'm', 't');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "device" "UserDevice",
ADD COLUMN     "lastLoginAt" TIMESTAMP(3),
ALTER COLUMN "password" DROP NOT NULL;
