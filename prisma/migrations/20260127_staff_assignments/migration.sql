-- CreateTable
CREATE TABLE "StaffAssignment" (
    "id" TEXT NOT NULL,
    "staffContactId" TEXT NOT NULL,
    "parentContactId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StaffAssignment_staffContactId_idx" ON "StaffAssignment"("staffContactId");

-- CreateIndex
CREATE INDEX "StaffAssignment_parentContactId_idx" ON "StaffAssignment"("parentContactId");

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_staffContactId_fkey" FOREIGN KEY ("staffContactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StaffAssignment" ADD CONSTRAINT "StaffAssignment_parentContactId_fkey" FOREIGN KEY ("parentContactId") REFERENCES "Contact"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate existing staff relationships
INSERT INTO "StaffAssignment" ("id", "staffContactId", "parentContactId", "startDate", "createdAt")
SELECT
    gen_random_uuid()::text,
    "id",
    "parentContactId",
    "createdAt",
    NOW()
FROM "Contact"
WHERE "parentContactId" IS NOT NULL;

-- Drop old column and constraint
ALTER TABLE "Contact" DROP CONSTRAINT IF EXISTS "Contact_parentContactId_fkey";
ALTER TABLE "Contact" DROP COLUMN IF EXISTS "parentContactId";
