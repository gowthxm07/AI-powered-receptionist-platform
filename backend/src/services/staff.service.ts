import { prisma } from '../lib/prisma';
import { CreateStaffInput, UpdateStaffInput } from '../validation/staff.validation';
import { OwnershipService } from './ownership.service';
import { UserRole } from '@prisma/client';

export class StaffService {
  public static async createStaff(
    data: CreateStaffInput,
    userId: string,
    role?: UserRole
  ) {
    // Verify user owns target business
    await OwnershipService.verifyBusinessOwnership(data.businessId, userId, role);

    return prisma.staff.create({
      data,
      include: {
        business: {
          select: { id: true, name: true },
        },
      },
    });
  }

  public static async getAllStaff(
    businessId?: string,
    userId?: string,
    role?: UserRole
  ) {
    if (businessId) {
      if (userId) {
        await OwnershipService.verifyBusinessOwnership(businessId, userId, role);
      }
      return prisma.staff.findMany({
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
      return prisma.staff.findMany({
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
    return prisma.staff.findMany({
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

  public static async getStaffById(
    id: string,
    userId: string,
    role?: UserRole
  ) {
    await OwnershipService.verifyStaffOwnership(id, userId, role);

    return prisma.staff.findUnique({
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

  public static async updateStaff(
    id: string,
    data: UpdateStaffInput,
    userId: string,
    role?: UserRole
  ) {
    await OwnershipService.verifyStaffOwnership(id, userId, role);

    if (data.businessId) {
      await OwnershipService.verifyBusinessOwnership(data.businessId, userId, role);
    }

    return prisma.staff.update({
      where: { id },
      data,
      include: {
        business: {
          select: { id: true, name: true },
        },
      },
    });
  }

  public static async deleteStaff(
    id: string,
    userId: string,
    role?: UserRole
  ) {
    await OwnershipService.verifyStaffOwnership(id, userId, role);

    return prisma.staff.delete({
      where: { id },
    });
  }
}
