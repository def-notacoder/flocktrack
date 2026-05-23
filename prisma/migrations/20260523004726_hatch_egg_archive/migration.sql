-- AlterTable
ALTER TABLE "HatchEgg" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "HatchEgg_archivedAt_idx" ON "HatchEgg"("archivedAt");
