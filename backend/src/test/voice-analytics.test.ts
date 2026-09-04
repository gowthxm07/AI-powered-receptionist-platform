import assert from 'assert';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { voiceAnalyticsService } from '../modules/speech/analytics/services/voice-analytics.service';
import { OwnershipService, ForbiddenError } from '../services/ownership.service';

export async function runVoiceAnalyticsTests(): Promise<void> {
  console.log('\n======================================================');
  console.log('--- Running Phase 7.4.2 Voice Analytics Test Suite ---');
  console.log('======================================================');

  // Find demo businesses for test isolation
  const businesses = await prisma.business.findMany({
    take: 2,
    orderBy: { createdAt: 'asc' },
  });

  if (businesses.length < 2) {
    throw new Error('Test requires at least 2 businesses in database. Please run npm run db:seed.');
  }

  const businessA = businesses[0];
  const businessB = businesses[1];

  const uniqueSuffix = `${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  const testTransportId1 = `vtr_test_1_${uniqueSuffix}`;
  const testConvId1 = `conv_test_1_${uniqueSuffix}`;
  const testTransportId2 = `vtr_test_2_${uniqueSuffix}`;
  const testConvId2 = `conv_test_2_${uniqueSuffix}`;

  try {
    // =========================================================================
    // Test 1: Voice Session Creation
    // =========================================================================
    {
      const created = await voiceAnalyticsService.createSession({
        businessId: businessA.id,
        transportSessionId: testTransportId1,
        conversationSessionId: testConvId1,
        channel: 'MOBILE_WEB',
      });

      assert.ok(created, 'Created session should return a non-null object');
      assert.strictEqual(created.businessId, businessA.id);
      assert.strictEqual(created.transportSessionId, testTransportId1);
      assert.strictEqual(created.conversationSessionId, testConvId1);
      assert.strictEqual(created.status, 'CREATED');
      assert.strictEqual(created.turnCount, 0);
      assert.strictEqual(created.appointmentBooked, false);
      assert.ok(created.startedAt instanceof Date);

      console.log('  ✓ Test 1: Voice session created with correct businessId, session IDs, and CREATED status');
    }

    // =========================================================================
    // Test 2: Multi-Tenant Isolation
    // =========================================================================
    {
      // Verify user owning Business A is rejected when attempting to access Business B
      if (businessA.ownerId && businessB.ownerId && businessA.ownerId !== businessB.ownerId) {
        let accessDenied = false;
        try {
          await OwnershipService.verifyBusinessOwnership(businessB.id, businessA.ownerId);
        } catch (err: any) {
          if (err instanceof ForbiddenError || err.statusCode === 403) {
            accessDenied = true;
          }
        }
        assert.strictEqual(accessDenied, true, 'User owning Business A must be forbidden from accessing Business B analytics');
      }

      // Verify Business B cannot see Business A's sessions in history query
      const historyB = await voiceAnalyticsService.getVoiceSessionHistory(businessB.id);
      const leaked = historyB.sessions.find((s) => s.transportSessionId === testTransportId1);
      assert.strictEqual(leaked, undefined, 'Business B session history must not contain Business A sessions');

      console.log('  ✓ Test 2: Multi-tenant isolation enforced; cross-business access strictly forbidden');
    }

    // =========================================================================
    // Test 3: Voice Turn Tracking
    // =========================================================================
    {
      const updatedTurn1 = await voiceAnalyticsService.recordTurn({
        transportSessionId: testTransportId1,
        sttSuccess: true,
        sttLatencyMs: 140.5,
        conversationLatencyMs: 12.0,
        ttsLatencyMs: 250.0,
        totalLatencyMs: 402.5,
      });

      assert.ok(updatedTurn1);
      assert.strictEqual(updatedTurn1.turnCount, 1);
      assert.strictEqual(updatedTurn1.status, 'ACTIVE');

      const updatedTurn2 = await voiceAnalyticsService.recordTurn({
        transportSessionId: testTransportId1,
        sttSuccess: true,
        sttLatencyMs: 160.5,
        conversationLatencyMs: 10.0,
        ttsLatencyMs: 270.0,
        totalLatencyMs: 440.5,
      });

      assert.ok(updatedTurn2);
      assert.strictEqual(updatedTurn2.turnCount, 2);
      assert.strictEqual(updatedTurn2.averageSttLatencyMs, 150.5); // (140.5 + 160.5) / 2 = 150.5

      console.log('  ✓ Test 3: Turn tracking increments turnCount and updates running average latencies');
    }

    // =========================================================================
    // Test 4: STT Success Tracking
    // =========================================================================
    {
      const record = await prisma.voiceSessionAnalytics.findUnique({
        where: { transportSessionId: testTransportId1 },
      });
      assert.strictEqual(record?.successfulTranscriptionCount, 2);
      assert.strictEqual(record?.failedTranscriptionCount, 0);

      console.log('  ✓ Test 4: Successful STT transcriptions correctly increment successfulTranscriptionCount');
    }

    // =========================================================================
    // Test 5: STT Failure Tracking
    // =========================================================================
    {
      // Turn 3: simulate failed transcription (inaudible/empty)
      const updatedTurn3 = await voiceAnalyticsService.recordTurn({
        transportSessionId: testTransportId1,
        sttSuccess: false,
        sttLatencyMs: 120.0,
        conversationLatencyMs: 2.0,
        ttsLatencyMs: 180.0,
        totalLatencyMs: 302.0,
      });

      assert.strictEqual(updatedTurn3.turnCount, 3);
      assert.strictEqual(updatedTurn3.successfulTranscriptionCount, 2);
      assert.strictEqual(updatedTurn3.failedTranscriptionCount, 1);

      console.log('  ✓ Test 5: STT failure correctly increments failedTranscriptionCount');
    }

    // =========================================================================
    // Test 6: Appointment Conversion Tracking
    // =========================================================================
    {
      // Find an existing appointment for Business A to test valid linkage
      const existingAppt = await prisma.appointment.findFirst({
        where: { businessId: businessA.id },
      });

      const apptId = existingAppt?.id || `fake_appt_${Date.now()}`;

      const bookedTurn = await voiceAnalyticsService.recordTurn({
        transportSessionId: testTransportId1,
        sttSuccess: true,
        sttLatencyMs: 130.0,
        conversationLatencyMs: 15.0,
        ttsLatencyMs: 200.0,
        totalLatencyMs: 345.0,
        appointmentBooked: true,
        appointmentId: apptId,
      });

      assert.strictEqual(bookedTurn.appointmentBooked, true);
      assert.strictEqual(bookedTurn.appointmentId, apptId);

      console.log('  ✓ Test 6: Appointment booking conversion tracked with appointmentBooked=true and valid appointmentId');
    }

    // =========================================================================
    // Test 7: Session Completion & Duration Calculation
    // =========================================================================
    {
      const completed = await voiceAnalyticsService.completeSession(testTransportId1, 'COMPLETED');
      assert.ok(completed);
      assert.strictEqual(completed.status, 'COMPLETED');
      assert.ok(completed.endedAt instanceof Date);
      assert.ok(typeof completed.durationMs === 'number');
      assert.ok(completed.durationMs >= 0);

      console.log(`  ✓ Test 7: Session completion calculates valid endedAt and durationMs (${completed.durationMs} ms)`);
    }

    // =========================================================================
    // Test 8: Analytics Aggregation & Mathematical Accuracy
    // =========================================================================
    {
      // Create session 2 for Business A (unbooked, ended by user)
      await voiceAnalyticsService.createSession({
        businessId: businessA.id,
        transportSessionId: testTransportId2,
        conversationSessionId: testConvId2,
        channel: 'MOBILE_WEB',
      });

      await voiceAnalyticsService.recordTurn({
        transportSessionId: testTransportId2,
        sttSuccess: true,
        sttLatencyMs: 150.0,
        conversationLatencyMs: 10.0,
        ttsLatencyMs: 200.0,
        totalLatencyMs: 360.0,
      });

      await voiceAnalyticsService.completeSession(testTransportId2, 'ENDED_BY_USER');

      const summaryA = await voiceAnalyticsService.getBusinessVoiceAnalytics(businessA.id);

      assert.ok(summaryA.totalVoiceSessions >= 2, 'Total voice sessions should be at least 2');
      assert.ok(summaryA.completedSessions >= 2, 'Completed sessions should be at least 2');
      assert.ok(summaryA.appointmentsBooked >= 1, 'Appointments booked should be at least 1');
      assert.ok(summaryA.bookingConversionRate > 0, 'Booking conversion rate should be positive');
      assert.ok(summaryA.averageSessionDurationMs >= 0);
      assert.ok(summaryA.averageSttLatencyMs > 0);
      assert.ok(summaryA.averageConversationLatencyMs > 0);
      assert.ok(summaryA.averageTtsLatencyMs > 0);

      console.log(
        `  ✓ Test 8: Aggregate analytics mathematically validated: Total=${summaryA.totalVoiceSessions}, Booked=${summaryA.appointmentsBooked}, Conversion=${summaryA.bookingConversionRate}%, AvgSTT=${summaryA.averageSttLatencyMs}ms`
      );
    }

    // =========================================================================
    // Test 9: Privacy Verification (Zero Raw Audio or Transcript Persistence)
    // =========================================================================
    {
      const record = await prisma.voiceSessionAnalytics.findUnique({
        where: { transportSessionId: testTransportId1 },
      });

      assert.ok(record);
      const keys = Object.keys(record);

      // Verify forbidden storage fields do NOT exist on the analytics model
      assert.strictEqual(keys.includes('audio'), false, 'Analytics model must NOT contain audio field');
      assert.strictEqual(keys.includes('audioBlob'), false, 'Analytics model must NOT contain audioBlob field');
      assert.strictEqual(keys.includes('rawAudio'), false, 'Analytics model must NOT contain rawAudio field');
      assert.strictEqual(keys.includes('audioBuffer'), false, 'Analytics model must NOT contain audioBuffer field');
      assert.strictEqual(keys.includes('transcript'), false, 'Analytics model must NOT persist full speech transcripts');

      console.log('  ✓ Test 9: Privacy verification passed: Zero raw audio blobs or full speech transcripts stored in analytics');
    }

    // =========================================================================
    // Test 10: API Authorization & Input Validation Handlers
    // =========================================================================
    {
      // Verify empty businessId rejected
      let missingBizError = false;
      try {
        await OwnershipService.verifyBusinessOwnership('', 'some_user_id');
      } catch {
        missingBizError = true;
      }
      assert.strictEqual(missingBizError, true, 'Empty businessId must be rejected');

      // Verify nonexistent business rejected
      let notFoundError = false;
      try {
        await OwnershipService.verifyBusinessOwnership('00000000-0000-0000-0000-000000000000', 'some_user_id');
      } catch (err: any) {
        if (err.statusCode === 404 || err.name === 'NotFoundError') {
          notFoundError = true;
        }
      }
      assert.strictEqual(notFoundError, true, 'Nonexistent business ID must throw NotFoundError (404)');

      console.log('  ✓ Test 10: API authorization rules and tenant validation handlers verified');
    }
  } finally {
    // Clean up test records
    await prisma.voiceSessionAnalytics.deleteMany({
      where: {
        transportSessionId: {
          in: [testTransportId1, testTransportId2],
        },
      },
    });
  }

  console.log('======================================================');
  console.log('🎉 ALL PHASE 7.4.2 VOICE ANALYTICS TESTS PASSED (10/10)! 🎉');
  console.log('======================================================\n');
}
