BEGIN;

ALTER TABLE "User"
  ADD COLUMN "deactivatedAt" TIMESTAMP(3),
  ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Class" DROP CONSTRAINT "Class_userId_fkey",
  ADD CONSTRAINT "Class_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Student" DROP CONSTRAINT "Student_userId_fkey",
  ADD CONSTRAINT "Student_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FeeType" DROP CONSTRAINT "FeeType_userId_fkey",
  ADD CONSTRAINT "FeeType_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StudentFee" DROP CONSTRAINT "StudentFee_userId_fkey",
  ADD CONSTRAINT "StudentFee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "FeeInstallment" DROP CONSTRAINT "FeeInstallment_userId_fkey",
  ADD CONSTRAINT "FeeInstallment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Receipt" DROP CONSTRAINT "Receipt_userId_fkey",
  ADD CONSTRAINT "Receipt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Refund" DROP CONSTRAINT "Refund_userId_fkey",
  ADD CONSTRAINT "Refund_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Staff" DROP CONSTRAINT "Staff_userId_fkey",
  ADD CONSTRAINT "Staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StaffSalary" DROP CONSTRAINT "StaffSalary_userId_fkey",
  ADD CONSTRAINT "StaffSalary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SalaryPayment" DROP CONSTRAINT "SalaryPayment_userId_fkey",
  ADD CONSTRAINT "SalaryPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Expense" DROP CONSTRAINT "Expense_userId_fkey",
  ADD CONSTRAINT "Expense_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ClassSchedule" DROP CONSTRAINT "ClassSchedule_userId_fkey",
  ADD CONSTRAINT "ClassSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CourseMaterial" DROP CONSTRAINT "CourseMaterial_userId_fkey",
  ADD CONSTRAINT "CourseMaterial_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "InstituteSettings"
  ADD COLUMN "offlineMode" TEXT NOT NULL DEFAULT 'ALL_DEVICES',
  ADD COLUMN "offlineMaxDays" INTEGER NOT NULL DEFAULT 7,
  ADD CONSTRAINT "InstituteSettings_offlineMode_check" CHECK ("offlineMode" IN ('ALL_DEVICES', 'TRUSTED_DEVICES', 'DISABLED')),
  ADD CONSTRAINT "InstituteSettings_offlineMaxDays_check" CHECK ("offlineMaxDays" BETWEEN 1 AND 7);

CREATE TABLE "OfflineDevice" (
  "userId" INTEGER NOT NULL,
  "deviceId" UUID NOT NULL,
  "label" TEXT NOT NULL,
  "trusted" BOOLEAN NOT NULL DEFAULT false,
  "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OfflineDevice_pkey" PRIMARY KEY ("userId", "deviceId"),
  CONSTRAINT "OfflineDevice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

ALTER TABLE "SyncMutation" ADD COLUMN "recordKeys" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
CREATE INDEX "SyncMutation_recordKeys_idx" ON "SyncMutation" USING GIN ("recordKeys");

-- Track the actual rows changed by a sync transaction, including FK cascades.
CREATE FUNCTION collect_sync_record_keys() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
DECLARE
  captured TEXT := NULLIF(current_setting('jahan.sync_record_keys', true), '');
  changes JSONB;
BEGIN
  IF captured IS NOT NULL THEN
    changes := captured::JSONB || jsonb_build_array(
      TG_TABLE_NAME || ':' || (CASE WHEN TG_OP = 'DELETE' THEN OLD.id ELSE NEW.id END)::TEXT
    );
    IF TG_TABLE_NAME = 'StaffSalary' THEN
      IF TG_OP <> 'INSERT' THEN
        changes := changes || jsonb_build_array('StaffRate:' || OLD."staffId"::TEXT);
      END IF;
      IF TG_OP <> 'DELETE' THEN
        changes := changes || jsonb_build_array('StaffRate:' || NEW."staffId"::TEXT);
      END IF;
    END IF;
    PERFORM set_config('jahan.sync_record_keys', changes::TEXT, true);
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER sync_record_keys AFTER INSERT OR UPDATE OR DELETE ON "Class"
  FOR EACH ROW EXECUTE FUNCTION collect_sync_record_keys();
CREATE TRIGGER sync_record_keys AFTER INSERT OR UPDATE OR DELETE ON "Student"
  FOR EACH ROW EXECUTE FUNCTION collect_sync_record_keys();
CREATE TRIGGER sync_record_keys AFTER INSERT OR UPDATE OR DELETE ON "FeeType"
  FOR EACH ROW EXECUTE FUNCTION collect_sync_record_keys();
CREATE TRIGGER sync_record_keys AFTER INSERT OR UPDATE OR DELETE ON "StudentFee"
  FOR EACH ROW EXECUTE FUNCTION collect_sync_record_keys();
CREATE TRIGGER sync_record_keys AFTER INSERT OR UPDATE OR DELETE ON "FeeInstallment"
  FOR EACH ROW EXECUTE FUNCTION collect_sync_record_keys();
CREATE TRIGGER sync_record_keys AFTER INSERT OR UPDATE OR DELETE ON "Receipt"
  FOR EACH ROW EXECUTE FUNCTION collect_sync_record_keys();
CREATE TRIGGER sync_record_keys AFTER INSERT OR UPDATE OR DELETE ON "Refund"
  FOR EACH ROW EXECUTE FUNCTION collect_sync_record_keys();
CREATE TRIGGER sync_record_keys AFTER INSERT OR UPDATE OR DELETE ON "Staff"
  FOR EACH ROW EXECUTE FUNCTION collect_sync_record_keys();
CREATE TRIGGER sync_record_keys AFTER INSERT OR UPDATE OR DELETE ON "StaffSalary"
  FOR EACH ROW EXECUTE FUNCTION collect_sync_record_keys();
CREATE TRIGGER sync_record_keys AFTER INSERT OR UPDATE OR DELETE ON "SalaryPayment"
  FOR EACH ROW EXECUTE FUNCTION collect_sync_record_keys();
CREATE TRIGGER sync_record_keys AFTER INSERT OR UPDATE OR DELETE ON "Expense"
  FOR EACH ROW EXECUTE FUNCTION collect_sync_record_keys();
CREATE TRIGGER sync_record_keys AFTER INSERT OR UPDATE OR DELETE ON "ClassSchedule"
  FOR EACH ROW EXECUTE FUNCTION collect_sync_record_keys();
CREATE TRIGGER sync_record_keys AFTER INSERT OR UPDATE OR DELETE ON "CourseMaterial"
  FOR EACH ROW EXECUTE FUNCTION collect_sync_record_keys();
CREATE TRIGGER sync_record_keys AFTER INSERT OR UPDATE OR DELETE ON "InstituteSettings"
  FOR EACH ROW EXECUTE FUNCTION collect_sync_record_keys();

COMMIT;
