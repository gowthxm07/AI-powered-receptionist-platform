import { Request, Response, NextFunction } from 'express';
import { BusinessService } from '../services/business.service';

export class BusinessController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const business = await BusinessService.createBusiness(req.body);
      res.status(201).json({
        success: true,
        message: 'Business created successfully',
        data: business,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const businesses = await BusinessService.getAllBusinesses();
      res.status(200).json({
        success: true,
        message: 'Businesses retrieved successfully',
        data: businesses,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const business = await BusinessService.getBusinessById(id);

      if (!business) {
        res.status(404).json({
          success: false,
          message: `Business with ID '${id}' not found`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Business retrieved successfully',
        data: business,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const business = await BusinessService.updateBusiness(id, req.body);
      res.status(200).json({
        success: true,
        message: 'Business updated successfully',
        data: business,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      await BusinessService.deleteBusiness(id);
      res.status(200).json({
        success: true,
        message: 'Business deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
