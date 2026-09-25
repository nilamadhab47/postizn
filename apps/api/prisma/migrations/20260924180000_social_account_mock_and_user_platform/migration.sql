-- AlterTable
ALTER TABLE "SocialAccount" ADD COLUMN "isMock" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "SocialAccount_userId_platform_key" ON "SocialAccount"("userId", "platform");
