import { z } from 'zod';

export const createBusinessSchema = z.object({
  name: z
    .string({ required_error: 'Business name is required' })
    .min(1, 'Business name cannot be empty')
    .max(255, 'Business name too long'),
  phone: z
    .string({ required_error: 'Phone number is required' })
    .min(3, 'Phone number must be at least 3 characters')
    .max(50, 'Phone number too long'),
  email: z
    .string({ required_error: 'Email is required' })
    .email('Invalid email address format')
    .max(255, 'Email too long'),
  address: z.string().max(500, 'Address too long').optional(),
  description: z.string().max(1000, 'Description too long').optional(),
  timezone: z.string().max(50).default('UTC'),
});

export const updateBusinessSchema = createBusinessSchema.partial();

export type CreateBusinessInput = z.infer<typeof createBusinessSchema>;
export type UpdateBusinessInput = z.infer<typeof updateBusinessSchema>;
