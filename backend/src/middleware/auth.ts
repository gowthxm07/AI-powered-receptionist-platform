import { Request, Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { JwtUtil, AUTH_COOKIE_NAME } from '../lib/jwt';

export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    let token = req.cookies?.[AUTH_COOKIE_NAME];

    // Fallback: Authorization Bearer header
    if (!token && req.headers.authorization?.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Authentication token required. Please log in.',
      });
      return;
    }

    const payload = JwtUtil.verifyToken(token);
    req.user = payload;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token. Please log in again.',
    });
  }
};

export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Authentication required before authorization check',
      });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: 'Forbidden: You do not have permission to access this resource',
      });
      return;
    }

    next();
  };
};
