import { prisma } from '../lib/prisma';
import { CreateServiceInput, UpdateServiceInput } from '../validation/service.validation';
import { OwnershipService } from './ownership.service';
import { UserRole } from '@prisma/client';

export class ServiceService {
  public static async createService(
    data: CreateServiceInput,
    userId: string,
    role?: UserRole
  ) {
    // Verify user owns target business
    await OwnershipService.verifyBusinessOwnership(data.businessId, userId, role);

    return prisma.service.create({
      data,
      include: {
        business: {
          select: { id: true, name: true },
        },
      },
    });
  }

  public static async getAllServices(
    businessId?: string,
    userId?: string,
    role?: UserRole
  ) {
    if (businessId) {
      if (userId) {
        await OwnershipService.verifyBusinessOwnership(businessId, userId, role);
      }
      return prisma.service.findMany({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
        include: {
          business: {
            select: { id: true, name: true },
          },
          _count: {
            select: { appointments: true },
          },
        },
      });
    }

    // Scoped to businesses owned by user
    if (userId && role !== UserRole.ADMIN) {
      const ownedBusinessIds = await OwnershipService.getOwnedBusinessIds(userId, role);
      return prisma.service.findMany({
        where: { businessId: { in: ownedBusinessIds || [] } },
        orderBy: { createdAt: 'desc' },
        include: {
          business: {
            select: { id: true, name: true },
          },
          _count: {
            select: { appointments: true },
          },
        },
      });
    }

    // Admin fallback
    return prisma.service.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        business: {
          select: { id: true, name: true },
        },
        _count: {
          select: { appointments: true },
        },
      },
    });
  }

  public static async getServiceById(
    id: string,
    userId: string,
    role?: UserRole
  ) {
    await OwnershipService.verifyServiceOwnership(id, userId, role);

    return prisma.service.findUnique({
      where: { id },
      include: {
        business: true,
        appointments: {
          orderBy: { startTime: 'desc' },
          take: 10,
        },
      },
    });
  }

  public static async updateService(
    id: string,
    data: UpdateServiceInput,
    userId: string,
    role?: UserRole
  ) {
    await OwnershipService.verifyServiceOwnership(id, userId, role);

    if (data.businessId) {
      await OwnershipService.verifyBusinessOwnership(data.businessId, userId, role);
    }

    return prisma.service.update({
      where: { id },
      data,
      include: {
        business: {
          select: { id: true, name: true },
        },
      },
    });
  }

  public static async deleteService(
    id: string,
    userId: string,
    role?: UserRole
  ) {
    await OwnershipService.verifyServiceOwnership(id, userId, role);

    return prisma.service.delete({
      where: { id },
    });
  }
}
