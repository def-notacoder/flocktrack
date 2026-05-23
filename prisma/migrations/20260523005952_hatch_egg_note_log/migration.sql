-- CreateTable
CREATE TABLE "HatchEggNote" (
    "id" TEXT NOT NULL,
    "hatchEggId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HatchEggNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HatchEggNote_hatchEggId_idx" ON "HatchEggNote"("hatchEggId");

-- AddForeignKey
ALTER TABLE "HatchEggNote" ADD CONSTRAINT "HatchEggNote_hatchEggId_fkey" FOREIGN KEY ("hatchEggId") REFERENCES "HatchEgg"("id") ON DELETE CASCADE ON UPDATE CASCADE;
