import jwt, { SignOptions } from 'jsonwebtoken';
import { CookieOptions } from 'express';
import { config } from '../config/environment';
import { TokenPayload } from '../types/auth.types';

export const AUTH_COOKIE_NAME = 'auth_token';

export class JwtUtil {
  public static generateToken(payload: TokenPayload): string {
    const options: SignOptions = {
      expiresIn: (config.jwtExpiresIn || '7d') as any,
    };
    return jwt.sign(payload, config.jwtSecret, options);
  }

  public static verifyToken(token: string): TokenPayload {
    return jwt.verify(token, config.jwtSecret) as TokenPayload;
  }

  public static getCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
      path: '/',
    };
  }
}
