import assert from 'assert';
import { InMemorySessionStore } from '../modules/ai/conversation/in-memory-session-store';
import { BookingConversationStep } from '../modules/ai/conversation/conversation-session.types';

export async function runSessionStoreTests(): Promise<void> {
  console.log('\n======================================================');
  console.log('--- Running Conversation Session Store Tests ---');
  console.log('======================================================');

  const store = new InMemorySessionStore(100); // 100ms TTL for testing

  // 1. Create and retrieve session
  console.log('\n1. Testing Session Creation & Retrieval:');
  const now = new Date();
  await store.setSession({
    sessionId: 'sess-1',
    businessId: 'biz-1',
    step: BookingConversationStep.BOOKING_COLLECT_SERVICE,
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + 1000),
  });

  const retrieved = await store.getSession('sess-1');
  assert(retrieved !== null);
  assert.strictEqual(retrieved.sessionId, 'sess-1');
  assert.strictEqual(retrieved.step, BookingConversationStep.BOOKING_COLLECT_SERVICE);
  console.log('  ✓ Session created and retrieved successfully.');

  // 2. Update session
  console.log('\n2. Testing Session Mutation & Step Transition:');
  const updated = await store.updateSession('sess-1', {
    step: BookingConversationStep.BOOKING_COLLECT_STAFF,
    selectedServiceId: 'srv-123',
    selectedServiceName: 'Dental Cleaning',
  });
  assert(updated !== null);
  assert.strictEqual(updated.step, BookingConversationStep.BOOKING_COLLECT_STAFF);
  assert.strictEqual(updated.selectedServiceId, 'srv-123');
  assert.strictEqual(updated.selectedServiceName, 'Dental Cleaning');
  console.log('  ✓ Session fields and steps updated cleanly.');

  // 3. Multi-session isolation
  console.log('\n3. Testing Multi-Session Isolation:');
  await store.setSession({
    sessionId: 'sess-2',
    businessId: 'biz-2',
    step: BookingConversationStep.BOOKING_COLLECT_DATE,
    selectedServiceName: 'Root Canal',
    createdAt: now,
    updatedAt: now,
    expiresAt: new Date(now.getTime() + 1000),
  });

  const s1 = await store.getSession('sess-1');
  const s2 = await store.getSession('sess-2');
  assert(s1 && s2);
  assert.strictEqual(s1.selectedServiceName, 'Dental Cleaning');
  assert.strictEqual(s2.selectedServiceName, 'Root Canal');
  assert.notStrictEqual(s1.businessId, s2.businessId);
  console.log('  ✓ Simultaneous sessions remain completely isolated.');

  // 4. Session deletion
  console.log('\n4. Testing Session Deletion:');
  const deleted = await store.deleteSession('sess-1');
  assert.strictEqual(deleted, true);
  const checkDeleted = await store.getSession('sess-1');
  assert.strictEqual(checkDeleted, null);
  console.log('  ✓ Session explicitly deleted successfully.');

  // 5. Expiration handling
  console.log('\n5. Testing Session Expiration (TTL):');
  const fastStore = new InMemorySessionStore(50); // 50ms TTL
  await fastStore.setSession({
    sessionId: 'fast-sess',
    businessId: 'biz-1',
    step: BookingConversationStep.BOOKING_COLLECT_SERVICE,
    createdAt: new Date(),
    updatedAt: new Date(),
    expiresAt: new Date(Date.now() + 40), // expires in 40ms
  });

  // Wait 60ms for session to expire
  await new Promise((resolve) => setTimeout(resolve, 60));
  const expiredSession = await fastStore.getSession('fast-sess');
  assert.strictEqual(expiredSession, null, 'Expired session must return null');
  console.log('  ✓ Expired session automatically purged on retrieval.');

  console.log('\n======================================================');
  console.log('🎉 SESSION STORE TESTS PASSED! 🎉');
  console.log('======================================================\n');
}
