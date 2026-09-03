import { z } from 'zod';

export const AIChannelEnum = z.enum(['WEB', 'VOICE', 'PHONE']);
export type AIChannelType = z.infer<typeof AIChannelEnum>;

export const aiConversationRequestSchema = z.object({
  sessionId: z
    .string()
    .trim()
    .min(1, 'sessionId cannot be empty if provided')
    .max(128, 'sessionId cannot exceed 128 characters')
    .optional(),
  businessId: z
    .string({ required_error: 'businessId is required' })
    .uuid({ message: 'businessId must be a valid UUID' }),
  message: z
    .string({ required_error: 'message is required' })
    .trim()
    .min(1, { message: 'message cannot be empty or whitespace' })
    .max(1000, { message: 'message cannot exceed 1000 characters' }),
  context: z
    .object({
      customerId: z
        .string()
        .uuid({ message: 'customerId must be a valid UUID' })
        .optional(),
      channel: AIChannelEnum.optional(),
      metadata: z.record(z.unknown()).optional(),
    })
    .optional(),
});

export type AIConversationRequestInput = z.infer<typeof aiConversationRequestSchema>;
