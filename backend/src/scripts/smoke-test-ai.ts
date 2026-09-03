import { ollamaModelAdapter } from '../modules/ai/model/ollama-model-adapter';
import { OllamaRuntimeService } from '../modules/ai/runtime/ollama-runtime.service';

export async function runAiSmokeTest(): Promise<void> {
  console.log('\n======================================================');
  console.log('--- LOCAL AI GENERATION LIVE SMOKE TEST ---');
  console.log('======================================================');
  console.log(`Endpoint: ${ollamaModelAdapter.baseUrl}`);
  console.log(`Model:    ${ollamaModelAdapter.modelId}\n`);

  const status = await OllamaRuntimeService.checkOllamaAvailability(
    ollamaModelAdapter.baseUrl,
    ollamaModelAdapter.modelId
  );

  if (!status.available || !status.modelAvailable) {
    console.error('❌ Error: Ollama or target model is not available for live smoke test.');
    process.exit(1);
  }

  // 1. Test Non-Streaming Generation
  console.log('1. Testing Non-Streaming Receptionist Generation:');
  const nonStreamPrompt = 'Hello, can you help me?';
  console.log(`  • User Input: "${nonStreamPrompt}"`);

  const nonStreamRes = await ollamaModelAdapter.generate({
    prompt: nonStreamPrompt,
    maxTokens: 50,
  });

  console.log(`  • Response:   "${nonStreamRes.text}"`);
  console.log(`  • Latency:    ${nonStreamRes.metrics.totalDurationMs.toFixed(2)} ms`);
  console.log(`  • Generated:  ${nonStreamRes.metrics.evalCount || 0} tokens (${(nonStreamRes.metrics.tokensPerSecond || 0).toFixed(2)} tps)\n`);

  // 2. Test Streaming Generation
  console.log('2. Testing Streaming Receptionist Generation:');
  const streamPrompt = 'I need information regarding scheduling.';
  console.log(`  • User Input: "${streamPrompt}"`);
  process.stdout.write('  • Stream Output: "');

  let streamTokens = 0;
  const stream = ollamaModelAdapter.generateStream({
    prompt: streamPrompt,
    maxTokens: 50,
  });

  let streamMetrics;
  for await (const chunk of stream) {
    if (chunk.type === 'text' && chunk.text) {
      process.stdout.write(chunk.text);
      streamTokens++;
    } else if (chunk.type === 'done') {
      streamMetrics = chunk.metrics;
    }
  }

  console.log('"');
  if (streamMetrics) {
    console.log(`  • Stream Latency: ${streamMetrics.totalDurationMs.toFixed(2)} ms`);
    console.log(`  • Stream Speed:   ${(streamMetrics.tokensPerSecond || 0).toFixed(2)} tps\n`);
  }

  console.log('======================================================');
  console.log('🎉 LIVE AI SMOKE TEST COMPLETED SUCCESSFULLY! 🎉');
  console.log('======================================================\n');
}

if (require.main === module) {
  runAiSmokeTest().catch((err) => {
    console.error('Live smoke test failed:', err);
    process.exit(1);
  });
}
