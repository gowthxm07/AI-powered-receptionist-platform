import { z } from 'zod';

export const createCustomerSchema = z.object({
  businessId: z
    .string()
    .uuid('Invalid business ID format')
    .optional(),
  name: z
    .string({ required_error: 'Customer name is required' })
    .min(1, 'Customer name cannot be empty')
    .max(255, 'Customer name too long'),
  phone: z
    .string({ required_error: 'Phone number is required' })
    .min(3, 'Phone number must be at least 3 characters')
    .max(50, 'Phone number too long'),
  email: z
    .string()
    .email('Invalid email address format')
    .max(255, 'Email too long')
    .optional()
    .or(z.literal('')),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
