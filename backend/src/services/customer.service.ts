import { prisma } from '../lib/prisma';
import { CreateCustomerInput, UpdateCustomerInput } from '../validation/customer.validation';
import { OwnershipService } from './ownership.service';
import { UserRole } from '@prisma/client';

export class CustomerService {
  public static async createCustomer(
    data: CreateCustomerInput,
    userId: string,
    role?: UserRole
  ) {
    let verifiedBusinessId = data.businessId;

    if (verifiedBusinessId) {
      await OwnershipService.verifyBusinessOwnership(verifiedBusinessId, userId, role);
    } else {
      // If businessId wasn't passed explicitly, link to user's first business if available
      const ownedBusinessIds = await OwnershipService.getOwnedBusinessIds(userId, role);
      if (ownedBusinessIds && ownedBusinessIds.length > 0) {
        verifiedBusinessId = ownedBusinessIds[0];
      }
    }

    return prisma.customer.create({
      data: {
        businessId: verifiedBusinessId || null,
        name: data.name,
        phone: data.phone,
        email: data.email && data.email.trim() !== '' ? data.email : null,
      },
      include: {
        business: {
          select: { id: true, name: true },
        },
      },
    });
  }

  public static async getAllCustomers(
    businessId?: string,
    userId?: string,
    role?: UserRole
  ) {
    if (businessId) {
      if (userId) {
        await OwnershipService.verifyBusinessOwnership(businessId, userId, role);
      }
      return prisma.customer.findMany({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
        include: {
          business: { select: { id: true, name: true } },
          _count: {
            select: {
              appointments: true,
              conversations: true,
            },
          },
        },
      });
    }

    // If no businessId passed, return only customers belonging to businesses owned by user
    if (userId && role !== UserRole.ADMIN) {
      const ownedBusinessIds = await OwnershipService.getOwnedBusinessIds(userId, role);
      return prisma.customer.findMany({
        where: { businessId: { in: ownedBusinessIds || [] } },
        orderBy: { createdAt: 'desc' },
        include: {
          business: { select: { id: true, name: true } },
          _count: {
            select: {
              appointments: true,
              conversations: true,
            },
          },
        },
      });
    }

    // Admin fallback
    return prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        business: { select: { id: true, name: true } },
        _count: {
          select: {
            appointments: true,
            conversations: true,
          },
        },
      },
    });
  }

  public static async getCustomerById(
    id: string,
    userId: string,
    role?: UserRole
  ) {
    await OwnershipService.verifyCustomerOwnership(id, userId, role);

    return prisma.customer.findUnique({
      where: { id },
      include: {
        business: true,
        appointments: {
          orderBy: { startTime: 'desc' },
          take: 10,
        },
        conversations: {
          orderBy: { startedAt: 'desc' },
          take: 5,
        },
      },
    });
  }

  public static async updateCustomer(
    id: string,
    data: UpdateCustomerInput,
    userId: string,
    role?: UserRole
  ) {
    await OwnershipService.verifyCustomerOwnership(id, userId, role);

    if (data.businessId) {
      await OwnershipService.verifyBusinessOwnership(data.businessId, userId, role);
    }

    return prisma.customer.update({
      where: { id },
      data: {
        ...(data.businessId !== undefined && { businessId: data.businessId }),
        ...(data.name !== undefined && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && {
          email: data.email && data.email.trim() !== '' ? data.email : null,
        }),
      },
      include: {
        business: { select: { id: true, name: true } },
      },
    });
  }

  public static async deleteCustomer(
    id: string,
    userId: string,
    role?: UserRole
  ) {
    await OwnershipService.verifyCustomerOwnership(id, userId, role);

    return prisma.customer.delete({
      where: { id },
    });
  }
}
