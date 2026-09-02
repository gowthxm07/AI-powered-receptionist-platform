import { createBusinessSchema, updateBusinessSchema } from '../validation/business.validation';
import { createCustomerSchema, updateCustomerSchema } from '../validation/customer.validation';

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

  console.log('\n--- Running Business Validation Tests ---');

  // Valid Business
  const validBusiness = createBusinessSchema.safeParse({
    name: 'Apex Dental Care',
    phone: '+1-555-0199',
    email: 'contact@apexdental.com',
    address: '100 Medical Center Dr',
    timezone: 'America/New_York',
  });
  assert(validBusiness.success, 'Valid business creation payload should pass');

  // Invalid Business (missing name, invalid email)
  const invalidBusiness = createBusinessSchema.safeParse({
    phone: '+1-555-0199',
    email: 'not-an-email',
  });
  assert(!invalidBusiness.success, 'Business missing name and invalid email should fail');

  console.log('\n--- Running Customer Validation Tests ---');

  // Valid Customer
  const validCustomer = createCustomerSchema.safeParse({
    name: 'John Doe',
    phone: '+1-555-0123',
    email: 'john.doe@example.com',
  });
  assert(validCustomer.success, 'Valid customer payload should pass');

  // Valid Customer without optional email
  const validCustomerNoEmail = createCustomerSchema.safeParse({
    name: 'Jane Smith',
    phone: '+1-555-0124',
  });
  assert(validCustomerNoEmail.success, 'Customer without optional email should pass');

  // Invalid Customer (empty name, short phone)
  const invalidCustomer = createCustomerSchema.safeParse({
    name: '',
    phone: '1',
  });
  assert(!invalidCustomer.success, 'Customer with empty name should fail');

  console.log(`\nTests Completed: ${passed} passed, ${failed} failed.\n`);
  if (failed > 0) process.exit(1);
};

runTests();
