import { prisma } from '../lib/prisma';
import { Appointment, AppointmentStatus, UserRole } from '@prisma/client';
import { OwnershipService, ForbiddenError, NotFoundError } from './ownership.service';
import {
  CreateAppointmentInput,
  UpdateAppointmentInput,
  AppointmentQueryInput,
  AvailabilityCheckInput,
} from '../validation/appointment.validation';

export class ConflictError extends Error {
  public statusCode: number = 409;
  constructor(message: string = 'Scheduling conflict: The requested time interval is not available') {
    super(message);
    this.name = 'ConflictError';
  }
}

export class BadRequestError extends Error {
  public statusCode: number = 400;
  constructor(message: string = 'Bad request') {
    super(message);
    this.name = 'BadRequestError';
  }
}

export class AppointmentService {
  /**
   * Checks if a staff member is available for a requested time range.
   * Excludes CANCELLED appointments.
   * Back-to-back appointments (e.g. 10:00-11:00 and 11:00-12:00) do NOT conflict.
   */
  public static async checkAvailability(
    input: AvailabilityCheckInput,
    userId?: string,
    role?: UserRole
  ): Promise<{ available: boolean; reason?: string }> {
    // 1. Verify business ownership if userId is provided
    if (userId) {
      await OwnershipService.verifyBusinessOwnership(input.businessId, userId, role);
    }

    // 2. Verify staff belongs to the business
    const staff = await prisma.staff.findFirst({
      where: {
        id: input.staffId,
        businessId: input.businessId,
      },
    });

    if (!staff) {
      throw new NotFoundError(
        `Staff member with ID '${input.staffId}' does not belong to business '${input.businessId}'`
      );
    }

    const start = new Date(input.startTime);
    let end: Date;

    if (input.endTime) {
      end = new Date(input.endTime);
    } else if (input.durationMinutes) {
      end = new Date(start.getTime() + input.durationMinutes * 60000);
    } else {
      throw new BadRequestError('Either endTime or durationMinutes must be provided');
    }

    if (end <= start) {
      throw new BadRequestError('End time must be after start time');
    }

    // 3. Query overlapping appointments for the staff member
    // Overlap condition: existing.startTime < new.endTime AND existing.endTime > new.startTime
    const overlappingAppointment = await prisma.appointment.findFirst({
      where: {
        staffId: input.staffId,
        status: { not: AppointmentStatus.CANCELLED },
        startTime: { lt: end },
        endTime: { gt: start },
        ...(input.excludeAppointmentId ? { id: { not: input.excludeAppointmentId } } : {}),
      },
      select: { id: true },
    });

    if (overlappingAppointment) {
      return {
        available: false,
        reason: 'The selected staff member is already booked during this time interval.',
      };
    }

    return { available: true };
  }

