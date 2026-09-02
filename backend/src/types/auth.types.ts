import { UserRole } from '@prisma/client';

export interface TokenPayload {
  userId: string;
  role: UserRole;
  email: string;
}

export interface SafeUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}
