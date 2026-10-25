-- AlterTable
ALTER TABLE "Refund" ADD COLUMN     "receiptId" INTEGER;

-- CreateIndex
CREATE INDEX "Refund_receiptId_idx" ON "Refund"("receiptId");

-- AddForeignKey
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "Receipt"("id") ON DELETE SET NULL ON UPDATE CASCADE;
