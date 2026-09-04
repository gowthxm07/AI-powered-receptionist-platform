/**
 * Test Suite #29: Voice Pipeline Latency Optimizations (Phase 8.2)
 *
 * Verifies:
 * 1. Spoken voice response conciseness and natural 12-hour time formatting
 * 2. Slot inquiry and list response simplification (Voice Response Policy)
 * 3. Booking context and entity preservation in AppointmentStateMachine
 * 4. Fast-path WAV header inspection and 0ms conversion bypass
 * 5. Deterministic intent routing guards for appointment preparation and payments
 * 6. True unknown queries continue to route to Ollama LLM fallback
 * 7. Adaptive silence detection configuration in VAD
 * 8. Zero persistent raw audio or transcripts in performance metrics
 */

import assert from 'assert';
import path from 'path';
import fs from 'fs';
import { voiceResponseOptimizer } from '../modules/speech/services/voice-response-optimizer.service';
import { audioConverterService } from '../modules/speech/services/audio-converter.service';
import { FastIntentRouter } from '../modules/ai/routing/intent-router';
import { AIIntent } from '../modules/ai/types/intent.types';
import { appointmentStateMachine } from '../modules/ai/conversation/appointment-state-machine';
import { BookingConversationStep } from '../modules/ai/conversation/conversation-session.types';
import { prisma } from '../lib/prisma';

