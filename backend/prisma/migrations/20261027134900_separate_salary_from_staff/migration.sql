CREATE TABLE "StaffSalary" (
    "id" SERIAL NOT NULL,
    "staffId" INTEGER NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "effectiveFrom" DATE NOT NULL,
    "userId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StaffSalary_pkey" PRIMARY KEY ("id")
);

INSERT INTO "StaffSalary" ("staffId", "amount", "effectiveFrom", "userId")
SELECT "id", "salary", CURRENT_DATE, "userId"
FROM "Staff"
WHERE "salary" > 0;

CREATE UNIQUE INDEX "StaffSalary_staffId_effectiveFrom_key"
ON "StaffSalary"("staffId", "effectiveFrom");

CREATE INDEX "StaffSalary_staffId_effectiveFrom_idx"
ON "StaffSalary"("staffId", "effectiveFrom");

CREATE INDEX "StaffSalary_userId_idx"
ON "StaffSalary"("userId");

ALTER TABLE "StaffSalary"
ADD CONSTRAINT "StaffSalary_staffId_fkey"
FOREIGN KEY ("staffId") REFERENCES "Staff"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StaffSalary"
ADD CONSTRAINT "StaffSalary_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Staff" DROP COLUMN "salary";
