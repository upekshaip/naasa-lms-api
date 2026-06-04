-- AlterTable
ALTER TABLE "AdminProfile" ADD COLUMN     "status" "UserRoleStatus" NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "StudentProfile" ADD COLUMN     "status" "UserRoleStatus" NOT NULL DEFAULT 'active';
