import { Request, Response, NextFunction } from 'express';
import { CustomerService } from '../services/customer.service';

export class CustomerController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const customer = await CustomerService.createCustomer(req.body);
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
      const customers = await CustomerService.getAllCustomers();
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
      const customer = await CustomerService.getCustomerById(id);

      if (!customer) {
        res.status(404).json({
          success: false,
          message: `Customer with ID '${id}' not found`,
        });
        return;
      }

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
      const customer = await CustomerService.updateCustomer(id, req.body);
      res.status(200).json({
        success: true,
        message: 'Customer updated successfully',
        data: customer,
      });
    } catch (error)
    {
      next(error);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await CustomerService.deleteCustomer(id);
      res.status(200).json({
        success: true,
        message: 'Customer deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
