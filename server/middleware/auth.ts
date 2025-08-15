import type { Request, Response, NextFunction } from 'express';
import { validateToken } from '../simpleAuth';
import { storage } from '../storage';

// Extend existing user interface for enterprise admin
export interface AdminUser {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  isAdmin?: boolean;
  isEmployee?: boolean;
  customerLevel?: number;
  enterpriseRoles?: string[]; // 'OWNER'|'ADMIN'|'MANAGER'|'SUPPORT'|'VIEWER'
  two_factor_ok?: boolean;
}

export async function attachUser(req: Request, res: Response, next: NextFunction) {
  // Use existing auth system to get user
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(); // No token, continue without user
  }

  const token = authHeader.slice(7);
  try {
    const userId = validateToken(token);
    if (userId) {
      const user = await storage.getUser(userId);
      if (user) {
        // Map existing user to admin interface with enterprise roles
        req.user = {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isAdmin: user.isAdmin,
          isEmployee: user.isEmployee,
          customerLevel: user.customerLevel,
          enterpriseRoles: user.isAdmin ? ['OWNER', 'ADMIN'] : user.isEmployee ? ['MANAGER'] : ['VIEWER']
        };
      }
    }
  } catch (error) {
    // Invalid token, continue without user
  }
  next();
}