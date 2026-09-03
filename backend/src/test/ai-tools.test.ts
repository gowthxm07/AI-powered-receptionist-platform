import assert from 'assert';
import { prisma } from '../lib/prisma';
import {
  toolRegistry,
  toolRouter,
  AIContextBuilder,
  AIConversationContext,
} from '../modules/ai';

export async function runAiToolsTests(): Promise<void> {
  console.log('\n======================================================');
  console.log('--- Running AI Receptionist Tools & Context Tests ---');
  console.log('======================================================');

  const biz1Id = 'b0000001-0000-0000-0000-000000000001'; // Lumina Dental Care
  const biz2Id = 'b0000002-0000-0000-0000-000000000002'; // Radiance Dermatology

  const contextBiz1: AIConversationContext = {
    businessId: biz1Id,
    sessionId: 'test_session_123',
    channel: 'WEB',
  };

  const contextBiz2: AIConversationContext = {
    businessId: biz2Id,
    sessionId: 'test_session_456',
    channel: 'PHONE',
  };

  // --------------------------------------------------------------------------
  // 1. Tool Registry & Discovery Tests
  // --------------------------------------------------------------------------
  console.log('\n1. Testing Tool Registry and Discovery:');
  const availableTools = toolRegistry.getAvailableTools();
  assert(availableTools.length >= 8, `Expected at least 8 registered tools, found ${availableTools.length}`);
  assert(toolRegistry.hasTool('search_customer'), 'Tool search_customer must be registered');
  assert(toolRegistry.hasTool('get_customer'), 'Tool get_customer must be registered');
  assert(toolRegistry.hasTool('get_services'), 'Tool get_services must be registered');
  assert(toolRegistry.hasTool('get_staff'), 'Tool get_staff must be registered');
  assert(toolRegistry.hasTool('check_availability'), 'Tool check_availability must be registered');
  assert(toolRegistry.hasTool('get_appointments'), 'Tool get_appointments must be registered');
  assert(toolRegistry.hasTool('create_appointment'), 'Tool create_appointment must be registered');
  assert(toolRegistry.hasTool('cancel_appointment'), 'Tool cancel_appointment must be registered');
  assert(toolRegistry.hasTool('get_business_info'), 'Tool get_business_info must be registered');
  console.log(`  ✓ Tool registry verified with ${availableTools.length} registered tools.`);

  // --------------------------------------------------------------------------
  // 2. Tool Router & Error Handling Tests
  // --------------------------------------------------------------------------
  console.log('\n2. Testing Tool Router and Context Validation:');

  // Unknown tool call
  const unknownResult = await toolRouter.executeTool({
    tool: 'non_existent_tool',
    input: {},
    context: contextBiz1,
  });
  assert.strictEqual(unknownResult.success, false);
  assert.strictEqual(unknownResult.error?.code, 'UNKNOWN_TOOL');
  console.log('  ✓ Rejects unknown tool calls with UNKNOWN_TOOL error code.');

  // Missing businessId context
  const missingBizResult = await toolRouter.executeTool({
    tool: 'get_business_info',
    input: {},
    context: { businessId: '', sessionId: 's1' },
  });
  assert.strictEqual(missingBizResult.success, false);
  assert.strictEqual(missingBizResult.error?.code, 'INVALID_CONTEXT');
  console.log('  ✓ Rejects tool execution with missing businessId.');

  // Invalid input validation (Zod schema rejection)
  const invalidInputResult = await toolRouter.executeTool({
    tool: 'search_customer',
    input: { query: '' }, // min(1) required
    context: contextBiz1,
  });
  assert.strictEqual(invalidInputResult.success, false);
  assert.strictEqual(invalidInputResult.error?.code, 'INVALID_INPUT');
  console.log('  ✓ Rejects invalid inputs with Zod validation errors.');

  // --------------------------------------------------------------------------
  // 3. Customer Tool & Tenant Isolation Tests
  // --------------------------------------------------------------------------
  console.log('\n3. Testing Customer Tools with Tenant Isolation:');

  // Search customer in Business 1 (should find Rahul)
  const searchResult1 = await toolRouter.executeTool({
    tool: 'search_customer',
    input: { query: 'Rahul' },
    context: contextBiz1,
  });
  assert.strictEqual(searchResult1.success, true);
  const searchData1 = searchResult1.data as any[];
  assert(Array.isArray(searchData1));
  assert(searchData1.length > 0);
  assert.strictEqual(searchData1[0].name, 'Rahul Sharma');
  console.log(`  ✓ Business 1 search finds customer '${searchData1[0].name}'.`);

  // Search same customer in Business 2 (must NOT leak Business 1 customer)
  const searchResult2 = await toolRouter.executeTool({
    tool: 'search_customer',
    input: { query: 'Rahul' },
    context: contextBiz2,
  });
  assert.strictEqual(searchResult2.success, true);
  const searchData2 = searchResult2.data as any[];
  assert.strictEqual(searchData2.length, 0, 'Business 2 must NOT see Business 1 customers');
  console.log('  ✓ Multi-tenant isolation verified: Business 2 search returns 0 results for Business 1 customer.');

  // Get customer by ID cross-tenant rejection
  const getCustomerResult = await toolRouter.executeTool({
    tool: 'get_customer',
    input: { customerId: 'c0000001-0000-0000-0000-000000000001' }, // Rahul Sharma in Biz 1
    context: contextBiz2, // Queried from Biz 2
  });
  assert.strictEqual(getCustomerResult.success, false);
  assert.strictEqual(getCustomerResult.error?.code, 'CUSTOMER_NOT_FOUND');
  console.log('  ✓ Cross-tenant get_customer query rejected with CUSTOMER_NOT_FOUND.');

  // --------------------------------------------------------------------------
  // 4. Service & Staff Tools Tests
  // --------------------------------------------------------------------------
  console.log('\n4. Testing Service and Staff Discovery Tools:');

  const servicesResult = await toolRouter.executeTool({
    tool: 'get_services',
    input: {},
    context: contextBiz1,
  });
  assert.strictEqual(servicesResult.success, true);
  const servicesData = servicesResult.data as any[];
  assert(servicesData.length >= 5);
  console.log(`  ✓ Retrieved ${servicesData.length} services for Business 1.`);

  const staffResult = await toolRouter.executeTool({
    tool: 'get_staff',
    input: {},
    context: contextBiz1,
  });
  assert.strictEqual(staffResult.success, true);
  const staffData = staffResult.data as any[];
  assert(staffData.length >= 4);
  console.log(`  ✓ Retrieved ${staffData.length} staff specialists for Business 1.`);

  const businessInfoResult = await toolRouter.executeTool({
    tool: 'get_business_info',
    input: {},
    context: contextBiz1,
  });
  assert.strictEqual(businessInfoResult.success, true);
  const bizInfoData = businessInfoResult.data as any;
  assert.strictEqual(bizInfoData.name, 'Lumina Dental Care');
  console.log(`  ✓ Retrieved company info for '${bizInfoData.name}'.`);

  // --------------------------------------------------------------------------
  // 5. Appointment Tools & Conflict Detection Tests
  // --------------------------------------------------------------------------
  console.log('\n5. Testing Appointment Tools & Scheduling Conflict Enforcement:');

  const staff1Id = 's0000001-0000-0000-0000-000000000001'; // Dr. Marcus Thorne
  const customer1Id = 'c0000001-0000-0000-0000-000000000001'; // Rahul Sharma
  const service1Id = 'sv000001-0000-0000-0000-000000000001'; // Comprehensive Exam (30m)

  // Booking a slot in distant future for testing
  const testStartTime = new Date('2030-01-15T10:00:00.000Z');

  // Check availability on free slot
  const availResult1 = await toolRouter.executeTool({
    tool: 'check_availability',
    input: {
      staffId: staff1Id,
      startTime: testStartTime.toISOString(),
      durationMinutes: 30,
    },
    context: contextBiz1,
  });
  assert.strictEqual(availResult1.success, true);
  const availData1 = availResult1.data as any;
  assert.strictEqual(availData1.available, true);
  console.log('  ✓ Availability check confirms open slot is available.');

  // Create appointment via AI tool
  const createResult = await toolRouter.executeTool({
    tool: 'create_appointment',
    input: {
      customerId: customer1Id,
      serviceId: service1Id,
      staffId: staff1Id,
      startTime: testStartTime.toISOString(),
      notes: 'AI Automated Test Booking',
    },
    context: contextBiz1,
  });
  assert.strictEqual(createResult.success, true);
  const createData = createResult.data as any;
  assert(createData.id);
  const createdAptId = createData.id;
  console.log(`  ✓ Created appointment '${createdAptId}' via AI create_appointment tool.`);

  // Verify availability on now-booked slot
  const availResult2 = await toolRouter.executeTool({
    tool: 'check_availability',
    input: {
      staffId: staff1Id,
      startTime: testStartTime.toISOString(),
      durationMinutes: 30,
    },
    context: contextBiz1,
  });
  assert.strictEqual(availResult2.success, true);
  const availData2 = availResult2.data as any;
  assert.strictEqual(availData2.available, false);
  console.log('  ✓ Availability check confirms booked slot is no longer available.');

  // Overlapping appointment attempt must be rejected with SCHEDULING_CONFLICT
  const overlapResult = await toolRouter.executeTool({
    tool: 'create_appointment',
    input: {
      customerId: customer1Id,
      serviceId: service1Id,
      staffId: staff1Id,
      startTime: new Date('2030-01-15T10:15:00.000Z').toISOString(), // Overlaps 10:00-10:30
    },
    context: contextBiz1,
  });
  assert.strictEqual(overlapResult.success, false);
  assert.strictEqual(overlapResult.error?.code, 'SCHEDULING_CONFLICT');
  console.log('  ✓ Overlapping booking rejected with SCHEDULING_CONFLICT error code.');

  // Cross-business resource rejection
  const crossBizResult = await toolRouter.executeTool({
    tool: 'create_appointment',
    input: {
      customerId: 'c0000015-0000-0000-0000-000000000015', // Biz 2 customer
      serviceId: service1Id,
      staffId: staff1Id,
      startTime: new Date('2030-01-15T14:00:00.000Z').toISOString(),
    },
    context: contextBiz1,
  });
  assert.strictEqual(crossBizResult.success, false);
  assert.strictEqual(crossBizResult.error?.code, 'CUSTOMER_NOT_FOUND');
  console.log('  ✓ Rejects cross-tenant customer in create_appointment.');

  // Cancel appointment via tool
  const cancelResult = await toolRouter.executeTool({
    tool: 'cancel_appointment',
    input: {
      appointmentId: createdAptId,
      reason: 'Caller changed their schedule.',
    },
    context: contextBiz1,
  });
  assert.strictEqual(cancelResult.success, true);
  console.log('  ✓ Successfully cancelled appointment via cancel_appointment tool.');

  // Clean up created test appointment
  await prisma.appointment.delete({ where: { id: createdAptId } }).catch(() => {});

  // --------------------------------------------------------------------------
  // 6. AI Context Builder Tests
  // --------------------------------------------------------------------------
  console.log('\n6. Testing AI Context Builder:');
  const builtContext = await AIContextBuilder.buildContext({
    businessId: biz1Id,
    customerId: customer1Id,
    channel: 'VOICE',
  });
  assert.strictEqual(builtContext.businessId, biz1Id);
  assert.strictEqual(builtContext.customerId, customer1Id);
  assert.strictEqual(builtContext.channel, 'VOICE');
  assert(builtContext.sessionId.startsWith('session_'));
  const meta = builtContext.metadata as any;
  assert.strictEqual(meta?.businessName, 'Lumina Dental Care');
  console.log('  ✓ AI Context Builder generates lightweight, verified context successfully.');

  console.log('\n======================================================');
  console.log('🎉 ALL AI RECEPTIONIST TOOL TESTS PASSED CLEANLY! 🎉');
  console.log('======================================================\n');
}
