/*
  Warnings:

  - The values [d,m,t] on the enum `UserDevice` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "UserDevice_new" AS ENUM ('DESKTOP', 'MOBILE', 'TABLET', 'CONSOLE', 'SMARTTV', 'WEARABLE', 'EMBEDDED');
ALTER TABLE "User" ALTER COLUMN "device" TYPE "UserDevice_new" USING ("device"::text::"UserDevice_new");
ALTER TYPE "UserDevice" RENAME TO "UserDevice_old";
ALTER TYPE "UserDevice_new" RENAME TO "UserDevice";
DROP TYPE "public"."UserDevice_old";
COMMIT;
