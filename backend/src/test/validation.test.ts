import { createBusinessSchema, updateBusinessSchema } from '../validation/business.validation';
import { createCustomerSchema, updateCustomerSchema } from '../validation/customer.validation';
import { createStaffSchema, updateStaffSchema } from '../validation/staff.validation';
import { createServiceSchema, updateServiceSchema } from '../validation/service.validation';

const runTests = () => {
  let passed = 0;
  let failed = 0;

  const assert = (condition: boolean, testName: string) => {
    if (condition) {
      console.log(`  ✓ ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ ${testName}`);
      failed++;
    }
  };

  const sampleUuid = '123e4567-e89b-12d3-a456-426614174000';

  console.log('\n--- Running Business Validation Tests ---');
  const validBusiness = createBusinessSchema.safeParse({
    name: 'Apex Dental Care',
    phone: '+1-555-0199',
    email: 'contact@apexdental.com',
    address: '100 Medical Center Dr',
    timezone: 'America/New_York',
  });
  assert(validBusiness.success, 'Valid business creation payload should pass');

  const invalidBusiness = createBusinessSchema.safeParse({
    phone: '+1-555-0199',
    email: 'not-an-email',
  });
  assert(!invalidBusiness.success, 'Business missing name and invalid email should fail');

  console.log('\n--- Running Customer Validation Tests ---');
  const validCustomer = createCustomerSchema.safeParse({
    name: 'John Doe',
    phone: '+1-555-0123',
    email: 'john.doe@example.com',
  });
  assert(validCustomer.success, 'Valid customer payload should pass');

  const validCustomerNoEmail = createCustomerSchema.safeParse({
    name: 'Jane Smith',
    phone: '+1-555-0124',
  });
  assert(validCustomerNoEmail.success, 'Customer without optional email should pass');

  const invalidCustomer = createCustomerSchema.safeParse({
    name: '',
    phone: '1',
  });
  assert(!invalidCustomer.success, 'Customer with empty name should fail');

  console.log('\n--- Running Staff Validation Tests ---');
  const validStaff = createStaffSchema.safeParse({
    businessId: sampleUuid,
    name: 'Sarah Connor',
    email: 'sarah.connor@example.com',
    role: 'Lead Receptionist',
    phone: '+1-555-9876',
  });
  assert(validStaff.success, 'Valid staff creation payload should pass');

  const invalidStaffBadUuid = createStaffSchema.safeParse({
    businessId: 'invalid-id',
    name: 'Sarah Connor',
    email: 'sarah@example.com',
    role: 'Receptionist',
  });
  assert(!invalidStaffBadUuid.success, 'Staff with non-UUID businessId should fail');

  console.log('\n--- Running Service Validation Tests ---');
  const validService = createServiceSchema.safeParse({
    businessId: sampleUuid,
    name: 'General Consultation',
    description: 'Initial 30-minute diagnosis and intake review',
    durationMinutes: 30,
  });
  assert(validService.success, 'Valid service creation payload should pass');

  const invalidServiceDuration = createServiceSchema.safeParse({
    businessId: sampleUuid,
    name: 'Zero minute service',
    durationMinutes: 0,
  });
  assert(!invalidServiceDuration.success, 'Service with 0 durationMinutes should fail');

  console.log(`\nTests Completed: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
};

runTests();
