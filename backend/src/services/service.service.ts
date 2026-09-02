import { prisma } from '../lib/prisma';
import { CreateServiceInput, UpdateServiceInput } from '../validation/service.validation';

export class ServiceService {
  public static async createService(data: CreateServiceInput) {
    return prisma.service.create({
      data,
      include: {
        business: {
          select: { id: true, name: true },
        },
      },
    });
  }

  public static async getAllServices(businessId?: string) {
    return prisma.service.findMany({
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

  public static async getServiceById(id: string) {
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

  public static async updateService(id: string, data: UpdateServiceInput) {
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

  public static async deleteService(id: string) {
    return prisma.service.delete({
      where: { id },
    });
  }
}
