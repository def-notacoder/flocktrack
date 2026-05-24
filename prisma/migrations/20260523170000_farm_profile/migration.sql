-- CreateTable
CREATE TABLE "FarmProfile" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "ownerName" TEXT,
    "farmName" TEXT,
    "description" TEXT,
    "location" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FarmProfile_pkey" PRIMARY KEY ("id")
);

-- Insert default row
INSERT INTO "FarmProfile" ("id", "updatedAt") VALUES ('default', CURRENT_TIMESTAMP);
