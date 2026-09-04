-- CreateEnum
CREATE TYPE "VoiceSessionStatus" AS ENUM ('CREATED', 'ACTIVE', 'COMPLETED', 'ENDED_BY_USER', 'ERROR', 'EXPIRED');

-- CreateTable
CREATE TABLE "voice_session_analytics" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "transportSessionId" TEXT NOT NULL,
    "conversationSessionId" TEXT NOT NULL,
    "customerId" TEXT,
    "channel" TEXT NOT NULL DEFAULT 'MOBILE_WEB',
    "status" "VoiceSessionStatus" NOT NULL DEFAULT 'CREATED',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "turnCount" INTEGER NOT NULL DEFAULT 0,
    "successfulTranscriptionCount" INTEGER NOT NULL DEFAULT 0,
    "failedTranscriptionCount" INTEGER NOT NULL DEFAULT 0,
    "appointmentBooked" BOOLEAN NOT NULL DEFAULT false,
    "appointmentId" TEXT,
    "averageSttLatencyMs" DOUBLE PRECISION,
    "averageConversationLatencyMs" DOUBLE PRECISION,
    "averageTtsLatencyMs" DOUBLE PRECISION,
    "totalLatencyMs" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_session_analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "voice_session_analytics_transportSessionId_key" ON "voice_session_analytics"("transportSessionId");

-- CreateIndex
CREATE INDEX "voice_session_analytics_businessId_idx" ON "voice_session_analytics"("businessId");

-- CreateIndex
CREATE INDEX "voice_session_analytics_businessId_status_idx" ON "voice_session_analytics"("businessId", "status");

-- CreateIndex
CREATE INDEX "voice_session_analytics_businessId_createdAt_idx" ON "voice_session_analytics"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "voice_session_analytics_transportSessionId_idx" ON "voice_session_analytics"("transportSessionId");

-- CreateIndex
CREATE INDEX "voice_session_analytics_conversationSessionId_idx" ON "voice_session_analytics"("conversationSessionId");

-- CreateIndex
CREATE INDEX "voice_session_analytics_customerId_idx" ON "voice_session_analytics"("customerId");

-- CreateIndex
CREATE INDEX "voice_session_analytics_appointmentId_idx" ON "voice_session_analytics"("appointmentId");

-- AddForeignKey
ALTER TABLE "voice_session_analytics" ADD CONSTRAINT "voice_session_analytics_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_session_analytics" ADD CONSTRAINT "voice_session_analytics_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_session_analytics" ADD CONSTRAINT "voice_session_analytics_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
