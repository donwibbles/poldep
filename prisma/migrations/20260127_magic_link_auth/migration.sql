-- AlterTable: Remove password-related columns from User
ALTER TABLE "User" DROP COLUMN IF EXISTS "failedLoginAttempts";
ALTER TABLE "User" DROP COLUMN IF EXISTS "lockedUntil";
ALTER TABLE "User" DROP COLUMN IF EXISTS "passwordHash";

-- CreateTable: MagicLink
CREATE TABLE "MagicLink" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MagicLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MagicLink_token_key" ON "MagicLink"("token");

-- CreateIndex
CREATE INDEX "MagicLink_email_idx" ON "MagicLink"("email");
