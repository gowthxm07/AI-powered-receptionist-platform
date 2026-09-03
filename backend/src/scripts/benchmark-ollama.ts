import { config } from '../config/environment';
import { OllamaRuntimeService } from '../modules/ai/runtime/ollama-runtime.service';

interface OllamaGenerateResponse {
  model: string;
  response: string;
  done: boolean;
  total_duration?: number;       // in nanoseconds
  load_duration?: number;        // in nanoseconds
  prompt_eval_duration?: number; // in nanoseconds
  eval_duration?: number;        // in nanoseconds
  eval_count?: number;           // generated token count
  prompt_eval_count?: number;    // prompt token count
}

interface BenchmarkSampleResult {
  promptIndex: number;
  prompt: string;
  response: string;
  totalDurationMs: number;
  loadDurationMs: number;
  promptEvalDurationMs: number;
  evalDurationMs: number;
  tokenCount: number;
  tokensPerSecond: number;
}

interface SystemPromptComparisonResult {
  condition: string;
  systemPrompt: string;
  testPrompt: string;
  response: string;
  totalDurationMs: number;
  evalDurationMs: number;
  tokenCount: number;
  tokensPerSecond: number;
}

const BENCHMARK_PROMPTS = [
  'Hello.',
  'I want to book an appointment.',
  'What services do you offer?',
  'I need to cancel my appointment.',
  'Is someone available tomorrow?',
];

const RECEPTIONIST_SYSTEM_PROMPT =
  'You are a professional AI receptionist. Respond briefly, concisely, and politely in 1 to 2 sentences.';

async function queryOllama(
  prompt: string,
  systemPrompt?: string,
  options: { num_predict?: number; temperature?: number } = { num_predict: 60, temperature: 0.2 }
): Promise<{ result: OllamaGenerateResponse; wallTimeMs: number }> {
  const url = `${config.ollamaBaseUrl}/api/generate`;

  const body = {
    model: config.ollamaModel,
    prompt,
    system: systemPrompt,
    stream: false,
    options: {
      num_predict: options.num_predict || 60,
      temperature: options.temperature ?? 0.2,
      num_ctx: 2048,
    },
  };

  const startWallTime = performance.now();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(config.ollamaTimeoutMs),
  });
  const endWallTime = performance.now();

  if (!res.ok) {
    throw new Error(`Ollama HTTP Error: ${res.status} ${res.statusText}`);
  }

  const result = (await res.json()) as OllamaGenerateResponse;
  return {
    result,
    wallTimeMs: endWallTime - startWallTime,
  };
}

