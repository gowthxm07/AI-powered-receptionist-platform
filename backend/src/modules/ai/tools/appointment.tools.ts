import { z } from 'zod';
import { AppointmentStatus } from '@prisma/client';
import { prisma } from '../../../lib/prisma';
import { AITool, AIToolResult } from '../types/tool.types';
import { AIConversationContext } from '../types/context.types';
import { AppointmentService, ConflictError } from '../../../services/appointment.service';
import { toolRegistry } from './registry';

// ============================================================================
// Common Safe Output Structure
// ============================================================================
export interface SafeAppointmentSummary {
  id: string;
  businessId: string;
  customerId: string;
  customerName?: string;
  staffId: string | null;
  staffName?: string | null;
  serviceId: string;
  serviceName?: string;
  startTime: Date;
  endTime: Date;
  status: AppointmentStatus;
  notes: string | null;
}

// ============================================================================
// 1. Check Availability Tool
// ============================================================================
export const checkAvailabilitySchema = z.object({
  staffId: z.string().min(1, 'Staff ID is required'),
  startTime: z.string().datetime({ message: 'startTime must be an ISO 8601 string' }),
  durationMinutes: z.number().int().positive().optional(),
  endTime: z.string().datetime({ message: 'endTime must be an ISO 8601 string' }).optional(),
});

export type CheckAvailabilityInput = z.infer<typeof checkAvailabilitySchema>;

export const checkAvailabilityTool: AITool<CheckAvailabilityInput, { available: boolean; reason?: string }> = {
  name: 'check_availability',
  description: 'Checks whether a staff specialist is free or has a scheduling conflict during a proposed time interval.',
  schema: checkAvailabilitySchema,
  definition: {
    name: 'check_availability',
    description: 'Checks whether a staff specialist is free or has a scheduling conflict during a proposed time interval.',
    parameters: {
      type: 'object',
      properties: {
        staffId: {
          type: 'string',
          description: 'The unique ID of the staff specialist.',
        },
        startTime: {
          type: 'string',
          description: 'Proposed start timestamp in ISO 8601 format.',
        },
        durationMinutes: {
          type: 'number',
          description: 'Duration of the proposed session in minutes (optional if endTime provided).',
        },
        endTime: {
          type: 'string',
          description: 'Proposed end timestamp in ISO 8601 format (optional if durationMinutes provided).',
        },
      },
      required: ['staffId', 'startTime'],
    },
  },
  async execute(input: CheckAvailabilityInput, context: AIConversationContext): Promise<AIToolResult<{ available: boolean; reason?: string }>> {
    const result = await AppointmentService.checkAvailability({
      businessId: context.businessId,
      staffId: input.staffId,
      startTime: input.startTime,
      durationMinutes: input.durationMinutes,
      endTime: input.endTime,
    });

    return {
      success: true,
      data: result,
      message: result.available
        ? 'The requested time slot is available.'
        : `Slot unavailable: ${result.reason || 'Scheduling conflict detected.'}`,
    };
  },
};

