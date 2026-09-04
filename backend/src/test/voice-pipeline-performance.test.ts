/**
 * Phase 8.1: Voice Pipeline Performance Test Suite
 *
 * Verifies:
 * 1. Stage timing durations are non-negative (>= 0)
 * 2. Stage independence (optional stages work correctly without errors)
 * 3. Total calculation accuracy without double counting
 * 4. Privacy verification (Zero rawAudio, audioBuffer, audioData, fullTranscript in metrics)
 * 5. Statistical calculation accuracy (Avg, Min, Max, Median)
 * 6. Live voice pipeline compatibility with performance tracking
 * 7. Metrics JSON serializability and schema integrity
 */

import {
  VoicePerformanceTracker,
  VoiceTurnPerformanceMetric,
  AIExecutionSource,
} from '../modules/speech/performance';
import { prisma } from '../lib/prisma';
import { voiceConversationOrchestrator } from '../modules/speech/services/voice-orchestrator.service';
import { speechConfig } from '../modules/speech/speech.config';
import path from 'path';
import fs from 'fs';
import { spawnSync } from 'child_process';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export async function runVoicePipelinePerformanceTests(): Promise<void> {
  console.log('\n======================================================');
  console.log('--- Running Phase 8.1 Voice Performance Test Suite ---');
  console.log('======================================================');

  // -------------------------------------------------------------
  // Test 1: Stage timing durations are non-negative
  // -------------------------------------------------------------
  {
    const tracker = new VoicePerformanceTracker('sess_test_1', 1);
    tracker.startStage('requestHandling');
    await new Promise((r) => setTimeout(r, 10));
    const duration = tracker.endStage('requestHandling');

    assert(duration >= 0, `Duration must be non-negative, got ${duration}`);
    assert(duration >= 5, `Expected at least 5ms duration, got ${duration}`);
    console.log(`  ✓ Test 1: Stage timing durations are non-negative (measured ${duration} ms)`);
  }

  // -------------------------------------------------------------
  // Test 2: Stage independence (optional stages work cleanly)
  // -------------------------------------------------------------
  {
    const tracker = new VoicePerformanceTracker('sess_test_2', 1);
    tracker.recordStageDuration('requestHandling', 2.0);
    tracker.recordStageDuration('audioValidation', 1.0);
    tracker.recordStageDuration('audioNormalization', 0.0);
    tracker.recordStageDuration('stt', 850.0);
    tracker.recordStageDuration('ai', 1.5);
    tracker.recordStageDuration('tts', 600.0);
    tracker.recordStageDuration('responsePreparation', 0.5);

    // Deliberately omit databaseMs and llmInferenceMs
    const metric = tracker.finalize();

    assert(metric.databaseMs === undefined, 'databaseMs should be undefined when omitted');
    assert(metric.llmInferenceMs === undefined, 'llmInferenceMs should be undefined when omitted');
    assert(metric.totalBackendPipelineMs === 1455.0, `Expected total 1455.0ms, got ${metric.totalBackendPipelineMs}`);
    console.log('  ✓ Test 2: Optional stages work independently without runtime errors');
  }

  // -------------------------------------------------------------
  // Test 3: Total backend pipeline latency calculation (zero double counting)
  // -------------------------------------------------------------
  {
    const tracker = new VoicePerformanceTracker('sess_test_3', 1);
    tracker.recordStageDuration('requestHandling', 5.0);
    tracker.recordStageDuration('audioValidation', 2.5);
    tracker.recordStageDuration('audioNormalization', 10.0);
    tracker.recordStageDuration('stt', 900.0);
    tracker.recordStageDuration('ai', 50.0); // Total AI time
    tracker.recordStageDuration('database', 42.0); // Sub-stage of AI
    tracker.recordStageDuration('toolExecution', 42.0); // Sub-stage of AI
    tracker.recordStageDuration('tts', 800.0);
    tracker.recordStageDuration('responsePreparation', 1.5);

    const metric = tracker.finalize();

    // Expected sum = 5.0 + 2.5 + 10.0 + 900.0 + 50.0 + 800.0 + 1.5 = 1769.0 ms
    // NOT including database (42) or toolExecution (42) again!
    const expectedSum = Number((5.0 + 2.5 + 10.0 + 900.0 + 50.0 + 800.0 + 1.5).toFixed(2));
    assert(
      metric.totalBackendPipelineMs === expectedSum,
      `Expected total ${expectedSum}ms without double counting, got ${metric.totalBackendPipelineMs}ms`
    );
    console.log(`  ✓ Test 3: Total latency accurately calculated without double counting (${metric.totalBackendPipelineMs} ms)`);
  }

  // -------------------------------------------------------------
  // Test 4: Privacy enforcement: Zero rawAudio, audioBuffer, audioData, or fullTranscript
  // -------------------------------------------------------------
  {
    const tracker = new VoicePerformanceTracker('sess_test_4', 1);
    tracker.recordStageDuration('stt', 880.0);
    tracker.recordStageDuration('ai', 2.0);
    tracker.recordStageDuration('tts', 700.0);
    tracker.setOperationalMetadata({
      source: 'deterministic',
      sttSuccess: true,
      sttCharacterCount: 15,
      responseCharacterCount: 42,
    });

    const metric = tracker.finalize();
    const metricRecord = metric as Record<string, any>;

    assert(metricRecord.rawAudio === undefined, 'rawAudio must NOT exist in metrics');
    assert(metricRecord.audioBuffer === undefined, 'audioBuffer must NOT exist in metrics');
    assert(metricRecord.audioData === undefined, 'audioData must NOT exist in metrics');
    assert(metricRecord.audioBase64 === undefined, 'audioBase64 must NOT exist in metrics');
    assert(metricRecord.fullTranscript === undefined, 'fullTranscript must NOT exist in metrics');
    assert(metricRecord.transcript === undefined, 'transcript text must NOT exist in metrics');

    console.log('  ✓ Test 4: Privacy verification passed: Zero raw audio or speech transcripts stored in metrics');
  }

  // -------------------------------------------------------------
  // Test 5: Statistical calculation accuracy (Avg, Min, Max, Median)
  // -------------------------------------------------------------
  {
    // Test odd array: [100, 200, 300] -> avg=200, min=100, max=300, median=200
    const statsOdd = VoicePerformanceTracker.calculateStatistics([100, 200, 300]);
    assert(statsOdd.avg === 200, `Expected avg 200, got ${statsOdd.avg}`);
    assert(statsOdd.min === 100, `Expected min 100, got ${statsOdd.min}`);
    assert(statsOdd.max === 300, `Expected max 300, got ${statsOdd.max}`);
    assert(statsOdd.median === 200, `Expected median 200, got ${statsOdd.median}`);

    // Test even array: [100, 200, 300, 400] -> avg=250, min=100, max=400, median=250
    const statsEven = VoicePerformanceTracker.calculateStatistics([100, 200, 300, 400]);
    assert(statsEven.avg === 250, `Expected avg 250, got ${statsEven.avg}`);
    assert(statsEven.median === 250, `Expected median 250, got ${statsEven.median}`);

    // Test unsorted array: [40, 10, 30, 20, 50] -> median=30
    const statsUnsorted = VoicePerformanceTracker.calculateStatistics([40, 10, 30, 20, 50]);
    assert(statsUnsorted.median === 30, `Expected median 30, got ${statsUnsorted.median}`);

    console.log('  ✓ Test 5: Statistical calculations validated: Avg, Min, Max, and Median mathematically verified');
  }

  // -------------------------------------------------------------
  // Test 6: Live voice pipeline components execute cleanly with performance tracking
  // -------------------------------------------------------------
  {
    const business = await prisma.business.findFirst({
      where: { name: 'Lumina Dental Care' },
      select: { id: true },
    });
    assert(Boolean(business), 'Demo business Lumina Dental Care must exist');

    const tempDir = path.resolve(speechConfig.paths.runtimeDir, 'test_perf_audio');
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
    const tempAudio = path.resolve(tempDir, 'test_perf.wav');

    try {
      // Synthesize quick audio input fixture using Piper
      spawnSync(
        speechConfig.tts.binaryPath,
        ['--model', speechConfig.tts.modelPath, '--output_file', tempAudio],
        { input: 'Hello', encoding: 'utf-8', timeout: 10000 }
      );

      const tracker = new VoicePerformanceTracker('sess_test_live', 1);
      tracker.startStage('requestHandling');
      tracker.endStage('requestHandling');

      tracker.startStage('audioValidation');
      tracker.endStage('audioValidation');

      const res = await voiceConversationOrchestrator.orchestrateVoiceTurn({
        audioFilePath: tempAudio,
        businessId: business!.id,
        channel: 'VOICE',
      });

      tracker.recordStageDuration('stt', res.metrics.sttLatencyMs);
      tracker.recordStageDuration('ai', res.metrics.conversationLatencyMs);
      tracker.recordStageDuration('tts', res.metrics.ttsLatencyMs);
      tracker.setOperationalMetadata({
        source: res.source as AIExecutionSource,
        sttSuccess: Boolean(res.transcript && res.transcript.length > 0),
        responseCharacterCount: res.response.length,
      });

      const metric = tracker.finalize();
      assert(metric.sttMs > 0, `Expected STT > 0, got ${metric.sttMs}`);
      assert(metric.aiMs >= 0, `Expected AI >= 0, got ${metric.aiMs}`);
      assert(metric.ttsMs > 0, `Expected TTS > 0, got ${metric.ttsMs}`);
      assert(metric.totalBackendPipelineMs > 0, `Expected Total > 0, got ${metric.totalBackendPipelineMs}`);

      console.log(
        `  ✓ Test 6: Live voice pipeline turn executed cleanly: STT=${metric.sttMs}ms | AI=${metric.aiMs}ms | TTS=${metric.ttsMs}ms | Total=${metric.totalBackendPipelineMs}ms`
      );
    } finally {
      if (fs.existsSync(tempAudio)) {
        try {
          fs.unlinkSync(tempAudio);
        } catch {}
      }
    }
  }

  // -------------------------------------------------------------
  // Test 7: Metrics cleanly serialize to JSON without circular references
  // -------------------------------------------------------------
  {
    const tracker = new VoicePerformanceTracker('sess_test_7', 2);
    tracker.recordStageDuration('requestHandling', 1.2);
    tracker.recordStageDuration('audioValidation', 0.5);
    tracker.recordStageDuration('audioNormalization', 0.0);
    tracker.recordStageDuration('stt', 890.5);
    tracker.recordStageDuration('ai', 1.8);
    tracker.recordStageDuration('database', 12.0);
    tracker.recordStageDuration('tts', 780.2);
    tracker.recordStageDuration('responsePreparation', 0.6);
    tracker.setOperationalMetadata({
      source: 'deterministic',
      sttSuccess: true,
      sttEmptyOrFailed: false,
      sttCharacterCount: 22,
      responseCharacterCount: 54,
    });

    const metric = tracker.finalize();
    const jsonStr = JSON.stringify(metric);
    const parsed = JSON.parse(jsonStr);

    assert(parsed.sessionId === 'sess_test_7', 'Parsed sessionId must match');
    assert(parsed.sttMs === 890.5, 'Parsed sttMs must match');
    assert(parsed.ttsMs === 780.2, 'Parsed ttsMs must match');
    assert(typeof parsed.totalBackendPipelineMs === 'number', 'totalBackendPipelineMs must be a number');

    console.log('  ✓ Test 7: Performance metrics cleanly serialize and deserialize to JSON');
  }

  console.log('======================================================');
  console.log('🎉 ALL PHASE 8.1 VOICE PERFORMANCE TESTS PASSED (7/7)! 🎉');
  console.log('======================================================\n');
}

if (require.main === module) {
  runVoicePipelinePerformanceTests()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
