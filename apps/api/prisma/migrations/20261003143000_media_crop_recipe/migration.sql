-- AlterTable
ALTER TABLE "Media" ADD COLUMN "parentId" TEXT;
ALTER TABLE "Media" ADD COLUMN "recipe" JSONB;

-- CreateIndex
CREATE INDEX "Media_parentId_idx" ON "Media"("parentId");

-- AddForeignKey
ALTER TABLE "Media" ADD CONSTRAINT "Media_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
