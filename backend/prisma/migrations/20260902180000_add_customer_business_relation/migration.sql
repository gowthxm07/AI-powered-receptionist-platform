-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "businessId" TEXT;

-- CreateIndex
CREATE INDEX "customers_businessId_idx" ON "customers"("businessId");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
