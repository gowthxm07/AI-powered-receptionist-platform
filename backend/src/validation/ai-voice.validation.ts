import { z } from 'zod';

export const aiVoiceConversationSchema = z.object({
  businessId: z
    .string({ required_error: 'Business ID is required.' })
    .uuid('Invalid Business ID format. Must be a valid UUID.'),
  sessionId: z
    .string()
    .min(1, 'Session ID cannot be empty.')
    .max(128, 'Session ID exceeds 128 character limit.')
    .optional(),
  customerId: z
    .string()
    .uuid('Invalid Customer ID format. Must be a valid UUID.')
    .optional()
    .nullable(),
  channel: z
    .string()
    .max(32, 'Channel descriptor exceeds 32 characters.')
    .optional(),
  audioBase64: z
    .string()
    .optional(),
  audioFilePath: z
    .string()
    .optional(),
  metadata: z
    .record(z.any())
    .optional(),
});

export type AIVoiceConversationRequestInput = z.infer<typeof aiVoiceConversationSchema>;
