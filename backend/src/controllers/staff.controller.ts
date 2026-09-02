import { Request, Response, NextFunction } from 'express';
import { StaffService } from '../services/staff.service';

export class StaffController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const role = req.user!.role;
      const staff = await StaffService.createStaff(req.body, userId, role);
      res.status(201).json({
        success: true,
        message: 'Staff member created successfully',
        data: staff,
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
      const staff = await StaffService.getAllStaff(businessId, userId, role);

      res.status(200).json({
        success: true,
        message: 'Staff retrieved successfully',
        data: staff,
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
      const staff = await StaffService.getStaffById(id, userId, role);

      res.status(200).json({
        success: true,
        message: 'Staff retrieved successfully',
        data: staff,
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
      const staff = await StaffService.updateStaff(id, req.body, userId, role);

      res.status(200).json({
        success: true,
        message: 'Staff member updated successfully',
        data: staff,
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
      await StaffService.deleteStaff(id, userId, role);

      res.status(200).json({
        success: true,
        message: 'Staff member deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
