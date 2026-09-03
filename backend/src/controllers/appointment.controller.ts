import { Request, Response, NextFunction } from 'express';
import { AppointmentService } from '../services/appointment.service';

export class AppointmentController {
  public static async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const role = req.user!.role;
      const appointment = await AppointmentService.createAppointment(userId, req.body, role);

      res.status(201).json({
        success: true,
        message: 'Appointment scheduled successfully',
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user!.userId;
      const role = req.user!.role;
      const appointments = await AppointmentService.getAppointments(userId, req.query as any, role);

      res.status(200).json({
        success: true,
        message: 'Appointments retrieved successfully',
        data: appointments,
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
      const appointment = await AppointmentService.getAppointmentById(userId, id, role);

      res.status(200).json({
        success: true,
        message: 'Appointment retrieved successfully',
        data: appointment,
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
      const appointment = await AppointmentService.updateAppointment(userId, id, req.body, role);

      res.status(200).json({
        success: true,
        message: 'Appointment updated successfully',
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async cancel(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user!.userId;
      const role = req.user!.role;
      const appointment = await AppointmentService.cancelAppointment(userId, id, role);

      res.status(200).json({
        success: true,
        message: 'Appointment cancelled successfully',
        data: appointment,
      });
    } catch (error) {
      next(error);
    }
  }

  public static async checkAvailability(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.userId;
      const role = req.user?.role;
      const result = await AppointmentService.checkAvailability(req.query as any, userId, role);

      res.status(200).json({
        success: true,
        message: result.available ? 'Time slot is available' : 'Time slot is unavailable',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
