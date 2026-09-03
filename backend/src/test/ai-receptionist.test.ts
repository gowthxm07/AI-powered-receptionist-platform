import assert from 'assert';
import { prisma } from '../lib/prisma';
import {
  AIModel,
  AIModelRequest,
  AIModelResponse,
  AIModelStreamChunk,
} from '../modules/ai/model';
import { OllamaUnavailableError } from '../modules/ai/model/ollama-errors';
import { AIReceptionistService } from '../modules/ai/services/ai-receptionist.service';
import { toolRouter } from '../modules/ai/tools/router';
import { AIAction } from '../modules/ai/types/action.types';
import { AIConversationContext } from '../modules/ai/types/context.types';
import { AIIntent } from '../modules/ai/types/intent.types';

class MockAIModel implements AIModel {
  public readonly name: string = 'MockAIModel';
  public readonly modelId: string = 'mock-llama';
  public generateCallCount: number = 0;
  public shouldFail: boolean = false;
  public mockResponseText: string = 'Mocked conversational answer from AI.';

  public async generate(request: AIModelRequest): Promise<AIModelResponse> {
    this.generateCallCount++;
    if (this.shouldFail) {
      throw new OllamaUnavailableError('Mocked Ollama connection failure');
    }
    return {
      text: this.mockResponseText,
      model: this.modelId,
      metrics: {
        totalDurationMs: 50,
        evalCount: 10,
        tokensPerSecond: 200,
      },
      success: true,
    };
  }

  public async *generateStream(request: AIModelRequest): AsyncIterable<AIModelStreamChunk> {
    yield { type: 'text', text: this.mockResponseText };
    yield { type: 'done', metrics: { totalDurationMs: 50 } };
  }

  public async isAvailable(): Promise<boolean> {
    return !this.shouldFail;
  }
}

