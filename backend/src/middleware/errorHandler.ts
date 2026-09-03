import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { ForbiddenError, NotFoundError } from '../services/ownership.service';
import { ConflictError, BadRequestError } from '../services/appointment.service';

// 404 Handler for undefined routes
export const notFoundHandler = (req: Request, res: Response, next: NextFunction): void => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
};

// Global Error Handler
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error('[Application Error]:', err);

  // Custom Ownership & Access Errors
  if (err instanceof ForbiddenError) {
    res.status(403).json({
      success: false,
      message: err.message,
    });
    return;
  }

  if (err instanceof NotFoundError) {
    res.status(404).json({
      success: false,
      message: err.message,
    });
    return;
  }

  if (err instanceof ConflictError) {
    res.status(409).json({
      success: false,
      message: err.message,
    });
    return;
  }

  if (err instanceof BadRequestError) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Handle generic error with statusCode property
  if (err.statusCode && typeof err.statusCode === 'number') {
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  // Prisma Known Request Errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation (e.g. unique phone)
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target) ? err.meta?.target.join(', ') : 'field';
      res.status(409).json({
        success: false,
        message: `A record with this ${target} already exists`,
        errors: [{ field: String(target), message: `Duplicate value violates unique constraint` }],
      });
      return;
    }

    // Record not found for update or delete
    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        message: 'The requested record does not exist or was already removed',
      });
      return;
    }

    // Foreign key constraint failed
    if (err.code === 'P2003') {
      res.status(400).json({
        success: false,
        message: 'Foreign key constraint failed. Related record does not exist.',
      });
      return;
    }
  }

  // Prisma Validation Error
  if (err instanceof Prisma.PrismaClientValidationError) {
    res.status(400).json({
      success: false,
      message: 'Invalid data format provided to database',
    });
    return;
  }

  // Generic fallback error
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
};
