/*
  Warnings:

  - You are about to drop the `Videos` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
ALTER TYPE "ContentType" ADD VALUE 'hls';

-- DropForeignKey
ALTER TABLE "Videos" DROP CONSTRAINT "Videos_teacherId_fkey";

-- AlterTable
ALTER TABLE "ClassContent" ADD COLUMN     "videoId" INTEGER;

-- DropTable
DROP TABLE "Videos";

-- CreateTable
CREATE TABLE "Video" (
    "id" SERIAL NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "videoId" VARCHAR(255) NOT NULL,
    "videoKey" VARCHAR(255) NOT NULL,
    "teacherId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" "VideoStatus" NOT NULL DEFAULT 'processing',

    CONSTRAINT "Video_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Video_teacherId_idx" ON "Video"("teacherId");

-- AddForeignKey
ALTER TABLE "ClassContent" ADD CONSTRAINT "ClassContent_videoId_fkey" FOREIGN KEY ("videoId") REFERENCES "Video"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "TeacherProfile"("teacherId") ON DELETE RESTRICT ON UPDATE CASCADE;
