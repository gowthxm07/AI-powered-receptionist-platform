import './validation.test';
import './api.test';
import { runAuthorizationMiddlewareTests } from './authorization.test';
import { runAuthIntegrationTests } from './auth-integration.test';
import { runDatabaseIntegrationTests } from './db-integration.test';

async function runAllTestSuites() {
  console.log('\n==========================================================');
  console.log('--- STARTING ALL RECEPTIONIST PLATFORM TEST SUITES ---');
  console.log('==========================================================');

  await runAuthorizationMiddlewareTests();
  await runAuthIntegrationTests();
  await runDatabaseIntegrationTests();

  console.log('\n==========================================================');
  console.log('🎉 ALL TEST SUITES COMPLETED SUCCESSFULLY! 🎉');
  console.log('==========================================================\n');
}

runAllTestSuites();
