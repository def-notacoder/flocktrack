-- CreateEnum
CREATE TYPE "HatchStatus" AS ENUM ('INCUBATING', 'LOCKDOWN', 'HATCHING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "HatchEggStatus" AS ENUM ('INCUBATING', 'LOCKDOWN', 'HATCHING', 'HATCHED', 'NOT_VIABLE', 'FAILED_HATCH', 'DISCARDED');

-- CreateEnum
CREATE TYPE "DevelopmentAssessment" AS ENUM ('DEVELOPING_WELL', 'STALLED', 'INFERTILE', 'BLOOD_RING', 'DEAD_EMBRYO', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "HatchingStage" AS ENUM ('PIPPED', 'ZIPPED', 'HATCHED', 'DRYING', 'ASSISTED', 'STUCK', 'DIED_IN_SHELL', 'OTHER');

-- CreateEnum
CREATE TYPE "ChickHealthAtHatch" AS ENUM ('STRONG', 'WEAK', 'NAVAL_ISSUE', 'SPLAY_LEG', 'INJURY', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "HatchEventType" AS ENUM ('SET', 'CANDLING', 'LOCKDOWN', 'HATCH', 'OTHER');

-- CreateEnum
CREATE TYPE "ChickenOrigin" AS ENUM ('FROM_EGG', 'PURCHASED', 'HATCHED_ELSEWHERE', 'OTHER');

-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('HEN', 'ROOSTER', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "BirdStatus" AS ENUM ('ACTIVE', 'SOLD', 'REHOMED', 'DECEASED');

-- CreateEnum
CREATE TYPE "LifeStage" AS ENUM ('CHICK', 'PULLET', 'ADULT');

-- CreateEnum
CREATE TYPE "HealthEventType" AS ENUM ('HATCH', 'CHECKUP', 'ILLNESS', 'TREATMENT', 'VACCINATION', 'INJURY', 'DEATH', 'OTHER');

-- CreateEnum
CREATE TYPE "LifeStageHealth" AS ENUM ('CHICK', 'JUVENILE', 'ADULT');

-- CreateTable
CREATE TABLE "PoultryPreset" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "poultryLabel" TEXT NOT NULL,
    "incubationDays" INTEGER NOT NULL,
    "lockdownDay" INTEGER NOT NULL,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PoultryPreset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hatch" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "poultryLabel" TEXT NOT NULL,
    "presetId" TEXT,
    "incubationDays" INTEGER NOT NULL,
    "lockdownDay" INTEGER NOT NULL,
    "setDate" DATE NOT NULL,
    "lockdownAt" TIMESTAMP(3),
    "expectedHatchDate" DATE,
    "actualHatchDate" DATE,
    "breed" TEXT,
    "source" TEXT,
    "notes" TEXT,
    "status" "HatchStatus" NOT NULL DEFAULT 'INCUBATING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HatchEgg" (
    "id" TEXT NOT NULL,
    "hatchId" TEXT NOT NULL,
    "eggNumber" INTEGER NOT NULL,
    "label" TEXT,
    "status" "HatchEggStatus" NOT NULL DEFAULT 'INCUBATING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HatchEgg_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HatchEggLog" (
    "id" TEXT NOT NULL,
    "hatchEggId" TEXT NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "incubationDay" INTEGER NOT NULL,
    "assessment" "DevelopmentAssessment" NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HatchEggLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HatchEggHatchingLog" (
    "id" TEXT NOT NULL,
    "hatchEggId" TEXT NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hatchingDay" INTEGER,
    "stage" "HatchingStage" NOT NULL,
    "chickHealth" "ChickHealthAtHatch",
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HatchEggHatchingLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HatchEvent" (
    "id" TEXT NOT NULL,
    "hatchId" TEXT NOT NULL,
    "eventType" "HatchEventType" NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "incubationDay" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HatchEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Chicken" (
    "id" TEXT NOT NULL,
    "origin" "ChickenOrigin" NOT NULL,
    "hatchEggId" TEXT,
    "hatchId" TEXT,
    "poultryLabel" TEXT NOT NULL,
    "tagNumber" TEXT NOT NULL,
    "name" TEXT,
    "colorMarking" TEXT,
    "sex" "Sex" NOT NULL,
    "breed" TEXT,
    "notes" TEXT,
    "lifeStage" "LifeStage" NOT NULL DEFAULT 'CHICK',
    "status" "BirdStatus" NOT NULL DEFAULT 'ACTIVE',
    "acquiredOn" DATE NOT NULL,
    "hatchedAt" TIMESTAMP(3),
    "deceasedAt" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Chicken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HealthRecord" (
    "id" TEXT NOT NULL,
    "chickenId" TEXT NOT NULL,
    "lifeStage" "LifeStageHealth" NOT NULL,
    "eventType" "HealthEventType" NOT NULL,
    "observedOn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "symptoms" TEXT,
    "treatment" TEXT,
    "medication" TEXT,
    "followUpOn" DATE,
    "resolved" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HealthRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LayingRecord" (
    "id" TEXT NOT NULL,
    "chickenId" TEXT,
    "recordedOn" DATE NOT NULL,
    "count" INTEGER NOT NULL,
    "location" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LayingRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PoultryPreset_name_key" ON "PoultryPreset"("name");

-- CreateIndex
CREATE INDEX "Hatch_status_idx" ON "Hatch"("status");

-- CreateIndex
CREATE UNIQUE INDEX "HatchEgg_hatchId_eggNumber_key" ON "HatchEgg"("hatchId", "eggNumber");

-- CreateIndex
CREATE INDEX "HatchEggLog_hatchEggId_idx" ON "HatchEggLog"("hatchEggId");

-- CreateIndex
CREATE INDEX "HatchEggHatchingLog_hatchEggId_idx" ON "HatchEggHatchingLog"("hatchEggId");

-- CreateIndex
CREATE INDEX "HatchEvent_hatchId_idx" ON "HatchEvent"("hatchId");

-- CreateIndex
CREATE UNIQUE INDEX "Chicken_hatchEggId_key" ON "Chicken"("hatchEggId");

-- CreateIndex
CREATE UNIQUE INDEX "Chicken_tagNumber_key" ON "Chicken"("tagNumber");

-- CreateIndex
CREATE INDEX "Chicken_status_idx" ON "Chicken"("status");

-- CreateIndex
CREATE INDEX "Chicken_hatchId_idx" ON "Chicken"("hatchId");

-- CreateIndex
CREATE INDEX "HealthRecord_chickenId_idx" ON "HealthRecord"("chickenId");

-- CreateIndex
CREATE INDEX "LayingRecord_recordedOn_idx" ON "LayingRecord"("recordedOn");

-- AddForeignKey
ALTER TABLE "Hatch" ADD CONSTRAINT "Hatch_presetId_fkey" FOREIGN KEY ("presetId") REFERENCES "PoultryPreset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HatchEgg" ADD CONSTRAINT "HatchEgg_hatchId_fkey" FOREIGN KEY ("hatchId") REFERENCES "Hatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HatchEggLog" ADD CONSTRAINT "HatchEggLog_hatchEggId_fkey" FOREIGN KEY ("hatchEggId") REFERENCES "HatchEgg"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HatchEggHatchingLog" ADD CONSTRAINT "HatchEggHatchingLog_hatchEggId_fkey" FOREIGN KEY ("hatchEggId") REFERENCES "HatchEgg"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HatchEvent" ADD CONSTRAINT "HatchEvent_hatchId_fkey" FOREIGN KEY ("hatchId") REFERENCES "Hatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chicken" ADD CONSTRAINT "Chicken_hatchEggId_fkey" FOREIGN KEY ("hatchEggId") REFERENCES "HatchEgg"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Chicken" ADD CONSTRAINT "Chicken_hatchId_fkey" FOREIGN KEY ("hatchId") REFERENCES "Hatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HealthRecord" ADD CONSTRAINT "HealthRecord_chickenId_fkey" FOREIGN KEY ("chickenId") REFERENCES "Chicken"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LayingRecord" ADD CONSTRAINT "LayingRecord_chickenId_fkey" FOREIGN KEY ("chickenId") REFERENCES "Chicken"("id") ON DELETE SET NULL ON UPDATE CASCADE;
