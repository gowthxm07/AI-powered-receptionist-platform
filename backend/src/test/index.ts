import './validation.test';
import { runApiTestSuite } from './api.test';
import { runAuthorizationMiddlewareTests } from './authorization.test';
import { runAuthIntegrationTests } from './auth-integration.test';
import { runCrossBusinessIsolationTests } from './cross-business-isolation.test';
import { runDatabaseIntegrationTests } from './db-integration.test';
import { runAppointmentTests } from './appointment.test';
import { runDemoSeedTests } from './demo-seed.test';

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

  console.log('\n==========================================================');
  console.log('🎉 ALL MASTER TEST SUITES PASSED CLEANLY! 🎉');
  console.log('==========================================================\n');
}

runAllTestSuites();
