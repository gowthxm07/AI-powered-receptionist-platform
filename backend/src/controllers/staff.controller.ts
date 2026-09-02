import { Request, Response, NextFunction } from 'express';
import { StaffService } from '../services/staff.service';

export class StaffController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const staff = await StaffService.createStaff(req.body);
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
      const businessId = req.query.businessId as string | undefined;
      const staffList = await StaffService.getAllStaff(businessId);
      res.status(200).json({
        success: true,
        message: 'Staff list retrieved successfully',
        data: staffList,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const staff = await StaffService.getStaffById(id);

      if (!staff) {
        res.status(404).json({
          success: false,
          message: `Staff member with ID '${id}' not found`,
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Staff member retrieved successfully',
        data: staff,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const staff = await StaffService.updateStaff(id, req.body);
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
      await StaffService.deleteStaff(id);
      res.status(200).json({
        success: true,
        message: 'Staff member deleted successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
