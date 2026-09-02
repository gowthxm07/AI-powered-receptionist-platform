import { Request, Response, NextFunction } from 'express';
import { AuthService, DuplicateEmailError, AuthenticationError, UserNotFoundError } from '../services/auth.service';
import { JwtUtil, AUTH_COOKIE_NAME } from '../lib/jwt';
import { config } from '../config/environment';

export class AuthController {
  public static async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, token } = await AuthService.register(req.body);

      res.cookie(AUTH_COOKIE_NAME, token, JwtUtil.getCookieOptions());

      res.status(201).json({
        success: true,
        message: 'User registered successfully',
        data: user,
      });
    } catch (error) {
      if (error instanceof DuplicateEmailError) {
        res.status(409).json({
          success: false,
          message: error.message,
        });
        return;
      }
      next(error);
    }
  }

  public static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { user, token } = await AuthService.login(req.body);

      res.cookie(AUTH_COOKIE_NAME, token, JwtUtil.getCookieOptions());

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: user,
      });
    } catch (error) {
      if (error instanceof AuthenticationError) {
        res.status(401).json({
          success: false,
          message: error.message,
        });
        return;
      }
      next(error);
    }
  }

  public static async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({
          success: false,
          message: 'Not authenticated',
        });
        return;
      }

      const user = await AuthService.getProfile(req.user.userId);

      res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      if (error instanceof UserNotFoundError) {
        res.status(404).json({
          success: false,
          message: error.message,
        });
        return;
      }
      next(error);
    }
  }

  public static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      res.clearCookie(AUTH_COOKIE_NAME, {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: 'lax',
        path: '/',
      });

      res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error) {
      next(error);
    }
  }
}
