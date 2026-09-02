import { prisma } from '../lib/prisma';
import { PasswordUtil } from '../lib/password';
import { JwtUtil } from '../lib/jwt';
import { RegisterInput, LoginInput } from '../validation/auth.validation';
import { SafeUser } from '../types/auth.types';

export class AuthenticationError extends Error {
  constructor(message: string = 'Invalid email or password') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class DuplicateEmailError extends Error {
  constructor(message: string = 'A user with this email address already exists') {
    super(message);
    this.name = 'DuplicateEmailError';
  }
}

export class UserNotFoundError extends Error {
  constructor(message: string = 'User not found') {
    super(message);
    this.name = 'UserNotFoundError';
  }
}

export class AuthService {
  public static async register(data: RegisterInput): Promise<{ user: SafeUser; token: string }> {
    const existing = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existing) {
      throw new DuplicateEmailError();
    }

    const passwordHash = await PasswordUtil.hash(data.password);

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        passwordHash,
        role: data.role,
      },
    });

    const safeUser: SafeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const token = JwtUtil.generateToken({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    return { user: safeUser, token };
  }

  public static async login(data: LoginInput): Promise<{ user: SafeUser; token: string }> {
    const user = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (!user) {
      // Use generic error message to prevent user enumeration
      throw new AuthenticationError();
    }

    const isMatch = await PasswordUtil.compare(data.password, user.passwordHash);
    if (!isMatch) {
      throw new AuthenticationError();
    }

    const safeUser: SafeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    const token = JwtUtil.generateToken({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    return { user: safeUser, token };
  }

  public static async getProfile(userId: string): Promise<SafeUser> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UserNotFoundError();
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