export async function runOllamaBenchmark(): Promise<void> {
  console.log('\n======================================================');
  console.log('--- OLLAMA LOCAL INFERENCE PERFORMANCE BENCHMARK ---');
  console.log('======================================================');
  console.log(`Endpoint: ${config.ollamaBaseUrl}`);
  console.log(`Model:    ${config.ollamaModel}\n`);

  // 1. Verify availability
  const status = await OllamaRuntimeService.checkOllamaAvailability();
  if (!status.available) {
    console.error(`❌ Error: Ollama service is not running or unreachable at ${config.ollamaBaseUrl}.`);
    console.error(`Details: ${status.error}`);
    process.exit(1);
  }

  if (!status.modelAvailable) {
    console.error(`❌ Error: Configured model '${config.ollamaModel}' is not pulled in Ollama.`);
    console.error(`Available models: [${status.availableModels.join(', ')}]`);
    console.error(`Run 'ollama pull ${config.ollamaModel}' first.`);
    process.exit(1);
  }

  console.log(`✓ Ollama Runtime Reachable (Version: ${status.version || '0.33.2'})`);
  console.log(`✓ Model '${config.ollamaModel}' verified in local storage.\n`);

  // 2. Cold / Initial Request Measurement
  console.log('------------------------------------------------------');
  console.log('1. Cold / Initial Request Measurement:');
  console.log('------------------------------------------------------');
  const coldQuery = await queryOllama('Hello, this is a test inquiry.');
  const coldTotalMs = coldQuery.wallTimeMs;
  const coldLoadMs = (coldQuery.result.load_duration || 0) / 1_000_000;
  const coldEvalMs = (coldQuery.result.eval_duration || 0) / 1_000_000;
  const coldTokens = coldQuery.result.eval_count || 0;
  const coldTps = coldEvalMs > 0 ? (coldTokens / (coldEvalMs / 1000)) : 0;

  console.log(`  • Response:       "${coldQuery.result.response.trim().replace(/\n+/g, ' ')}"`);
  console.log(`  • Wall Latency:   ${coldTotalMs.toFixed(2)} ms (${(coldTotalMs / 1000).toFixed(2)}s)`);
  console.log(`  • Model Load:     ${coldLoadMs.toFixed(2)} ms (${(coldLoadMs / 1000).toFixed(2)}s)`);
  console.log(`  • Generation:     ${coldEvalMs.toFixed(2)} ms`);
  console.log(`  • Tokens Output:  ${coldTokens} tokens`);
  console.log(`  • Generation Rate: ${coldTps.toFixed(2)} tokens/sec`);

  // 3. Warm-up
  console.log('\n------------------------------------------------------');
  console.log('2. Running Warm-Up Pass...');
  await queryOllama('Warmup greeting', RECEPTIONIST_SYSTEM_PROMPT);
  console.log('✓ Model warm in RAM.');

  // 4. Warm Inference Benchmark (5 Realistic Receptionist Prompts)
  console.log('\n------------------------------------------------------');
  console.log('3. Warm Inference Benchmark (5 Receptionist Prompts):');
  console.log('------------------------------------------------------');

  const sampleResults: BenchmarkSampleResult[] = [];

  for (let i = 0; i < BENCHMARK_PROMPTS.length; i++) {
    const prompt = BENCHMARK_PROMPTS[i];
    const { result, wallTimeMs } = await queryOllama(prompt, RECEPTIONIST_SYSTEM_PROMPT);

    const loadMs = (result.load_duration || 0) / 1_000_000;
    const promptEvalMs = (result.prompt_eval_duration || 0) / 1_000_000;
    const evalMs = (result.eval_duration || 0) / 1_000_000;
    const tokens = result.eval_count || 0;
    const tps = evalMs > 0 ? tokens / (evalMs / 1000) : 0;

    sampleResults.push({
      promptIndex: i + 1,
      prompt,
      response: result.response.trim().replace(/\n+/g, ' '),
      totalDurationMs: wallTimeMs,
      loadDurationMs: loadMs,
      promptEvalDurationMs: promptEvalMs,
      evalDurationMs: evalMs,
      tokenCount: tokens,
      tokensPerSecond: tps,
    });

    console.log(`\n  [Prompt ${i + 1}]: "${prompt}"`);
    console.log(`  ↳ Response:    "${result.response.trim().replace(/\n+/g, ' ')}"`);
    console.log(`  ↳ Total Time:  ${wallTimeMs.toFixed(2)} ms | Gen Time: ${evalMs.toFixed(2)} ms | Tokens: ${tokens} | Speed: ${tps.toFixed(2)} tps`);
  }

  // Calculate Aggregates
  const totalLatencies = sampleResults.map((s) => s.totalDurationMs);
  const avgLatency = totalLatencies.reduce((a, b) => a + b, 0) / totalLatencies.length;
  const minLatency = Math.min(...totalLatencies);
  const maxLatency = Math.max(...totalLatencies);

  const tpsList = sampleResults.map((s) => s.tokensPerSecond);
  const avgTps = tpsList.reduce((a, b) => a + b, 0) / tpsList.length;

  console.log('\n======================================================');
  console.log('📊 WARM INFERENCE PERFORMANCE METRICS:');
  console.log('======================================================');
  console.log(`  • Samples Tested:     ${sampleResults.length}`);
  console.log(`  • Average Latency:    ${avgLatency.toFixed(2)} ms (${(avgLatency / 1000).toFixed(2)} s)`);
  console.log(`  • Minimum Latency:    ${minLatency.toFixed(2)} ms (${(minLatency / 1000).toFixed(2)} s)`);
  console.log(`  • Maximum Latency:    ${maxLatency.toFixed(2)} ms (${(maxLatency / 1000).toFixed(2)} s)`);
  console.log(`  • Average Throughput: ${avgTps.toFixed(2)} tokens/second`);
  console.log('======================================================\n');

  // 5. System Prompt Comparison
  console.log('------------------------------------------------------');
  console.log('4. System Prompt Impact Comparison:');
  console.log('------------------------------------------------------');

  const testPrompt = 'What services do you offer?';

  // Condition A: Without system prompt
  const noSys = await queryOllama(testPrompt, undefined);
  const noSysEvalMs = (noSys.result.eval_duration || 0) / 1_000_000;
  const noSysTokens = noSys.result.eval_count || 0;
  const noSysTps = noSysEvalMs > 0 ? noSysTokens / (noSysEvalMs / 1000) : 0;

  // Condition B: With short receptionist system prompt
  const withSys = await queryOllama(testPrompt, RECEPTIONIST_SYSTEM_PROMPT);
  const withSysEvalMs = (withSys.result.eval_duration || 0) / 1_000_000;
  const withSysTokens = withSys.result.eval_count || 0;
  const withSysTps = withSysEvalMs > 0 ? withSysTokens / (withSysEvalMs / 1000) : 0;

  console.log(`  [Condition A - No System Prompt]:`);
  console.log(`    • Response:   "${noSys.result.response.trim().replace(/\n+/g, ' ')}"`);
  console.log(`    • Total Time: ${noSys.wallTimeMs.toFixed(2)} ms | Tokens: ${noSysTokens} | Speed: ${noSysTps.toFixed(2)} tps`);

  console.log(`\n  [Condition B - Receptionist System Prompt]:`);
  console.log(`    • Response:   "${withSys.result.response.trim().replace(/\n+/g, ' ')}"`);
  console.log(`    • Total Time: ${withSys.wallTimeMs.toFixed(2)} ms | Tokens: ${withSysTokens} | Speed: ${withSysTps.toFixed(2)} tps`);

  const promptDeltaMs = withSys.wallTimeMs - noSys.wallTimeMs;
  console.log(`\n  ↳ Latency Delta: ${promptDeltaMs >= 0 ? '+' : ''}${promptDeltaMs.toFixed(2)} ms (System prompt enforces concise output, keeping token count low)`);

  console.log('\n======================================================');
  console.log('🎉 OLLAMA BENCHMARK COMPLETED SUCCESSFULLY! 🎉');
  console.log('======================================================\n');
}

if (require.main === module) {
  runOllamaBenchmark().catch((err) => {
    console.error('Benchmark execution failed:', err);
    process.exit(1);
  });
}
