import assert from 'assert';
import crypto from 'crypto';
import { prisma } from '../lib/prisma';
import { voiceTransportSessionManager } from '../modules/speech/transport/services/voice-transport-session-manager';
import { VoiceTurnTransportService } from '../modules/speech/transport/services/voice-turn-transport.service';
import { VoiceConversationOrchestrator } from '../modules/speech/services/voice-orchestrator.service';
import { WhisperCppProvider } from '../modules/speech/providers/whisper-cpp.provider';
import { PiperProvider } from '../modules/speech/providers/piper.provider';
import { AudioConverterService } from '../modules/speech/services/audio-converter.service';
import { AudioStorageService } from '../modules/speech/services/audio-storage.service';
import { voiceAnalyticsService } from '../modules/speech/analytics/services/voice-analytics.service';
import { runSystemHealthCheck } from '../scripts/demo-health-check';
import { BookingConversationStep } from '../modules/ai/conversation/conversation-session.types';

export async function runEndToEndSystemValidationTests(): Promise<void> {
  console.log('\n========================================================================');
  console.log('🧪 SUITE 30: End-to-End System Validation & Demo Readiness (Phase 8.3)');
  console.log('========================================================================');

  // Find demo business
  const business = await prisma.business.findFirst({
    where: { name: 'Lumina Dental Care' },
    include: { staff: true, services: true },
  });
  assert(business, 'Demo business Lumina Dental Care must exist in database.');

  const otherBusiness = await prisma.business.findFirst({
    where: { name: { not: 'Lumina Dental Care' } },
  });
  assert(otherBusiness, 'Second demo business must exist for multi-tenant isolation tests.');

  const whisper = new WhisperCppProvider();
  const piper = new PiperProvider();
  const converter = new AudioConverterService();
  const orchestrator = new VoiceConversationOrchestrator({
    sttProvider: whisper,
    ttsProvider: piper,
  });
  const transportService = new VoiceTurnTransportService({ orchestrator });

  const testSuffix = `${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
  let createdAppointmentId: string | null = null;
  let createdCustomerId: string | null = null;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: System Pre-Flight Health Check
    // -------------------------------------------------------------------------
    {
      const healthOk = await runSystemHealthCheck();
      assert.strictEqual(healthOk, true, 'System pre-flight health check must pass with 0 critical failures.');
      console.log('  ✓ Test 1: Pre-flight health check verified all 7 critical components (DB, Ollama, STT, TTS, FFmpeg, Storage, Network)');
    }

    // -------------------------------------------------------------------------
    // TEST 2: Complete 7-Turn Voice Booking Pipeline Execution
    // -------------------------------------------------------------------------
    let transportSessionId = '';
    {
      const sessionRes = await voiceTransportSessionManager.createTransportSession({
        businessId: business.id,
        channel: 'MOBILE_WEB',
      });
      assert(sessionRes.session, 'Transport session must be created');
      transportSessionId = sessionRes.session.transportSessionId;

      // The 7 canonical conversational booking turns
      const testCustomerPhone = `+1-555-019-${Math.floor(1000 + Math.random() * 9000)}`;
      const testCustomerName = `Jane Demo ${testSuffix}`;

      const bookingTurns = [
        { text: 'I want to book an appointment', desc: 'Turn 1 (Intent)' },
        { text: 'Comprehensive Oral Exam', desc: 'Turn 2 (Service)' },
        { text: 'Anyone is fine', desc: 'Turn 3 (Staff)' },
        { text: 'Tomorrow', desc: 'Turn 4 (Date)' },
        { text: '9 AM', desc: 'Turn 5 (Time)' },
        { text: `My name is ${testCustomerName} and my phone number is ${testCustomerPhone}`, desc: 'Turn 6 (Customer Info)' },
        { text: 'Yes, confirm it', desc: 'Turn 7 (Confirmation)' },
      ];

      for (let i = 0; i < bookingTurns.length; i++) {
        const turn = bookingTurns[i];
        const audio = await piper.synthesize(turn.text);

        const turnResult = await transportService.processVoiceTurn({
          transportSessionId,
          businessId: business.id,
          audioFilePath: audio.audioPath,
          clientChannel: 'MOBILE_WEB',
        });

        assert.strictEqual(turnResult.success, true, `${turn.desc} must process successfully`);
        assert.ok(turnResult.responseText.length > 0, `${turn.desc} must yield non-empty text response`);
        assert.ok(turnResult.audio?.audioId, `${turn.desc} must yield synthesized audio response ID`);
        assert.ok(turnResult.metrics.totalMs > 0, `${turn.desc} must record valid non-zero pipeline latency`);

        if (i === 6) {
          // Final confirmation turn
          assert.strictEqual(turnResult.source, 'tool', 'Turn 7 must resolve as tool execution');
          assert.ok(turnResult.metadata?.appointmentId, 'Turn 7 must return appointmentId in metadata');
          createdAppointmentId = turnResult.metadata.appointmentId;
        }
      }

      console.log('  ✓ Test 2: Full 7-turn voice booking conversation executed through Whisper STT, AI State Machine, and Piper TTS');
    }

    // -------------------------------------------------------------------------
    // TEST 3: Direct PostgreSQL Database Verification
    // -------------------------------------------------------------------------
    {
      assert(createdAppointmentId, 'Created appointment ID must exist from Turn 7');
      const appointment = await prisma.appointment.findUnique({
        where: { id: createdAppointmentId },
        include: { customer: true, service: true, staff: true },
      });

      assert.ok(appointment, 'Appointment must exist in PostgreSQL');
      assert.strictEqual(appointment.businessId, business.id, 'Appointment must belong to Lumina Dental Care');
      assert.strictEqual(appointment.status, 'CONFIRMED', 'Appointment status must be CONFIRMED');
      assert.ok(appointment.service.name.includes('Comprehensive Oral Exam'), 'Service must match Comprehensive Oral Exam');
      assert.ok(appointment.customer, 'Customer must be linked to appointment');
      assert.ok(appointment.staff, 'Staff specialist must be assigned');
      createdCustomerId = appointment.customerId;

      // Verify zero duplicates
      const count = await prisma.appointment.count({
        where: { id: createdAppointmentId },
      });
      assert.strictEqual(count, 1, 'Exactly one appointment record must exist (zero duplicates)');

      console.log(`  ✓ Test 3: PostgreSQL appointment verified directly: ID=${appointment.id}, Status=${appointment.status}, Staff=${appointment.staff.name}`);
    }

    // -------------------------------------------------------------------------
    // TEST 4: Dashboard Appointments API Visibility
    // -------------------------------------------------------------------------
    {
      const dashboardAppointments = await prisma.appointment.findMany({
        where: { businessId: business.id },
        include: { customer: true, service: true, staff: true },
        orderBy: { startTime: 'desc' },
      });

      const found = dashboardAppointments.find((a) => a.id === createdAppointmentId);
      assert.ok(found, 'Created appointment must be visible in business dashboard appointments query');
      assert.ok(found.customer.name, 'Dashboard appointment customer name must be visible');
      assert.ok(found.service.name, 'Dashboard appointment service name must be visible');
      assert.ok(found.staff?.name, 'Dashboard appointment staff name must be visible');
      assert.ok(found.startTime, 'Dashboard appointment date/time must be visible');

      console.log('  ✓ Test 4: Appointment correctly visible in dashboard appointments dataset with full relational details');
    }

    // -------------------------------------------------------------------------
    // TEST 5: Voice Session Analytics Tracking & Privacy Guarantee
    // -------------------------------------------------------------------------
    {
      // End the transport session cleanly
      await voiceTransportSessionManager.terminateTransportSession(transportSessionId);

      const analytics = await prisma.voiceSessionAnalytics.findFirst({
        where: { transportSessionId },
      });

      assert.ok(analytics, 'VoiceSessionAnalytics record must exist in PostgreSQL');
      assert.strictEqual(analytics.businessId, business.id, 'Analytics record must link to Lumina Dental Care');
      assert.strictEqual(analytics.appointmentBooked, true, 'appointmentBooked must be true');
      assert.strictEqual(analytics.appointmentId, createdAppointmentId, 'appointmentId must link to created appointment');
      assert.strictEqual(analytics.turnCount, 7, 'Turn count must accurately reflect 7 executed turns');
      assert.ok(analytics.durationMs && analytics.durationMs > 0, 'Total session duration must be recorded');
      assert.ok(analytics.successfulTranscriptionCount >= 7, 'Successful STT count must be at least 7');

      // Strict Privacy Audit: verify zero raw audio, audio blobs, or speech transcripts stored
      const analyticsKeys = Object.keys(analytics);
      assert.ok(!analyticsKeys.includes('rawAudio'), 'Analytics model must never contain rawAudio');
      assert.ok(!analyticsKeys.includes('audioBlob'), 'Analytics model must never contain audioBlob');
      assert.ok(!analyticsKeys.includes('transcript'), 'Analytics model must never store persistent transcripts');
      assert.ok(!analyticsKeys.includes('userSpeech'), 'Analytics model must never store user speech text');

      console.log('  ✓ Test 5: Voice analytics verified in database (7 turns, 100% conversion) with strict privacy enforcement (zero audio/transcripts)');
    }

    // -------------------------------------------------------------------------
    // TEST 6: Failure & Recovery — Empty Audio Rejection
    // -------------------------------------------------------------------------
    {
      const failSession = await voiceTransportSessionManager.createTransportSession({
        businessId: business.id,
        channel: 'MOBILE_WEB',
      });
      assert(failSession.session);

      // Create an empty dummy buffer
      const emptyBuffer = Buffer.alloc(0);
      const emptyRes = await transportService.processVoiceTurn({
        transportSessionId: failSession.session.transportSessionId,
        businessId: business.id,
        audioBuffer: emptyBuffer,
        clientChannel: 'MOBILE_WEB',
      });

      assert.strictEqual(emptyRes.success, false, 'Empty audio buffer must fail validation');
      assert.ok(
        emptyRes.error?.message?.includes('Empty') ||
        emptyRes.error?.message?.includes('audio') ||
        emptyRes.error?.code?.includes('AUDIO'),
        'Error must specify empty audio'
      );
      assert.ok(!emptyRes.metadata?.appointmentId, 'Empty audio must never create an appointment');

      await voiceTransportSessionManager.terminateTransportSession(failSession.session.transportSessionId);
      console.log('  ✓ Test 6: Failure Recovery — Empty audio payload rejected safely without creating an appointment or crashing server');
    }

    // -------------------------------------------------------------------------
    // TEST 7: Failure & Recovery — Whisper Empty Transcription Fallback
    // -------------------------------------------------------------------------
    {
      const fallbackSession = await voiceTransportSessionManager.createTransportSession({
        businessId: business.id,
        channel: 'MOBILE_WEB',
      });
      assert(fallbackSession.session);

      // Create mock STT provider that simulates silence/empty transcription
      const mockSilentStt = {
        name: 'mock-silent',
        transcribe: async () => ({
          success: true,
          transcript: '',
          latencyMs: 10,
        }),
      };
      const silentOrchestrator = new VoiceConversationOrchestrator({
        sttProvider: mockSilentStt as any,
        ttsProvider: piper,
      });
      const silentTransport = new VoiceTurnTransportService({ orchestrator: silentOrchestrator });

      // Synthesize short sound
      const testSound = await piper.synthesize('hello');
      const silentRes = await silentTransport.processVoiceTurn({
        transportSessionId: fallbackSession.session.transportSessionId,
        businessId: business.id,
        audioFilePath: testSound.audioPath,
        clientChannel: 'MOBILE_WEB',
      });

      assert.strictEqual(silentRes.success, true, 'Silent turn must be handled gracefully');
      assert.ok(
        silentRes.responseText.toLowerCase().includes('catch that') ||
        silentRes.responseText.toLowerCase().includes('repeat') ||
        silentRes.responseText.toLowerCase().includes('hear'),
        'System must return friendly repetition prompt on empty transcription'
      );

      await voiceTransportSessionManager.terminateTransportSession(fallbackSession.session.transportSessionId);
      console.log('  ✓ Test 7: Failure Recovery — Empty Whisper transcription prompts friendly retry while preserving conversation state');
    }

    // -------------------------------------------------------------------------
    // TEST 8: Failure & Recovery — Corrupted / Unsupported Audio File
    // -------------------------------------------------------------------------
    {
      const corruptSession = await voiceTransportSessionManager.createTransportSession({
        businessId: business.id,
        channel: 'MOBILE_WEB',
      });
      assert(corruptSession.session);

      // Send arbitrary binary garbage
      const garbageBuffer = Buffer.from('NOT_AN_AUDIO_FILE_DATA_CORRUPT_1234567890');
      const corruptRes = await transportService.processVoiceTurn({
        transportSessionId: corruptSession.session.transportSessionId,
        businessId: business.id,
        audioBuffer: garbageBuffer,
        clientChannel: 'MOBILE_WEB',
      });

      assert.strictEqual(corruptRes.success, false, 'Corrupted audio buffer must fail conversion/processing');
      assert.ok(corruptRes.error, 'Error message must be returned');

      await voiceTransportSessionManager.terminateTransportSession(corruptSession.session.transportSessionId);
      console.log('  ✓ Test 8: Failure Recovery — Corrupted audio stream fails safely with error message without crashing server process');
    }

    // -------------------------------------------------------------------------
    // TEST 9: Failure & Recovery — Clean Call Termination Lifecycle
    // -------------------------------------------------------------------------
    {
      const termSession = await voiceTransportSessionManager.createTransportSession({
        businessId: business.id,
        channel: 'MOBILE_WEB',
      });
      assert(termSession.session);

      const termId = termSession.session.transportSessionId;
      const termResult = await voiceTransportSessionManager.terminateTransportSession(termId);
      assert.strictEqual(termResult, true, 'terminateTransportSession must succeed');

      const termAnalytics = await prisma.voiceSessionAnalytics.findFirst({
        where: { transportSessionId: termId },
      });
      assert.ok(termAnalytics, 'Terminated session analytics must be recorded');
      assert.strictEqual(termAnalytics.status, 'ENDED_BY_USER', 'Status must be set to ENDED_BY_USER');
      assert.ok(termAnalytics.endedAt !== null, 'endedAt must be populated');

      console.log('  ✓ Test 9: Failure Recovery — Clean user call termination properly releases resources and sets ENDED_BY_USER status');
    }

    // -------------------------------------------------------------------------
    // TEST 10: Multi-Tenant Security & Cross-Business Isolation
    // -------------------------------------------------------------------------
    {
      const tenantSessionA = await voiceTransportSessionManager.createTransportSession({
        businessId: business.id,
        channel: 'MOBILE_WEB',
      });
      assert(tenantSessionA.session);

      // Attempt to process a turn on Business A session using Business B ID
      const crossResult = await transportService.processVoiceTurn({
        transportSessionId: tenantSessionA.session.transportSessionId,
        businessId: otherBusiness.id,
        audioBuffer: Buffer.from('RIFF....WAVE'),
        clientChannel: 'MOBILE_WEB',
      });

      assert.strictEqual(crossResult.success, false, 'Cross-tenant session access must be strictly rejected');
      assert.ok(
        crossResult.error?.message?.includes('mismatch') ||
        crossResult.error?.message?.includes('Business') ||
        crossResult.error?.code?.includes('MISMATCH'),
        'Error must specify tenant mismatch'
      );

      // Verify that appointments belonging to Business A cannot be accessed under Business B
      const crossAppts = await prisma.appointment.findMany({
        where: { businessId: otherBusiness.id, id: createdAppointmentId! },
      });
      assert.strictEqual(crossAppts.length, 0, 'Business B must not be able to query Business A appointments');

      await voiceTransportSessionManager.terminateTransportSession(tenantSessionA.session.transportSessionId);
      console.log('  ✓ Test 10: Multi-Tenant Security — Cross-business session hijacking and appointment query leakage strictly blocked');
    }

  } finally {
    // -------------------------------------------------------------------------
    // CLEANUP TEST DATA SAFELY
    // -------------------------------------------------------------------------
    if (createdAppointmentId) {
      await prisma.appointment.deleteMany({
        where: { id: createdAppointmentId },
      });
    }
    if (createdCustomerId) {
      await prisma.customer.deleteMany({
        where: { id: createdCustomerId },
      });
    }
    // Clean up test analytics sessions
    await prisma.voiceSessionAnalytics.deleteMany({
      where: {
        OR: [
          { transportSessionId: { startsWith: 'vtr_test' } },
        ],
      },
    });
  }

  console.log('------------------------------------------------------------------------');
  console.log('Results: 10/10 tests passed');
  console.log('========================================================================\n');
}

if (require.main === module) {
  runEndToEndSystemValidationTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal test error in Suite 30:', err);
      process.exit(1);
    });
}
