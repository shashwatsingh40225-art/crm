-- CreateEnum
CREATE TYPE "FindingReviewStatus" AS ENUM ('pending', 'approved', 'rejected');

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "archived_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "contacts" ADD COLUMN     "archived_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "deals" ADD COLUMN     "archived_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "findings" ADD COLUMN     "review_status" "FindingReviewStatus" NOT NULL DEFAULT 'pending';
