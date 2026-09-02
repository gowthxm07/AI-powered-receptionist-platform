import { prisma } from '../lib/prisma';
import { UserRole, Business, Staff, Service, Customer } from '@prisma/client';

export class ForbiddenError extends Error {
  public statusCode: number = 403;
  constructor(message: string = 'Forbidden: You do not have permission to access or modify this resource') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class NotFoundError extends Error {
  public statusCode: number = 404;
  constructor(message: string = 'Resource not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class OwnershipService {
  /**
   * Verifies that the given user owns the specified business (or is an ADMIN).
   */
  public static async verifyBusinessOwnership(
    businessId: string,
    userId: string,
    role?: UserRole
  ): Promise<Business> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      throw new NotFoundError(`Business with ID '${businessId}' not found`);
    }

    if (role === UserRole.ADMIN) {
      return business;
    }

    if (business.ownerId !== userId) {
      throw new ForbiddenError('Forbidden: You do not have permission to access or manage this business');
    }

    return business;
  }

  /**
   * Returns array of business IDs owned by the user. Returns null if user is ADMIN (unrestricted).
   */
  public static async getOwnedBusinessIds(
    userId: string,
    role?: UserRole
  ): Promise<string[] | null> {
    if (role === UserRole.ADMIN) {
      return null;
    }

    const businesses = await prisma.business.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });

    return businesses.map((b) => b.id);
  }

  /**
   * Verifies that the given user owns the business associated with the staff member.
   */
  public static async verifyStaffOwnership(
    staffId: string,
    userId: string,
    role?: UserRole
  ): Promise<Staff & { business: Business }> {
    const staff = await prisma.staff.findUnique({
      where: { id: staffId },
      include: { business: true },
    });

    if (!staff) {
      throw new NotFoundError(`Staff member with ID '${staffId}' not found`);
    }

    if (role === UserRole.ADMIN) {
      return staff;
    }

    if (staff.business.ownerId !== userId) {
      throw new ForbiddenError('Forbidden: You do not have permission to access or modify this staff member');
    }

    return staff;
  }

  /**
   * Verifies that the given user owns the business associated with the service offering.
   */
  public static async verifyServiceOwnership(
    serviceId: string,
    userId: string,
    role?: UserRole
  ): Promise<Service & { business: Business }> {
    const service = await prisma.service.findUnique({
      where: { id: serviceId },
      include: { business: true },
    });

    if (!service) {
      throw new NotFoundError(`Service with ID '${serviceId}' not found`);
    }

    if (role === UserRole.ADMIN) {
      return service;
    }

    if (service.business.ownerId !== userId) {
      throw new ForbiddenError('Forbidden: You do not have permission to access or modify this service');
    }

    return service;
  }

  /**
   * Verifies that the given user owns the business associated with the customer.
   */
  public static async verifyCustomerOwnership(
    customerId: string,
    userId: string,
    role?: UserRole
  ): Promise<Customer & { business?: Business | null }> {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        business: true,
        appointments: { select: { businessId: true } },
      },
    });

    if (!customer) {
      throw new NotFoundError(`Customer with ID '${customerId}' not found`);
    }

    if (role === UserRole.ADMIN) {
      return customer;
    }

    // Direct business link check
    if (customer.businessId && customer.business) {
      if (customer.business.ownerId !== userId) {
        throw new ForbiddenError('Forbidden: You do not have permission to access or modify this customer');
      }
      return customer;
    }

    // Fallback: Check if user owns any business linked via appointments
    const ownedBusinessIds = await this.getOwnedBusinessIds(userId, role);
    const hasLinkedAppointment =
      ownedBusinessIds !== null &&
      customer.appointments.some((apt) => ownedBusinessIds.includes(apt.businessId));

    if (!hasLinkedAppointment) {
      throw new ForbiddenError('Forbidden: You do not have permission to access or modify this customer');
    }

    return customer;
  }
}
