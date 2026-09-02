import { z } from 'zod';

export const createServiceSchema = z.object({
  businessId: z
    .string({ required_error: 'Business ID is required' })
    .uuid('Business ID must be a valid UUID'),
  name: z
    .string({ required_error: 'Service name is required' })
    .min(1, 'Service name cannot be empty')
    .max(255, 'Service name too long'),
  description: z.string().max(1000, 'Description too long').optional(),
  durationMinutes: z
    .number({ required_error: 'Duration in minutes is required' })
    .int('Duration must be an integer')
    .min(1, 'Duration must be at least 1 minute')
    .max(1440, 'Duration cannot exceed 24 hours (1440 minutes)'),
  isActive: z.boolean().default(true),
});

export const updateServiceSchema = createServiceSchema.partial();

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
