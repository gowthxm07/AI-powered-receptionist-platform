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

  console.log('\n==========================================================');
  console.log('🎉 ALL MASTER TEST SUITES PASSED CLEANLY! 🎉');
  console.log('==========================================================\n');
}

runAllTestSuites();
