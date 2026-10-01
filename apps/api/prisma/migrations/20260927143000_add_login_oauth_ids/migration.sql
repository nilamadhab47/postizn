-- AlterTable
ALTER TABLE "User" ADD COLUMN "linkedinId" TEXT;
ALTER TABLE "User" ADD COLUMN "twitterId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_linkedinId_key" ON "User"("linkedinId");

-- CreateIndex
CREATE UNIQUE INDEX "User_twitterId_key" ON "User"("twitterId");
