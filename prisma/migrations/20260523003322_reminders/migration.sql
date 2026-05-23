-- CreateEnum
CREATE TYPE "ReminderCategory" AS ENUM ('LOCKDOWN', 'MEDICATION', 'INCUBATION', 'HATCHING', 'FEEDING', 'GENERAL');

-- CreateTable
CREATE TABLE "Reminder" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" "ReminderCategory" NOT NULL DEFAULT 'GENERAL',
    "dueAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "location" TEXT,
    "hatchId" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reminder_dueAt_idx" ON "Reminder"("dueAt");

-- CreateIndex
CREATE INDEX "Reminder_completed_idx" ON "Reminder"("completed");

-- AddForeignKey
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_hatchId_fkey" FOREIGN KEY ("hatchId") REFERENCES "Hatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
