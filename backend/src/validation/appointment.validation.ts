import { z } from 'zod';

export const appointmentStatusEnum = z.enum([
  'SCHEDULED',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
]);

export const createAppointmentSchema = z
  .object({
    businessId: z
      .string({ required_error: 'Business ID is required' })
      .uuid('Business ID must be a valid UUID'),
    customerId: z
      .string({ required_error: 'Customer ID is required' })
      .uuid('Customer ID must be a valid UUID'),
    staffId: z
      .string()
      .uuid('Staff ID must be a valid UUID')
      .optional()
      .nullable(),
    serviceId: z
      .string({ required_error: 'Service ID is required' })
      .uuid('Service ID must be a valid UUID'),
    startTime: z
      .string({ required_error: 'Start time is required' })
      .datetime({ message: 'Start time must be a valid ISO-8601 DateTime string' }),
    endTime: z
      .string()
      .datetime({ message: 'End time must be a valid ISO-8601 DateTime string' })
      .optional(),
    status: appointmentStatusEnum.default('SCHEDULED'),
    notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.endTime) {
        return new Date(data.endTime) > new Date(data.startTime);
      }
      return true;
    },
    {
      message: 'End time must be after start time',
      path: ['endTime'],
    }
  );

export const updateAppointmentSchema = z
  .object({
    businessId: z.string().uuid('Business ID must be a valid UUID').optional(),
    customerId: z.string().uuid('Customer ID must be a valid UUID').optional(),
    staffId: z.string().uuid('Staff ID must be a valid UUID').optional().nullable(),
    serviceId: z.string().uuid('Service ID must be a valid UUID').optional(),
    startTime: z.string().datetime({ message: 'Start time must be valid ISO-8601' }).optional(),
    endTime: z.string().datetime({ message: 'End time must be valid ISO-8601' }).optional(),
    status: appointmentStatusEnum.optional(),
    notes: z.string().max(1000, 'Notes cannot exceed 1000 characters').optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return new Date(data.endTime) > new Date(data.startTime);
      }
      return true;
    },
    {
      message: 'End time must be after start time',
      path: ['endTime'],
    }
  );

export const appointmentQuerySchema = z.object({
  businessId: z.string().uuid('Business ID must be a valid UUID').optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  staffId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  status: appointmentStatusEnum.optional(),
});

export const availabilityCheckSchema = z
  .object({
    businessId: z
      .string({ required_error: 'Business ID is required' })
      .uuid('Business ID must be a valid UUID'),
    staffId: z
      .string({ required_error: 'Staff ID is required' })
      .uuid('Staff ID must be a valid UUID'),
    startTime: z
      .string({ required_error: 'Start time is required' })
      .datetime({ message: 'Start time must be a valid ISO-8601 DateTime' }),
    endTime: z.string().datetime().optional(),
    durationMinutes: z.coerce.number().int().positive().max(1440).optional(),
    excludeAppointmentId: z.string().uuid().optional(),
  })
  .refine((data) => data.endTime || data.durationMinutes, {
    message: 'Either endTime or durationMinutes must be provided',
    path: ['durationMinutes'],
  });

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type AppointmentQueryInput = z.infer<typeof appointmentQuerySchema>;
export type AvailabilityCheckInput = z.infer<typeof availabilityCheckSchema>;
