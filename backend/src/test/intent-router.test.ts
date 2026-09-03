import assert from 'assert';
import { FastIntentRouter } from '../modules/ai/routing/intent-router';
import { AIIntent } from '../modules/ai/types/intent.types';

export async function runIntentRouterTests(): Promise<void> {
  console.log('\n======================================================');
  console.log('--- Running Fast Intent Router Unit Tests ---');
  console.log('======================================================');

  // 1. Greetings
  console.log('\n1. Testing Greeting Intent Detection:');
  const greeting1 = FastIntentRouter.routeIntent('Hello');
  assert.strictEqual(greeting1.intent, AIIntent.GREETING);

  const greeting2 = FastIntentRouter.routeIntent('Good morning there');
  assert.strictEqual(greeting2.intent, AIIntent.GREETING);

  const greeting3 = FastIntentRouter.routeIntent('Hey');
  assert.strictEqual(greeting3.intent, AIIntent.GREETING);
  console.log('  ✓ GREETING intent detected accurately across phrasing variants.');

  // 2. Goodbyes
  console.log('\n2. Testing Goodbye Intent Detection:');
  const bye1 = FastIntentRouter.routeIntent('Goodbye!');
  assert.strictEqual(bye1.intent, AIIntent.GOODBYE);

  const bye2 = FastIntentRouter.routeIntent('Have a great day, thanks bye');
  assert.strictEqual(bye2.intent, AIIntent.GOODBYE);
  console.log('  ✓ GOODBYE intent detected accurately.');

  // 3. Service inquiries
  console.log('\n3. Testing Service Information Intent Detection:');
  const srv1 = FastIntentRouter.routeIntent('What services do you offer?');
  assert.strictEqual(srv1.intent, AIIntent.SERVICE_INFORMATION);

  const srv2 = FastIntentRouter.routeIntent('Can you tell me your prices and treatments?');
  assert.strictEqual(srv2.intent, AIIntent.SERVICE_INFORMATION);
  console.log('  ✓ SERVICE_INFORMATION intent detected accurately.');

  // 4. Staff inquiries
  console.log('\n4. Testing Staff Information Intent Detection:');
  const staff1 = FastIntentRouter.routeIntent('Who works there?');
  assert.strictEqual(staff1.intent, AIIntent.STAFF_INFORMATION);

  const staff2 = FastIntentRouter.routeIntent('Who are your specialists and doctors?');
  assert.strictEqual(staff2.intent, AIIntent.STAFF_INFORMATION);
  console.log('  ✓ STAFF_INFORMATION intent detected accurately.');

  // 5. Booking and availability
  console.log('\n5. Testing Booking & Availability Intent Detection:');
  const book1 = FastIntentRouter.routeIntent('I want to book an appointment');
  assert.strictEqual(book1.intent, AIIntent.BOOK_APPOINTMENT);

  const avail1 = FastIntentRouter.routeIntent('Do you have anything available tomorrow?');
  assert.strictEqual(avail1.intent, AIIntent.APPOINTMENT_AVAILABILITY);
  assert.strictEqual(avail1.extractedParams?.dateText, 'tomorrow');
  console.log('  ✓ BOOK_APPOINTMENT and APPOINTMENT_AVAILABILITY detected with parameter extraction.');

  // 6. Cancellation and rescheduling
  console.log('\n6. Testing Cancellation & Reschedule Intent Detection:');
  const cancel1 = FastIntentRouter.routeIntent('Cancel my appointment please');
  assert.strictEqual(cancel1.intent, AIIntent.CANCEL_APPOINTMENT);

  const resched1 = FastIntentRouter.routeIntent('Can I reschedule my appointment for tomorrow?');
  assert.strictEqual(resched1.intent, AIIntent.RESCHEDULE_APPOINTMENT);
  console.log('  ✓ CANCEL_APPOINTMENT and RESCHEDULE_APPOINTMENT detected accurately.');

  // 7. Business information
  console.log('\n7. Testing Business Information Intent Detection:');
  const biz1 = FastIntentRouter.routeIntent('Where are you located and what are your opening hours?');
  assert.strictEqual(biz1.intent, AIIntent.BUSINESS_INFORMATION);
  console.log('  ✓ BUSINESS_INFORMATION intent detected accurately.');

  // 8. Customer lookup / phone number extraction
  console.log('\n8. Testing Customer Lookup & Phone Extraction:');
  const cust1 = FastIntentRouter.routeIntent('My phone number is 555-123-4567');
  assert.strictEqual(cust1.intent, AIIntent.CUSTOMER_LOOKUP);
  assert.strictEqual(cust1.extractedParams?.phone, '555-123-4567');
  console.log('  ✓ CUSTOMER_LOOKUP detected with phone extraction.');

  // 9. Unknown / general question fallback
  console.log('\n9. Testing Unknown / General Question Fallback:');
  const unk1 = FastIntentRouter.routeIntent('Tell me something interesting about quantum physics');
  assert.strictEqual(unk1.intent, AIIntent.UNKNOWN);
  console.log('  ✓ Unrecognized query safely categorized as UNKNOWN (routed to Ollama fallback).');

  console.log('\n======================================================');
  console.log('🎉 FAST INTENT ROUTER TESTS PASSED! 🎉');
  console.log('======================================================\n');
}