// ============================================================================
// 2. Get Appointments Tool
// ============================================================================
export const getAppointmentsSchema = z.object({
  staffId: z.string().optional(),
  customerId: z.string().optional(),
  status: z.nativeEnum(AppointmentStatus).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type GetAppointmentsInput = z.infer<typeof getAppointmentsSchema>;

export const getAppointmentsTool: AITool<GetAppointmentsInput, SafeAppointmentSummary[]> = {
  name: 'get_appointments',
  description: 'Retrieves appointments for the active business with optional filters by customer, staff, status, or date range.',
  schema: getAppointmentsSchema,
  definition: {
    name: 'get_appointments',
    description: 'Retrieves appointments for the active business with optional filters by customer, staff, status, or date range.',
    parameters: {
      type: 'object',
      properties: {
        staffId: { type: 'string', description: 'Filter by assigned staff member ID.' },
        customerId: { type: 'string', description: 'Filter by customer ID.' },
        status: {
          type: 'string',
          enum: Object.values(AppointmentStatus),
          description: 'Filter by appointment status (SCHEDULED, CONFIRMED, COMPLETED, CANCELLED, NO_SHOW).',
        },
        startDate: { type: 'string', description: 'Filter appointments starting on or after this ISO date.' },
        endDate: { type: 'string', description: 'Filter appointments starting on or before this ISO date.' },
      },
    },
  },
  async execute(input: GetAppointmentsInput, context: AIConversationContext): Promise<AIToolResult<SafeAppointmentSummary[]>> {
    const appointments = await prisma.appointment.findMany({
      where: {
        businessId: context.businessId,
        ...(input.staffId ? { staffId: input.staffId } : {}),
        ...(input.customerId ? { customerId: input.customerId } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.startDate || input.endDate
          ? {
              startTime: {
                ...(input.startDate ? { gte: new Date(input.startDate) } : {}),
                ...(input.endDate ? { lte: new Date(input.endDate) } : {}),
              },
            }
          : {}),
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        staff: { select: { id: true, name: true, role: true } },
        service: { select: { id: true, name: true, durationMinutes: true } },
      },
      orderBy: { startTime: 'asc' },
      take: 25,
    });

    const formatted: SafeAppointmentSummary[] = appointments.map((apt) => ({
      id: apt.id,
      businessId: apt.businessId,
      customerId: apt.customerId,
      customerName: apt.customer?.name,
      staffId: apt.staffId,
      staffName: apt.staff?.name,
      serviceId: apt.serviceId,
      serviceName: apt.service?.name,
      startTime: apt.startTime,
      endTime: apt.endTime,
      status: apt.status,
      notes: apt.notes,
    }));

    return {
      success: true,
      data: formatted,
      message: `Retrieved ${formatted.length} appointment(s).`,
    };
  },
};

// ============================================================================
// 3. Create Appointment Tool
// ============================================================================
export const createAppointmentSchema = z.object({
  customerId: z.string().min(1, 'Customer ID is required'),
  serviceId: z.string().min(1, 'Service ID is required'),
  staffId: z.string().optional(),
  startTime: z.string().datetime({ message: 'startTime must be an ISO 8601 string' }),
  endTime: z.string().datetime({ message: 'endTime must be an ISO 8601 string' }).optional(),
  notes: z.string().max(500).optional(),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;

export const createAppointmentTool: AITool<CreateAppointmentInput, SafeAppointmentSummary> = {
  name: 'create_appointment',
  description: 'Books a new appointment in the system with automatic duration derivation and strict staff conflict detection.',
  schema: createAppointmentSchema,
  definition: {
    name: 'create_appointment',
    description: 'Books a new appointment in the system with automatic duration derivation and strict staff conflict detection.',
    parameters: {
      type: 'object',
      properties: {
        customerId: { type: 'string', description: 'The unique ID of the customer.' },
        serviceId: { type: 'string', description: 'The unique ID of the service to book.' },
        staffId: { type: 'string', description: 'The unique ID of the staff specialist (optional).' },
        startTime: { type: 'string', description: 'Start timestamp in ISO 8601 format.' },
        endTime: { type: 'string', description: 'End timestamp in ISO 8601 format (optional, auto-derived from service duration).' },
        notes: { type: 'string', description: 'Notes or caller remarks for the booking.' },
      },
      required: ['customerId', 'serviceId', 'startTime'],
    },
  },
  async execute(input: CreateAppointmentInput, context: AIConversationContext): Promise<AIToolResult<SafeAppointmentSummary>> {
    // 1. Verify customer belongs to context.businessId
    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, businessId: context.businessId },
    });
    if (!customer) {
      return {
        success: false,
        error: {
          code: 'CUSTOMER_NOT_FOUND',
          message: `Customer with ID '${input.customerId}' does not belong to business '${context.businessId}'.`,
        },
      };
    }

    // 2. Verify service belongs to context.businessId
    const service = await prisma.service.findFirst({
      where: { id: input.serviceId, businessId: context.businessId },
    });
    if (!service) {
      return {
        success: false,
        error: {
          code: 'SERVICE_NOT_FOUND',
          message: `Service with ID '${input.serviceId}' does not belong to business '${context.businessId}'.`,
        },
      };
    }

    // 3. Verify staff belongs to context.businessId if provided
    let staffName: string | undefined;
    if (input.staffId) {
      const staff = await prisma.staff.findFirst({
        where: { id: input.staffId, businessId: context.businessId },
      });
      if (!staff) {
        return {
          success: false,
          error: {
            code: 'STAFF_NOT_FOUND',
            message: `Staff specialist with ID '${input.staffId}' does not belong to business '${context.businessId}'.`,
          },
        };
      }
      staffName = staff.name;
    }

    // 4. Calculate start & end times
    const start = new Date(input.startTime);
    const end = input.endTime
      ? new Date(input.endTime)
      : new Date(start.getTime() + service.durationMinutes * 60000);

    if (end <= start) {
      return {
        success: false,
        error: {
          code: 'INVALID_INTERVAL',
          message: 'Appointment end time must be after start time.',
        },
      };
    }

    // 5. Transactional conflict check & creation
    try {
      const created = await prisma.$transaction(async (tx) => {
        if (input.staffId) {
          const conflict = await tx.appointment.findFirst({
            where: {
              staffId: input.staffId,
              status: { not: AppointmentStatus.CANCELLED },
              startTime: { lt: end },
              endTime: { gt: start },
            },
            select: { id: true },
          });

          if (conflict) {
            throw new ConflictError('The selected staff member has a scheduling conflict during this time interval.');
          }
        }

        return tx.appointment.create({
          data: {
            businessId: context.businessId,
            customerId: input.customerId,
            serviceId: input.serviceId,
            staffId: input.staffId || null,
            startTime: start,
            endTime: end,
            status: AppointmentStatus.CONFIRMED,
            notes: input.notes || 'Booked via AI Smart Receptionist',
          },
        });
      });

      return {
        success: true,
        data: {
          id: created.id,
          businessId: created.businessId,
          customerId: created.customerId,
          customerName: customer.name,
          staffId: created.staffId,
          staffName: staffName || null,
          serviceId: created.serviceId,
          serviceName: service.name,
          startTime: created.startTime,
          endTime: created.endTime,
          status: created.status,
          notes: created.notes,
        },
        message: `Appointment successfully booked for ${customer.name} with ${service.name} from ${start.toISOString()} to ${end.toISOString()}.`,
      };
    } catch (err: any) {
      if (err instanceof ConflictError || err?.name === 'ConflictError') {
        return {
          success: false,
          error: {
            code: 'SCHEDULING_CONFLICT',
            message: 'The selected staff specialist is already booked during this time interval. Please choose another time or specialist.',
          },
        };
      }
      throw err;
    }
  },
};

// ============================================================================
// 4. Cancel Appointment Tool
// ============================================================================
export const cancelAppointmentSchema = z.object({
  appointmentId: z.string().min(1, 'Appointment ID is required'),
  reason: z.string().max(300).optional(),
});

export type CancelAppointmentInput = z.infer<typeof cancelAppointmentSchema>;

export const cancelAppointmentTool: AITool<CancelAppointmentInput, SafeAppointmentSummary | null> = {
  name: 'cancel_appointment',
  description: 'Cancels an existing appointment, releasing the specialist time slot while maintaining audit records.',
  schema: cancelAppointmentSchema,
  definition: {
    name: 'cancel_appointment',
    description: 'Cancels an existing appointment, releasing the specialist time slot while maintaining audit records.',
    parameters: {
      type: 'object',
      properties: {
        appointmentId: { type: 'string', description: 'The unique ID of the appointment to cancel.' },
        reason: { type: 'string', description: 'Reason for cancellation.' },
      },
      required: ['appointmentId'],
    },
  },
  async execute(input: CancelAppointmentInput, context: AIConversationContext): Promise<AIToolResult<SafeAppointmentSummary | null>> {
    const existing = await prisma.appointment.findFirst({
      where: { id: input.appointmentId, businessId: context.businessId },
    });

    if (!existing) {
      return {
        success: false,
        data: null,
        error: {
          code: 'APPOINTMENT_NOT_FOUND',
          message: `Appointment with ID '${input.appointmentId}' not found in business '${context.businessId}'.`,
        },
      };
    }

    const updated = await prisma.appointment.update({
      where: { id: input.appointmentId },
      data: {
        status: AppointmentStatus.CANCELLED,
        notes: input.reason
          ? `${existing.notes ? existing.notes + ' | ' : ''}Cancelled via AI: ${input.reason}`
          : existing.notes,
      },
    });

    return {
      success: true,
      data: {
        id: updated.id,
        businessId: updated.businessId,
        customerId: updated.customerId,
        staffId: updated.staffId,
        serviceId: updated.serviceId,
        startTime: updated.startTime,
        endTime: updated.endTime,
        status: updated.status,
        notes: updated.notes,
      },
      message: 'Appointment successfully cancelled and time slot released.',
    };
  },
};

// Register appointment tools
toolRegistry.register(checkAvailabilityTool);
toolRegistry.register(getAppointmentsTool);
toolRegistry.register(createAppointmentTool);
toolRegistry.register(cancelAppointmentTool);
