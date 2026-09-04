import './validation.test';
import { runApiTestSuite } from './api.test';
import { runAuthorizationMiddlewareTests } from './authorization.test';
import { runAuthIntegrationTests } from './auth-integration.test';
import { runCrossBusinessIsolationTests } from './cross-business-isolation.test';
import { runDatabaseIntegrationTests } from './db-integration.test';
import { runAppointmentTests } from './appointment.test';
import { runDemoSeedTests } from './demo-seed.test';
import { runAiToolsTests } from './ai-tools.test';
import { runOllamaRuntimeTests } from './ollama-runtime.test';
import { runModelAbstractionTests } from './model-abstraction.test';
import { runOllamaAdapterTests } from './ollama-adapter.test';
import { runIntentRouterTests } from './intent-router.test';
import { runAiReceptionistTests } from './ai-receptionist.test';
import { runSessionStoreTests } from './session-store.test';
import { runMultiTurnBookingTests } from './multi-turn-booking.test';
import { runConversationApiTests } from './conversation-api.test';
import { runSpeechBenchmarkUnitTests } from './speech-benchmark.test';
import { runSpeechPipelineTests } from './speech-pipeline.test';
import { runVoiceOrchestratorTests } from './voice-orchestrator.test';
import { runVoiceTransportTests } from './voice-transport.test';
import { runVoiceClientFoundationTests } from './voice-client-foundation.test';
import { runMobileVoiceIntegrationTests } from './mobile-voice-integration.test';
import { runVoiceResponseOptimizationTests } from './voice-response-optimization.test';
import { runVoiceTurnDetectionTests } from './voice-turn-detection.test';
import { runVoiceResponseLatencyTests } from './voice-response-latency.test';
import { runVoiceAnalyticsTests } from './voice-analytics.test';

async function runAllTestSuites() {
  console.log('\n==========================================================');
  console.log('--- STARTING ALL RECEPTIONIST PLATFORM TEST SUITES ---');
  console.log('==========================================================');

  await runApiTestSuite();
  await runAuthorizationMiddlewareTests();
  await runAuthIntegrationTests();
  await runCrossBusinessIsolationTests();
  await runDatabaseIntegrationTests();
  await runAppointmentTests();
  await runDemoSeedTests();
  await runAiToolsTests();
  await runOllamaRuntimeTests();
  await runModelAbstractionTests();
  await runOllamaAdapterTests();
  await runIntentRouterTests();
  await runAiReceptionistTests();
  await runSessionStoreTests();
  await runMultiTurnBookingTests();
  await runConversationApiTests();
  await runSpeechBenchmarkUnitTests();
  await runSpeechPipelineTests();
  await runVoiceOrchestratorTests();
  await runVoiceTransportTests();
  await runVoiceClientFoundationTests();
  await runMobileVoiceIntegrationTests();
  await runVoiceResponseOptimizationTests();
  await runVoiceTurnDetectionTests();
  await runVoiceResponseLatencyTests();
  await runVoiceAnalyticsTests();

  console.log('\n==========================================================');
  console.log('🎉 ALL MASTER TEST SUITES PASSED CLEANLY! 🎉');
  console.log('==========================================================\n');
}

runAllTestSuites();
