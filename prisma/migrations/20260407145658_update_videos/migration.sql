/*
  Warnings:

  - You are about to drop the column `url` on the `Videos` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "VideoStatus" AS ENUM ('processing', 'uploading', 'ready', 'failed', 'canceled');

-- AlterTable
ALTER TABLE "Videos" DROP COLUMN "url",
ADD COLUMN     "status" "VideoStatus" NOT NULL DEFAULT 'processing';
