import { prisma } from '../lib/prisma';
import { CreateBusinessInput, UpdateBusinessInput } from '../validation/business.validation';
import { OwnershipService } from './ownership.service';
import { UserRole } from '@prisma/client';

export class BusinessService {
  public static async createBusiness(data: CreateBusinessInput, ownerId: string) {
    return prisma.business.create({
      data: {
        ...data,
        ownerId,
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });
  }

  public static async getAllBusinesses(userId: string, role?: UserRole) {
    const isRestricted = role !== UserRole.ADMIN;

    return prisma.business.findMany({
      where: isRestricted ? { ownerId: userId } : undefined,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: { id: true, name: true, email: true, role: true },
        },
        _count: {
          select: {
            customers: true,
            staff: true,
            services: true,
            appointments: true,
            conversations: true,
          },
        },
      },
    });
  }

  public static async getBusinessById(id: string, userId: string, role?: UserRole) {
    // Verify ownership before returning details
    await OwnershipService.verifyBusinessOwnership(id, userId, role);

    return prisma.business.findUnique({
      where: { id },
      include: {
        owner: {
          select: { id: true, name: true, email: true, role: true },
        },
        customers: true,
        staff: true,
        services: true,
      },
    });
  }

  public static async updateBusiness(
    id: string,
    data: UpdateBusinessInput,
    userId: string,
    role?: UserRole
  ) {
    // Verify ownership
    await OwnershipService.verifyBusinessOwnership(id, userId, role);

    return prisma.business.update({
      where: { id },
      data,
    });
  }

  public static async deleteBusiness(id: string, userId: string, role?: UserRole) {
    // Verify ownership
    await OwnershipService.verifyBusinessOwnership(id, userId, role);

    return prisma.business.delete({
      where: { id },
    });
  }
}
