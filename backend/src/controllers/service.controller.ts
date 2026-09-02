import { Request, Response, NextFunction } from 'express';
import { ServiceService } from '../services/service.service';

export class ServiceController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const service = await ServiceService.createService(req.body);
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
      const businessId = req.query.businessId as string | undefined;
      const services = await ServiceService.getAllServices(businessId);
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
      const service = await ServiceService.getServiceById(id);

      if (!service) {
        res.status(404).json({
          success: false,
          message: `Service with ID '${id}' not found`,
        });
        return;
      }

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
      const service = await ServiceService.updateService(id, req.body);
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
      await ServiceService.deleteService(id);
      res.status(200).json({
        success: true,
        message: 'Service deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
