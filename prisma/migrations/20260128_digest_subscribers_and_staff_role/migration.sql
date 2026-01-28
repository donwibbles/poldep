-- Add role field to StaffAssignment
ALTER TABLE "StaffAssignment" ADD COLUMN "role" TEXT;

-- CreateTable for DigestSubscriber
CREATE TABLE "DigestSubscriber" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "frequency" "DigestFrequency" NOT NULL DEFAULT 'WEEKLY',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DigestSubscriber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DigestSubscriber_email_key" ON "DigestSubscriber"("email");

-- CreateIndex
CREATE INDEX "DigestSubscriber_frequency_isActive_idx" ON "DigestSubscriber"("frequency", "isActive");
