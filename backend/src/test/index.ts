import './validation.test';
import './api.test';
import { runDatabaseIntegrationTests } from './db-integration.test';

async function runAllTests() {
  await runDatabaseIntegrationTests();
}

runAllTests();
