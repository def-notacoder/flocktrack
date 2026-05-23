-- AlterTable
ALTER TABLE "Hatch" ADD COLUMN     "archivedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "Hatch_archivedAt_idx" ON "Hatch"("archivedAt");
