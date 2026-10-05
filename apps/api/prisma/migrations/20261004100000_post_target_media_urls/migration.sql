-- AlterTable
ALTER TABLE "PostTarget" ADD COLUMN "mediaUrls" TEXT[] DEFAULT ARRAY[]::TEXT[];
