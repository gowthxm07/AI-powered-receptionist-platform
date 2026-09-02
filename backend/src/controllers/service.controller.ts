import { Request, Response, NextFunction } from 'express';
import { ServiceService } from '../services/service.service';

export class ServiceController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const role = req.user!.role;
      const service = await ServiceService.createService(req.body, userId, role);
      res.status(201).json({
        success: true,
        message: 'Service created successfully',
        data: service,
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
      const services = await ServiceService.getAllServices(businessId, userId, role);

      res.status(200).json({
        success: true,
        message: 'Services retrieved successfully',
        data: services,
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
      const service = await ServiceService.getServiceById(id, userId, role);

      res.status(200).json({
        success: true,
        message: 'Service retrieved successfully',
        data: service,
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
      const service = await ServiceService.updateService(id, req.body, userId, role);

      res.status(200).json({
        success: true,
        message: 'Service updated successfully',
        data: service,
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
      await ServiceService.deleteService(id, userId, role);

      res.status(200).json({
        success: true,
        message: 'Service deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
