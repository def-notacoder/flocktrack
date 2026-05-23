-- AlterTable
ALTER TABLE "Reminder" ADD COLUMN "sourceKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Reminder_sourceKey_key" ON "Reminder"("sourceKey");
