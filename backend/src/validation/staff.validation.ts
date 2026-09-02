import { z } from 'zod';

export const createStaffSchema = z.object({
  businessId: z
    .string({ required_error: 'Business ID is required' })
    .uuid('Business ID must be a valid UUID'),
  name: z
    .string({ required_error: 'Staff name is required' })
    .min(1, 'Staff name cannot be empty')
    .max(255, 'Staff name too long'),
  email: z
    .string({ required_error: 'Staff email is required' })
    .email('Invalid email address format')
    .max(255, 'Email too long'),
  phone: z.string().max(50, 'Phone number too long').optional(),
  role: z
    .string({ required_error: 'Role is required' })
    .min(1, 'Role cannot be empty')
    .max(100, 'Role too long'),
  isActive: z.boolean().default(true),
});

export const updateStaffSchema = createStaffSchema.partial();

export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
