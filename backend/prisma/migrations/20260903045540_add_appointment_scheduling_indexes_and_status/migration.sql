-- AlterEnum
ALTER TYPE "AppointmentStatus" ADD VALUE 'NO_SHOW';

-- CreateIndex
CREATE INDEX "appointments_businessId_startTime_idx" ON "appointments"("businessId", "startTime");

-- CreateIndex
CREATE INDEX "appointments_staffId_startTime_idx" ON "appointments"("staffId", "startTime");
