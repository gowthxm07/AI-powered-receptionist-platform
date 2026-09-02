import { prisma } from '../lib/prisma';
import { CreateStaffInput, UpdateStaffInput } from '../validation/staff.validation';

export class StaffService {
  public static async createStaff(data: CreateStaffInput) {
    return prisma.staff.create({
      data,
      include: {
        business: {
          select: { id: true, name: true },
        },
      },
    });
  }

  public static async getAllStaff(businessId?: string) {
    return prisma.staff.findMany({
      where: businessId ? { businessId } : undefined,
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

  public static async getStaffById(id: string) {
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

  public static async updateStaff(id: string, data: UpdateStaffInput) {
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

  public static async deleteStaff(id: string) {
    return prisma.staff.delete({
      where: { id },
    });
  }
}
