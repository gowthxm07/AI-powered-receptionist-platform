import assert from 'assert';
import {
  DEFAULT_KEEP_ALIVE,
  DEFAULT_OUTPUT_MAX_TOKENS,
  DEFAULT_RECEPTIONIST_SYSTEM_PROMPT,
  DEFAULT_TEMPERATURE,
  MAX_MESSAGE_CONTENT_CHARS,
  MAX_MESSAGE_HISTORY,
  ModelValidator,
} from '../modules/ai/model';

export async function runModelAbstractionTests(): Promise<void> {
  console.log('\n======================================================');
  console.log('--- Running AI Model Abstraction Unit Tests ---');
  console.log('======================================================');

  // 1. Defaults verification
  console.log('\n1. Testing Default Model Request Sanitization:');
  const sanitizedDefault = ModelValidator.sanitizeRequest({});
  assert.strictEqual(sanitizedDefault.temperature, DEFAULT_TEMPERATURE);
  assert.strictEqual(sanitizedDefault.maxTokens, DEFAULT_OUTPUT_MAX_TOKENS);
  assert.strictEqual(sanitizedDefault.keepAlive, DEFAULT_KEEP_ALIVE);
  assert.strictEqual(sanitizedDefault.systemPrompt, DEFAULT_RECEPTIONIST_SYSTEM_PROMPT);
  console.log('  ✓ Verified default values: temperature=0.2, maxTokens=60, keepAlive=5m, default system prompt.');

  // 2. Clamping temperature and maxTokens
  console.log('\n2. Testing Parameter Clamping & Guardrails:');
  const clampedHigh = ModelValidator.sanitizeRequest({
    temperature: 2.5,
    maxTokens: 5000,
  });
  assert.strictEqual(clampedHigh.temperature, 1.0, 'Temperature should clamp to 1.0 max');
  assert.strictEqual(clampedHigh.maxTokens, 512, 'maxTokens should clamp to 512 max');

  const clampedLow = ModelValidator.sanitizeRequest({
    temperature: -0.5,
    maxTokens: 1,
  });
  assert.strictEqual(clampedLow.temperature, 0.0, 'Temperature should clamp to 0.0 min');
  assert.strictEqual(clampedLow.maxTokens, 5, 'maxTokens should clamp to 5 min');
  console.log('  ✓ Parameter clamping verified for high/low out-of-bounds inputs.');

  // 3. Context & Message history limiting
  console.log('\n3. Testing Context History & Character Truncation Limits:');
  const oversizedMessages = Array.from({ length: 25 }, (_, i) => ({
    role: 'user' as const,
    content: `Message ${i + 1}: ${'a'.repeat(3000)}`,
  }));

  const sanitizedHistory = ModelValidator.sanitizeRequest({
    messages: oversizedMessages,
  });

  assert(sanitizedHistory.messages, 'messages array should be defined');
  assert.strictEqual(
    sanitizedHistory.messages.length,
    MAX_MESSAGE_HISTORY,
    `History should be capped at ${MAX_MESSAGE_HISTORY} messages`
  );
  assert.strictEqual(
    sanitizedHistory.messages[0].content.length,
    MAX_MESSAGE_CONTENT_CHARS,
    `Individual content should be capped at ${MAX_MESSAGE_CONTENT_CHARS} characters`
  );
  assert(
    sanitizedHistory.messages[sanitizedHistory.messages.length - 1].content.startsWith('Message 25:'),
    'Should retain the latest messages'
  );
  console.log(`  ✓ Bounded message history to last ${MAX_MESSAGE_HISTORY} messages and capped text to ${MAX_MESSAGE_CONTENT_CHARS} chars.`);

  console.log('\n======================================================');
  console.log('🎉 AI MODEL ABSTRACTION TESTS PASSED! 🎉');
  console.log('======================================================\n');
}
