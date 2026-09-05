import { Request, Response, NextFunction } from 'express';
import { BusinessService } from '../services/business.service';

export class BusinessController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const business = await BusinessService.createBusiness(req.body, userId);
      res.status(201).json({
        success: true,
        message: 'Business created successfully',
        data: business,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getPublic(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const businesses = await BusinessService.getPublicBusinesses();
      res.status(200).json({
        success: true,
        message: 'Eligible businesses retrieved successfully',
        data: businesses,
        businesses,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const role = req.user!.role;
      const businesses = await BusinessService.getAllBusinesses(userId, role);
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
      const userId = req.user!.userId;
      const role = req.user!.role;
      const business = await BusinessService.getBusinessById(id, userId, role);

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
      const userId = req.user!.userId;
      const role = req.user!.role;
      const business = await BusinessService.updateBusiness(id, req.body, userId, role);

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
      const userId = req.user!.userId;
      const role = req.user!.role;
      await BusinessService.deleteBusiness(id, userId, role);

      res.status(200).json({
        success: true,
        message: 'Business deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
