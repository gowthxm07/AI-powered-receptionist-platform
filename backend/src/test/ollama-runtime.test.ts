import assert from 'assert';
import { config } from '../config/environment';
import { OllamaRuntimeService } from '../modules/ai/runtime/ollama-runtime.service';

export async function runOllamaRuntimeTests(): Promise<void> {
  console.log('\n======================================================');
  console.log('--- Running Ollama Runtime & Config Tests ---');
  console.log('======================================================');

  // 1. Config tests
  console.log('\n1. Testing Ollama Environment Configuration:');
  assert(config.ollamaBaseUrl, 'config.ollamaBaseUrl must be defined');
  assert.strictEqual(typeof config.ollamaBaseUrl, 'string');
  assert(config.ollamaModel, 'config.ollamaModel must be defined');
  assert.strictEqual(typeof config.ollamaModel, 'string');
  assert(typeof config.ollamaTimeoutMs === 'number', 'config.ollamaTimeoutMs must be a number');
  assert(config.ollamaTimeoutMs > 0, 'config.ollamaTimeoutMs must be positive');
  console.log(`  ✓ Config verified: Base URL=${config.ollamaBaseUrl}, Model=${config.ollamaModel}, Timeout=${config.ollamaTimeoutMs}ms`);

  // 2. Unreachable endpoint probe test (safe fallback)
  console.log('\n2. Testing Unreachable Ollama Endpoint Graceful Handling:');
  const unreachableStatus = await OllamaRuntimeService.checkOllamaAvailability(
    'http://127.0.0.1:59999',
    'llama3.2:3b',
    500
  );
  assert.strictEqual(unreachableStatus.available, false);
  assert.strictEqual(unreachableStatus.modelAvailable, false);
  assert(unreachableStatus.error, 'Should report an error message when unreachable');
  console.log('  ✓ Unreachable Ollama endpoint gracefully returns available=false without throwing.');

  // 3. Probing configured local instance
  console.log('\n3. Probing Configured Local Ollama Instance:');
  const localStatus = await OllamaRuntimeService.checkOllamaAvailability();
  if (localStatus.available) {
    console.log(`  ✓ Local Ollama service is reachable (Version: ${localStatus.version || 'detected'}).`);
    console.log(`    • Configured Model '${config.ollamaModel}' Installed: ${localStatus.modelAvailable}`);
    console.log(`    • Available Models in Ollama: [${localStatus.availableModels.join(', ')}]`);
  } else {
    console.log(`  ℹ Local Ollama service probe: ${localStatus.error}`);
  }

  console.log('\n======================================================');
  console.log('🎉 OLLAMA RUNTIME CONFIG TESTS PASSED! 🎉');
  console.log('======================================================\n');
}
