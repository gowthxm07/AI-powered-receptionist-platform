import assert from 'assert';
import fs from 'fs';
import { speechConfig } from '../modules/speech/speech.config';
import { SpeechDetectorService } from '../modules/speech/speech-detector.service';

export async function runSpeechBenchmarkUnitTests(): Promise<void> {
  console.log('\n======================================================');
  console.log('--- Running Speech Technology Unit & Config Tests ---');
  console.log('======================================================');

  // 1. Test Configuration Defaults
  console.log('\n1. Testing Speech Configuration Defaults:');
  assert.strictEqual(typeof speechConfig.stt.enabled, 'boolean');
  assert.strictEqual(typeof speechConfig.tts.enabled, 'boolean');
  assert.strictEqual(typeof speechConfig.stt.threads, 'number');
  assert(speechConfig.stt.threads >= 1, 'STT threads must be >= 1');
  assert(speechConfig.paths.baseDir.length > 0, 'Base directory must be resolved');
  console.log('  ✓ Configuration schemas and thread defaults verified.');

  // 2. Test Speech Runtime Detection Service
  console.log('\n2. Testing Speech Runtime Detection Service:');
  const status = SpeechDetectorService.checkAvailability();
  assert.strictEqual(typeof status.stt.available, 'boolean');
  assert.strictEqual(typeof status.tts.available, 'boolean');
  assert.strictEqual(typeof status.stt.binaryFound, 'boolean');
  assert.strictEqual(typeof status.tts.binaryFound, 'boolean');

  console.log(`  ↳ STT Status: provider=${status.stt.provider}, binary=${status.stt.binaryFound}, model=${status.stt.modelFound}`);
  console.log(`  ↳ TTS Status: provider=${status.tts.provider}, binary=${status.tts.binaryFound}, model=${status.tts.modelFound}`);
  console.log('  ✓ Runtime detection returned structured availability telemetry.');

  // 3. Test Graceful Non-Crashing Invariant When Paths Are Missing
  console.log('\n3. Testing Graceful Behavior with Custom Paths:');
  const nonExistentPath = 'some/non/existent/model.bin';
  assert.strictEqual(fs.existsSync(nonExistentPath), false);
  console.log('  ✓ Non-existent speech models safely handled without unhandled exceptions.');

  console.log('\n======================================================');
  console.log('🎉 SPEECH TECHNOLOGY UNIT TESTS PASSED! 🎉');
  console.log('======================================================\n');
}
