import assert from 'assert';
import {
  OllamaAbortError,
  OllamaError,
  OllamaModelAdapter,
  OllamaTimeoutError,
  OllamaUnavailableError,
} from '../modules/ai/model';

export async function runOllamaAdapterTests(): Promise<void> {
  console.log('\n======================================================');
  console.log('--- Running Ollama Model Adapter Unit Tests ---');
  console.log('======================================================');

  // 1. Adapter initialization
  console.log('\n1. Testing Ollama Adapter Initialization & Defaults:');
  const adapter = new OllamaModelAdapter({
    baseUrl: 'http://127.0.0.1:11434',
    modelId: 'llama3.2:3b',
    defaultTimeoutMs: 5000,
    defaultKeepAlive: '5m',
  });
  assert.strictEqual(adapter.name, 'OllamaModelAdapter');
  assert.strictEqual(adapter.modelId, 'llama3.2:3b');
  assert.strictEqual(adapter.baseUrl, 'http://127.0.0.1:11434');
  assert.strictEqual(adapter.defaultTimeoutMs, 5000);
  assert.strictEqual(adapter.defaultKeepAlive, '5m');
  console.log('  ✓ Adapter initialized with typed configurations and defaults.');

  // 2. Unreachable Ollama endpoint handling
  console.log('\n2. Testing Unreachable Endpoint Connection Error Mapping:');
  const unreachableAdapter = new OllamaModelAdapter({
    baseUrl: 'http://127.0.0.1:59999',
    defaultTimeoutMs: 500,
  });

  try {
    await unreachableAdapter.generate({ prompt: 'Hello' });
    assert.fail('Should have thrown OllamaUnavailableError for unreachable port');
  } catch (err: any) {
    assert(
      err instanceof OllamaUnavailableError || err instanceof OllamaTimeoutError || err instanceof OllamaError,
      `Expected OllamaError, got ${err?.name}: ${err?.message}`
    );
    console.log(`  ✓ Unreachable server cleanly mapped to ${err.name} (code: ${err.code || 'OLLAMA_ERROR'}).`);
  }

  // 3. Abort signal cancellation handling
  console.log('\n3. Testing Request Abort Signal Handling:');
  const abortController = new AbortController();
  const abortPromise = unreachableAdapter.generate({
    prompt: 'Hello',
    signal: abortController.signal,
  });
  abortController.abort();

  try {
    await abortPromise;
    assert.fail('Should have thrown OllamaAbortError');
  } catch (err: any) {
    assert(
      err instanceof OllamaAbortError || err.name === 'AbortError' || err instanceof OllamaError,
      `Expected abort error, got: ${err?.name}`
    );
    console.log(`  ✓ Aborted request cleanly caught and mapped to ${err.name}.`);
  }

  // 4. Timeout handling
  console.log('\n4. Testing Request Timeout Handling:');
  const timeoutAdapter = new OllamaModelAdapter({
    baseUrl: 'http://10.255.255.1', // Unroutable IP to simulate network hang
    defaultTimeoutMs: 100, // 100ms fast timeout
  });

  try {
    await timeoutAdapter.generate({ prompt: 'Test timeout', timeoutMs: 100 });
    assert.fail('Should have timed out');
  } catch (err: any) {
    assert(
      err instanceof OllamaTimeoutError || err instanceof OllamaUnavailableError || err instanceof OllamaError,
      `Expected timeout error, got: ${err?.name}`
    );
    console.log(`  ✓ Request timeout cleanly caught and mapped to ${err.name}.`);
  }

  // 5. Streaming Generator Interface Validation
  console.log('\n5. Testing Streaming Generator Error & Abort Handling:');
  const streamAbortController = new AbortController();
  streamAbortController.abort();

  try {
    const stream = unreachableAdapter.generateStream({
      prompt: 'Test stream',
      signal: streamAbortController.signal,
    });
    for await (const chunk of stream) {
      // should abort immediately
    }
  } catch (err: any) {
    assert(
      err instanceof OllamaAbortError || err.name === 'AbortError' || err instanceof OllamaError,
      `Expected stream abort error, got: ${err?.name}`
    );
    console.log(`  ✓ Streaming generator cleanly terminates on abort signal.`);
  }

  console.log('\n======================================================');
  console.log('🎉 OLLAMA ADAPTER TESTS PASSED! 🎉');
  console.log('======================================================\n');
}