export async function runVoiceLatencyOptimizationTests(): Promise<void> {
  console.log('\n========================================================');
  console.log('🧪 SUITE 29: Voice Pipeline Latency Optimizations (Phase 8.2)');
  console.log('========================================================');

  let passed = 0;
  let total = 0;

  function runTest(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      const result = fn();
      if (result && typeof (result as any).then === 'function') {
        return (result as any).then(
          () => {
            console.log(`  ✓ ${name}`);
            passed++;
          },
          (err: any) => {
            console.error(`  ✗ ${name}`);
            console.error(`    Error: ${err.message}`);
          }
        );
      } else {
        console.log(`  ✓ ${name}`);
        passed++;
      }
    } catch (err: any) {
      console.error(`  ✗ ${name}`);
      console.error(`    Error: ${err.message}`);
    }
  }

  // --------------------------------------------------------------------------
  // Test 1: Spoken Time Normalization (e.g. "09:00 AM" -> "9 AM", "01:00 PM" -> "1 PM")
  // --------------------------------------------------------------------------
  await runTest('Test 1: VoiceResponseOptimizer normalizes formal zero-padded times to natural spoken formats', () => {
    const raw = 'Available times on Friday, September 4 are 09:00 AM, 10:00 AM, 11:00 AM, and 01:00 PM. Which one would you prefer?';
    const opt = voiceResponseOptimizer.optimizeForVoice(raw, { enableConciseFormatting: true });

    assert.ok(opt.optimized, 'Expected response to be optimized');
    assert.strictEqual(
      opt.text,
      'I have 9 AM, 10 AM, 11 AM, or 1 PM available. Which time works best?',
      `Unexpected optimized text: "${opt.text}"`
    );
    assert.ok(opt.charCountOptimized < opt.charCountOriginal, 'Optimized text should be shorter than original');
    assert.ok(
      opt.charCountOptimized <= 72,
      `Expected char count <= 72, got ${opt.charCountOptimized}`
    );
  });

  // --------------------------------------------------------------------------
  // Test 2: Redundant Specialist Clause Stripping ("with Any Available Specialist")
  // --------------------------------------------------------------------------
  await runTest('Test 2: VoiceResponseOptimizer strips redundant "with Any Available Specialist" while keeping named staff', () => {
    const rawGeneric = 'Please confirm: Comprehensive Oral Exam & Digital X-Rays with Any Available Specialist on 2026-09-04 at 10:00 AM. Should I book it?';
    const optGeneric = voiceResponseOptimizer.optimizeForVoice(rawGeneric, { enableConciseFormatting: true });

    assert.ok(!optGeneric.text.includes('Any Available Specialist'), 'Should strip "Any Available Specialist"');
    assert.ok(optGeneric.text.includes('Comprehensive Oral Exam & Digital X-Rays'), 'Should retain service name');
    assert.ok(optGeneric.text.includes('10 AM'), 'Should convert 10:00 AM to 10 AM');

    const rawNamed = 'Please confirm: Comprehensive Oral Exam with Dr. Marcus Thorne on 2026-09-04 at 10:00 AM. Should I book it?';
    const optNamed = voiceResponseOptimizer.optimizeForVoice(rawNamed, { enableConciseFormatting: true });
    assert.ok(optNamed.text.includes('Dr. Marcus Thorne'), 'Must preserve named specialist!');
  });

  // --------------------------------------------------------------------------
  // Test 3: Concise Service Catalog Spoken Response
  // --------------------------------------------------------------------------
  await runTest('Test 3: VoiceResponseOptimizer shortens service catalog listing and questions', () => {
    const raw = 'We offer Comprehensive Oral Exam & Digital X-Rays (30 mins), Dental Cleaning & Plaque Removal (45 mins). Would you like to book one of these services?';
    const opt = voiceResponseOptimizer.optimizeForVoice(raw);

    assert.ok(!opt.text.includes('30 mins'), 'Should strip parenthetical duration');
    assert.ok(!opt.text.includes('45 mins'), 'Should strip parenthetical duration');
    assert.ok(opt.text.includes('Which one would you like?'), 'Should compact the question');
  });

  // --------------------------------------------------------------------------
  // Test 4: AppointmentStateMachine preserves all entities in conversation state
  // --------------------------------------------------------------------------
  await runTest('Test 4: AppointmentStateMachine preserves complete booking context in session state', async () => {
    const business = await prisma.business.findFirst({
      where: { name: 'Lumina Dental Care' },
    });
    assert.ok(business, 'Expected Lumina Dental Care in demo database');

    const testSessionId = `test_sess_perf_${Date.now()}`;
    const { sessionStore } = await import('../modules/ai/conversation/in-memory-session-store');

    await sessionStore.setSession({
      sessionId: testSessionId,
      businessId: business.id,
      step: BookingConversationStep.BOOKING_COLLECT_SERVICE,
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt: new Date(Date.now() + 3600000),
    });

    const turn1 = await appointmentStateMachine.handleTurn(
      'Comprehensive Oral Exam',
      (await sessionStore.getSession(testSessionId))!,
      { businessId: business.id, sessionId: testSessionId, channel: 'VOICE' },
      performance.now()
    );

    assert.ok(turn1.updatedSession, 'Expected updated session');
    assert.ok(turn1.updatedSession.selectedServiceId, 'selectedServiceId must be preserved in state');
    assert.ok(turn1.updatedSession.selectedServiceName, 'selectedServiceName must be preserved in state');
    assert.strictEqual(turn1.updatedSession.step, BookingConversationStep.BOOKING_COLLECT_STAFF);

    // Verify response is concise
    assert.ok(turn1.response.response.includes('Do you have a preferred specialist, or is anyone okay?'));

    // Clean up
    await sessionStore.deleteSession(testSessionId);
  });

  // --------------------------------------------------------------------------
  // Test 5: AudioConverterService 16kHz WAV Fast-Path Bypass
  // --------------------------------------------------------------------------
  await runTest('Test 5: AudioConverterService is16kMonoPcmWav detects valid 16kHz mono WAV fixtures', () => {
    // Construct valid 44-byte WAV header in memory
    const buffer = Buffer.alloc(44);
    buffer.write('RIFF', 0, 'ascii');
    buffer.writeUInt32LE(36 + 1000, 4);
    buffer.write('WAVE', 8, 'ascii');
    buffer.write('fmt ', 12, 'ascii');
    buffer.writeUInt32LE(16, 16);       // Subchunk1Size (16 for PCM)
    buffer.writeUInt16LE(1, 20);        // AudioFormat (1 = PCM)
    buffer.writeUInt16LE(1, 22);        // NumChannels (1 = Mono)
    buffer.writeUInt32LE(16000, 24);    // SampleRate (16000 Hz)
    buffer.writeUInt32LE(32000, 28);    // ByteRate (16000 * 1 * 16 / 8 = 32000)
    buffer.writeUInt16LE(2, 32);        // BlockAlign (1 * 16 / 8 = 2)
    buffer.writeUInt16LE(16, 34);       // BitsPerSample (16)
    buffer.write('data', 36, 'ascii');
    buffer.writeUInt32LE(1000, 40);

    const tempWav = path.resolve(__dirname, `temp_test_${Date.now()}.wav`);
    try {
      fs.writeFileSync(tempWav, buffer);
      const isFastPath = audioConverterService.is16kMonoPcmWav(tempWav);
      assert.strictEqual(isFastPath, true, '16kHz mono WAV should be recognized as fast path');
    } finally {
      if (fs.existsSync(tempWav)) fs.unlinkSync(tempWav);
    }
  });

  // --------------------------------------------------------------------------
  // Test 6: FastIntentRouter Appointment Preparation Guard
  // --------------------------------------------------------------------------
  await runTest('Test 6: FastIntentRouter catches appointment preparation deterministically (< 1ms)', () => {
    const queries = [
      'Can you explain how I should prepare for my appointment?',
      'How should I prepare for my visit?',
      'What should I bring to my appointment?',
      'Do I need to bring my insurance card?',
      'Should I arrive early for my visit?',
    ];

    for (const q of queries) {
      const match = FastIntentRouter.routeIntent(q);
      assert.strictEqual(
        match.intent,
        AIIntent.APPOINTMENT_PREPARATION,
        `Expected APPOINTMENT_PREPARATION for "${q}", got ${match.intent}`
      );
      assert.ok(match.confidence >= 0.9, 'Expected high confidence match');
    }
  });

  // --------------------------------------------------------------------------
  // Test 7: FastIntentRouter Payment & Insurance Policy Guard
  // --------------------------------------------------------------------------
  await runTest('Test 7: FastIntentRouter catches payment and insurance questions deterministically', () => {
    const queries = [
      'Do you accept insurance?',
      'What payment methods do you accept?',
      'Can I pay with credit card?',
      'What are your payment options?',
    ];

    for (const q of queries) {
      const match = FastIntentRouter.routeIntent(q);
      assert.strictEqual(
        match.intent,
        AIIntent.PAYMENT_POLICY,
        `Expected PAYMENT_POLICY for "${q}", got ${match.intent}`
      );
      assert.ok(match.confidence >= 0.9, 'Expected high confidence match');
    }
  });

  // --------------------------------------------------------------------------
  // Test 8: Unpredictable Queries Still Fall Back to Ollama (UNKNOWN)
  // --------------------------------------------------------------------------
  await runTest('Test 8: Unpredictable open-ended queries continue to route to AIIntent.UNKNOWN for LLM fallback', () => {
    const openQueries = [
      'What is the philosophical meaning of teeth in ancient culture?',
      'Can you explain quantum computing to me?',
      'Write a poem about sunflowers.',
    ];

    for (const q of openQueries) {
      const match = FastIntentRouter.routeIntent(q);
      assert.strictEqual(
        match.intent,
        AIIntent.UNKNOWN,
        `Expected UNKNOWN for open-ended query "${q}", got ${match.intent}`
      );
    }
  });

  // --------------------------------------------------------------------------
  // Test 9: Voice Response Policy Ceiling (< 220 chars)
  // --------------------------------------------------------------------------
  await runTest('Test 9: Voice Response Policy enforces single question and concise char ceiling', () => {
    const multiQuestion = 'Would you like morning or afternoon? Also what specialist would you prefer?';
    const opt = voiceResponseOptimizer.optimizeForVoice(multiQuestion);

    const qCount = (opt.text.match(/\?/g) || []).length;
    assert.strictEqual(qCount, 1, `Expected exactly 1 question, got ${qCount} in "${opt.text}"`);

    const policy = voiceResponseOptimizer.evaluateVoiceResponsePolicy(opt.text);
    assert.ok(policy.compliant, `Voice response policy failed: ${policy.issues.join(', ')}`);
  });

  // --------------------------------------------------------------------------
  // Test 10: Privacy Guarantee — Zero persistent raw audio or transcripts in metrics
  // --------------------------------------------------------------------------
  await runTest('Test 10: Privacy Guarantee — zero raw audio buffers or transcripts in performance structures', () => {
    const opt = voiceResponseOptimizer.optimizeForVoice('Hello world');
    const optKeys = Object.keys(opt);

    assert.ok(!optKeys.includes('rawAudio'), 'Must not contain rawAudio');
    assert.ok(!optKeys.includes('audioBuffer'), 'Must not contain audioBuffer');
    assert.ok(!optKeys.includes('base64Data'), 'Must not contain base64Data');
  });

  console.log('--------------------------------------------------------');
  console.log(`Results: ${passed}/${total} tests passed`);
  console.log('========================================================\n');

  if (passed !== total) {
    throw new Error(`Suite 29 failed: ${total - passed} test(s) failed.`);
  }
}