  /**
   * Creates an appointment with full cross-business resource validation,
   * dynamic duration calculation, and staff conflict detection.
   */
  public static async createAppointment(
    userId: string,
    data: CreateAppointmentInput,
    role?: UserRole
  ): Promise<Appointment> {
    // 1. Verify business ownership
    await OwnershipService.verifyBusinessOwnership(data.businessId, userId, role);

    // 2. Verify customer belongs to the business
    const customer = await prisma.customer.findFirst({
      where: {
        id: data.customerId,
        businessId: data.businessId,
      },
    });

    if (!customer) {
      throw new BadRequestError(
        `Customer with ID '${data.customerId}' does not belong to business '${data.businessId}'`
      );
    }

    // 3. Verify service belongs to the business
    const service = await prisma.service.findFirst({
      where: {
        id: data.serviceId,
        businessId: data.businessId,
      },
    });

    if (!service) {
      throw new BadRequestError(
        `Service with ID '${data.serviceId}' does not belong to business '${data.businessId}'`
      );
    }

    // 4. Verify staff belongs to the business if staffId is provided
    if (data.staffId) {
      const staff = await prisma.staff.findFirst({
        where: {
          id: data.staffId,
          businessId: data.businessId,
        },
      });

      if (!staff) {
        throw new BadRequestError(
          `Staff member with ID '${data.staffId}' does not belong to business '${data.businessId}'`
        );
      }
    }

    // 5. Calculate start & end times
    const startTime = new Date(data.startTime);
    const endTime = data.endTime
      ? new Date(data.endTime)
      : new Date(startTime.getTime() + service.durationMinutes * 60000);

    if (endTime <= startTime) {
      throw new BadRequestError('Appointment end time must be after start time');
    }

    // 6. Transactional conflict check & creation
    return await prisma.$transaction(async (tx) => {
      if (data.staffId) {
        const conflict = await tx.appointment.findFirst({
          where: {
            staffId: data.staffId,
            status: { not: AppointmentStatus.CANCELLED },
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
          select: { id: true },
        });

        if (conflict) {
          throw new ConflictError(
            'The selected staff member has a scheduling conflict during this time interval.'
          );
        }
      }

      return tx.appointment.create({
        data: {
          businessId: data.businessId,
          customerId: data.customerId,
          staffId: data.staffId || null,
          serviceId: data.serviceId,
          startTime,
          endTime,
          status: data.status || AppointmentStatus.SCHEDULED,
          notes: data.notes || null,
        },
        include: {
          customer: true,
          staff: true,
          service: true,
          business: {
            select: { id: true, name: true, phone: true },
          },
        },
      });
    });
  }

  /**
   * Retrieves appointments scoped to the user's business with optional filters.
   */
  public static async getAppointments(
    userId: string,
    filters: AppointmentQueryInput,
    role?: UserRole
  ): Promise<Appointment[]> {
    let businessIds: string[] | undefined;

    if (filters.businessId) {
      await OwnershipService.verifyBusinessOwnership(filters.businessId, userId, role);
      businessIds = [filters.businessId];
    } else {
      const owned = await OwnershipService.getOwnedBusinessIds(userId, role);
      if (owned !== null) {
        businessIds = owned;
      }
    }

    const where: any = {};

    if (businessIds) {
      where.businessId = { in: businessIds };
    }

    if (filters.staffId) {
      where.staffId = filters.staffId;
    }

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      where.startTime = {};
      if (filters.startDate) {
        where.startTime.gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        where.startTime.lte = new Date(filters.endDate);
      }
    }

    return prisma.appointment.findMany({
      where,
      include: {
        customer: true,
        staff: true,
        service: true,
        business: {
          select: { id: true, name: true },
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  /**
   * Retrieves a single appointment by ID with full relation details.
   */
  public static async getAppointmentById(
    userId: string,
    appointmentId: string,
    role?: UserRole
  ): Promise<Appointment> {
    await OwnershipService.verifyAppointmentOwnership(appointmentId, userId, role);

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        business: true,
        customer: true,
        staff: true,
        service: true,
      },
    });

    if (!appointment) {
      throw new NotFoundError(`Appointment with ID '${appointmentId}' not found`);
    }

    return appointment;
  }

  /**
   * Updates or reschedules an appointment.
   * Validates cross-business resource boundaries and performs conflict detection excluding self.
   */
  public static async updateAppointment(
    userId: string,
    appointmentId: string,
    data: UpdateAppointmentInput,
    role?: UserRole
  ): Promise<Appointment> {
    const existing = await OwnershipService.verifyAppointmentOwnership(appointmentId, userId, role);
    const businessId = data.businessId || existing.businessId;

    // Cross-business validation if entities changed
    if (data.customerId && data.customerId !== existing.customerId) {
      const customer = await prisma.customer.findFirst({
        where: { id: data.customerId, businessId },
      });
      if (!customer) {
        throw new BadRequestError(`Customer '${data.customerId}' does not belong to business '${businessId}'`);
      }
    }

    if (data.serviceId && data.serviceId !== existing.serviceId) {
      const service = await prisma.service.findFirst({
        where: { id: data.serviceId, businessId },
      });
      if (!service) {
        throw new BadRequestError(`Service '${data.serviceId}' does not belong to business '${businessId}'`);
      }
    }

    const targetStaffId = data.staffId !== undefined ? data.staffId : existing.staffId;
    if (targetStaffId && targetStaffId !== existing.staffId) {
      const staff = await prisma.staff.findFirst({
        where: { id: targetStaffId, businessId },
      });
      if (!staff) {
        throw new BadRequestError(`Staff member '${targetStaffId}' does not belong to business '${businessId}'`);
      }
    }

    // Time calculations
    const startTime = data.startTime ? new Date(data.startTime) : existing.startTime;
    let endTime: Date;

    if (data.endTime) {
      endTime = new Date(data.endTime);
    } else if (data.startTime && !data.endTime) {
      // Calculate duration from service
      const serviceId = data.serviceId || existing.serviceId;
      const service = await prisma.service.findUnique({ where: { id: serviceId } });
      const duration = service?.durationMinutes || 30;
      endTime = new Date(startTime.getTime() + duration * 60000);
    } else {
      endTime = existing.endTime;
    }

    if (endTime <= startTime) {
      throw new BadRequestError('Appointment end time must be after start time');
    }

    // Transactional conflict check & update
    return await prisma.$transaction(async (tx) => {
      if (targetStaffId && (data.status !== AppointmentStatus.CANCELLED)) {
        const conflict = await tx.appointment.findFirst({
          where: {
            id: { not: appointmentId },
            staffId: targetStaffId,
            status: { not: AppointmentStatus.CANCELLED },
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
          select: { id: true },
        });

        if (conflict) {
          throw new ConflictError(
            'The selected staff member has a scheduling conflict during this time interval.'
          );
        }
      }

      return tx.appointment.update({
        where: { id: appointmentId },
        data: {
          customerId: data.customerId,
          staffId: data.staffId,
          serviceId: data.serviceId,
          startTime,
          endTime,
          status: data.status,
          notes: data.notes,
        },
        include: {
          customer: true,
          staff: true,
          service: true,
          business: {
            select: { id: true, name: true },
          },
        },
      });
    });
  }

  /**
   * Cancels an appointment (soft state change to CANCELLED).
   */
  public static async cancelAppointment(
    userId: string,
    appointmentId: string,
    role?: UserRole
  ): Promise<Appointment> {
    await OwnershipService.verifyAppointmentOwnership(appointmentId, userId, role);

    return prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.CANCELLED },
      include: {
        customer: true,
        staff: true,
        service: true,
      },
    });
  }
}
