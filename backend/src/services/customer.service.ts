import { prisma } from '../lib/prisma';
import { CreateCustomerInput, UpdateCustomerInput } from '../validation/customer.validation';

export class CustomerService {
  public static async createCustomer(data: CreateCustomerInput) {
    return prisma.customer.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email && data.email.trim() !== '' ? data.email : null,
      },
    });
  }

  public static async getAllCustomers() {
    return prisma.customer.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: {
            appointments: true,
            conversations: true,
          },
        },
      },
    });
  }

  public static async getCustomerById(id: string) {
    return prisma.customer.findUnique({
      where: { id },
      include: {
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

  public static async updateCustomer(id: string, data: UpdateCustomerInput) {
    return prisma.customer.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && {
          email: data.email && data.email.trim() !== '' ? data.email : null,
        }),
      },
    });
  }

  public static async deleteCustomer(id: string) {
    return prisma.customer.delete({
      where: { id },
    });
  }
}