export async function runAiReceptionistTests(): Promise<void> {
  console.log('\n======================================================');
  console.log('--- Running AI Receptionist Orchestrator Tests ---');
  console.log('======================================================');

  // Find a demo business from database for realistic context
  const demoBusiness = await prisma.business.findFirst({
    where: { name: 'Lumina Dental Care' },
  });
  assert(demoBusiness, 'Lumina Dental Care demo business should exist in database');

  const context: AIConversationContext = {
    businessId: demoBusiness.id,
    sessionId: 'test-session-orchestrator',
    channel: 'WEB',
    metadata: {
      businessName: demoBusiness.name,
    },
  };

  const mockModel = new MockAIModel();
  const orchestrator = new AIReceptionistService({
    toolRouter,
    aiModel: mockModel,
  });

  // 1. Test Fast Deterministic Path: Greeting
  console.log('\n1. Testing Fast Deterministic Greeting Path:');
  mockModel.generateCallCount = 0;
  const greetingRes = await orchestrator.processMessage({
    message: 'Hello!',
    context,
  });
  assert.strictEqual(greetingRes.success, true);
  assert.strictEqual(greetingRes.intent, AIIntent.GREETING);
  assert.strictEqual(greetingRes.source, 'deterministic');
  assert(greetingRes.response.includes('Lumina Dental Care'), 'Response should mention business name');
  assert.strictEqual(mockModel.generateCallCount, 0, 'Greeting MUST NOT invoke the LLM');
  console.log(`  ✓ Fast greeting handled in ${greetingRes.latencyMs?.toFixed(2)}ms with 0 LLM calls.`);

  // 2. Test Fast Deterministic Path: Goodbye
  console.log('\n2. Testing Fast Deterministic Goodbye Path:');
  const byeRes = await orchestrator.processMessage({
    message: 'Thank you, goodbye!',
    context,
  });
  assert.strictEqual(byeRes.success, true);
  assert.strictEqual(byeRes.intent, AIIntent.GOODBYE);
  assert.strictEqual(byeRes.source, 'deterministic');
  assert.strictEqual(mockModel.generateCallCount, 0, 'Goodbye MUST NOT invoke the LLM');
  console.log(`  ✓ Fast goodbye handled in ${byeRes.latencyMs?.toFixed(2)}ms with 0 LLM calls.`);

  // 3. Test Database Tool Path: Services
  console.log('\n3. Testing Database Tool Path for Services:');
  const srvRes = await orchestrator.processMessage({
    message: 'What services do you offer?',
    context,
  });
  assert.strictEqual(srvRes.success, true);
  assert.strictEqual(srvRes.intent, AIIntent.SERVICE_INFORMATION);
  assert.strictEqual(srvRes.source, 'tool');
  assert.strictEqual(srvRes.toolUsed, 'get_services');
  assert(srvRes.response.includes('We offer'), 'Response should format catalog services');
  assert.strictEqual(mockModel.generateCallCount, 0, 'Services query MUST NOT invoke the LLM');
  console.log(`  ✓ Services tool executed in ${srvRes.latencyMs?.toFixed(2)}ms. Response: "${srvRes.response}"`);

  // 4. Test Database Tool Path: Staff
  console.log('\n4. Testing Database Tool Path for Staff:');
  const staffRes = await orchestrator.processMessage({
    message: 'Who are your doctors and specialists?',
    context,
  });
  assert.strictEqual(staffRes.success, true);
  assert.strictEqual(staffRes.intent, AIIntent.STAFF_INFORMATION);
  assert.strictEqual(staffRes.source, 'tool');
  assert.strictEqual(staffRes.toolUsed, 'get_staff');
  assert(staffRes.response.includes('Our specialists include'), 'Response should format specialists list');
  assert.strictEqual(mockModel.generateCallCount, 0, 'Staff query MUST NOT invoke the LLM');
  console.log(`  ✓ Staff tool executed in ${staffRes.latencyMs?.toFixed(2)}ms. Response: "${staffRes.response}"`);

  // 5. Test Database Tool Path: Business Information
  console.log('\n5. Testing Database Tool Path for Business Info:');
  const bizRes = await orchestrator.processMessage({
    message: 'Where is your clinic located and what is your phone number?',
    context,
  });
  assert.strictEqual(bizRes.success, true);
  assert.strictEqual(bizRes.intent, AIIntent.BUSINESS_INFORMATION);
  assert.strictEqual(bizRes.source, 'tool');
  assert.strictEqual(bizRes.toolUsed, 'get_business_info');
  assert(bizRes.response.includes('Lumina Dental Care is located at'), 'Response should format address');
  assert.strictEqual(mockModel.generateCallCount, 0, 'Business info query MUST NOT invoke the LLM');
  console.log(`  ✓ Business info tool executed in ${bizRes.latencyMs?.toFixed(2)}ms.`);

  // 6. Test Booking & Cancellation Guided Prompts
  console.log('\n6. Testing Appointment Guided Deterministic Prompts:');
  const bookRes = await orchestrator.processMessage({
    message: 'I want to book an appointment',
    context,
  });
  assert.strictEqual(bookRes.success, true);
  assert.strictEqual(bookRes.intent, AIIntent.BOOK_APPOINTMENT);
  assert.strictEqual(bookRes.source, 'deterministic');

  const cancelRes = await orchestrator.processMessage({
    message: 'Cancel my appointment',
    context,
  });
  assert.strictEqual(cancelRes.success, true);
  assert.strictEqual(cancelRes.intent, AIIntent.CANCEL_APPOINTMENT);
  assert.strictEqual(cancelRes.source, 'deterministic');
  console.log('  ✓ Appointment booking and cancellation guided prompts verified without LLM calls.');

  // 7. Test Natural Language Reasoning / LLM Fallback
  console.log('\n7. Testing Natural Language LLM Fallback (Unknown / General Inquiries):');
  mockModel.generateCallCount = 0;
  const generalRes = await orchestrator.processMessage({
    message: 'Can you tell me something interesting about dental history?',
    context,
  });
  assert.strictEqual(generalRes.success, true);
  assert.strictEqual(generalRes.source, 'llm');
  assert.strictEqual(mockModel.generateCallCount, 1, 'General question MUST invoke the LLM');
  assert.strictEqual(generalRes.response, 'Mocked conversational answer from AI.');
  console.log(`  ✓ General inquiry cleanly routed to AI model adapter.`);

  // 8. Test Graceful Handling When Ollama is Offline
  console.log('\n8. Testing Graceful Handling When Ollama is Offline:');
  mockModel.shouldFail = true;
  const offlineRes = await orchestrator.processMessage({
    message: 'Can you explain quantum computing algorithms?',
    context,
  });
  assert.strictEqual(offlineRes.success, true, 'Backend MUST NOT crash or fail when Ollama is offline');
  assert.strictEqual(offlineRes.source, 'fallback');
  assert(offlineRes.response.includes('virtual receptionist'), 'Should return safe receptionist fallback message');
  console.log(`  ✓ Offline Ollama handled gracefully with safe fallback message without crashing.`);
  mockModel.shouldFail = false;

  // 9. Test Input Guardrails
  console.log('\n9. Testing Input Validation Guardrails:');
  const emptyRes = await orchestrator.processMessage({
    message: '   ',
    context,
  });
  assert.strictEqual(emptyRes.success, false);
  assert.strictEqual(emptyRes.error?.code, 'EMPTY_MESSAGE');

  const invalidContextRes = await orchestrator.processMessage({
    message: 'Hello',
    context: {} as any,
  });
  assert.strictEqual(invalidContextRes.success, false);
  assert.strictEqual(invalidContextRes.error?.code, 'INVALID_CONTEXT');
  console.log('  ✓ Empty message and invalid context errors handled safely.');

  console.log('\n======================================================');
  console.log('🎉 ALL AI RECEPTIONIST ORCHESTRATOR TESTS PASSED! 🎉');
  console.log('======================================================\n');
}
