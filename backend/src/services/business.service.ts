import { prisma } from '../lib/prisma';
import { CreateBusinessInput, UpdateBusinessInput } from '../validation/business.validation';

export class BusinessService {
  public static async createBusiness(data: CreateBusinessInput) {
    return prisma.business.create({
      data,
    });
  }

  public static async getAllBusinesses() {
    return prisma.business.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            staff: true,
            services: true,
            appointments: true,
            conversations: true,
          },
        },
      },
    });
  }

  public static async getBusinessById(id: string) {
    return prisma.business.findUnique({
      where: { id },
      include: {
        staff: true,
        services: true,
      },
    });
  }

  public static async updateBusiness(id: string, data: UpdateBusinessInput) {
    return prisma.business.update({
      where: { id },
      data,
    });
  }

  public static async deleteBusiness(id: string) {
    return prisma.business.delete({
      where: { id },
    });
  }
}
