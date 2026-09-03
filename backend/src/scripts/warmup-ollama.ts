import { ollamaModelAdapter } from '../modules/ai/model/ollama-model-adapter';
import { OllamaRuntimeService } from '../modules/ai/runtime/ollama-runtime.service';

export async function warmupOllama(): Promise<void> {
  console.log('\n======================================================');
  console.log('--- OLLAMA LOCAL MODEL WARM-UP UTILITY ---');
  console.log('======================================================');
  console.log(`Endpoint:   ${ollamaModelAdapter.baseUrl}`);
  console.log(`Model ID:   ${ollamaModelAdapter.modelId}`);
  console.log(`Keep-Alive: ${ollamaModelAdapter.defaultKeepAlive}\n`);

  const status = await OllamaRuntimeService.checkOllamaAvailability(
    ollamaModelAdapter.baseUrl,
    ollamaModelAdapter.modelId
  );

  if (!status.available) {
    console.error(`❌ Error: Ollama service is not running on ${ollamaModelAdapter.baseUrl}.`);
    process.exit(1);
  }

  if (!status.modelAvailable) {
    console.error(`❌ Error: Model '${ollamaModelAdapter.modelId}' is not installed.`);
    process.exit(1);
  }

  console.log('Warming model in system RAM (pre-loading weights)...');
  const result = await ollamaModelAdapter.warmup();

  if (result.success) {
    console.log(`\n🎉 Model '${ollamaModelAdapter.modelId}' successfully warmed in RAM!`);
    console.log(`⏱ Warmup Duration: ${result.durationMs.toFixed(2)} ms (${(result.durationMs / 1000).toFixed(2)}s)`);
    console.log(`💡 Model is now ready for instantaneous conversational turn generation.\n`);
  } else {
    console.error(`\n❌ Warmup failed: ${result.error}\n`);
    process.exit(1);
  }
}

if (require.main === module) {
  warmupOllama().catch((err) => {
    console.error('Warmup execution failed:', err);
    process.exit(1);
  });
}
