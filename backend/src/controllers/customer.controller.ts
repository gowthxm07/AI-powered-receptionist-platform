import { Request, Response, NextFunction } from 'express';
import { CustomerService } from '../services/customer.service';

export class CustomerController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const role = req.user!.role;
      const customer = await CustomerService.createCustomer(req.body, userId, role);
      res.status(201).json({
        success: true,
        message: 'Customer created successfully',
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const businessId = typeof req.query.businessId === 'string' ? req.query.businessId : undefined;
      const userId = req.user!.userId;
      const role = req.user!.role;
      const customers = await CustomerService.getAllCustomers(businessId, userId, role);

      res.status(200).json({
        success: true,
        message: 'Customers retrieved successfully',
        data: customers,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const role = req.user!.role;
      const customer = await CustomerService.getCustomerById(id, userId, role);

      res.status(200).json({
        success: true,
        message: 'Customer retrieved successfully',
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const role = req.user!.role;
      const customer = await CustomerService.updateCustomer(id, req.body, userId, role);

      res.status(200).json({
        success: true,
        message: 'Customer updated successfully',
        data: customer,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const role = req.user!.role;
      await CustomerService.deleteCustomer(id, userId, role);

      res.status(200).json({
        success: true,
        message: 'Customer deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
