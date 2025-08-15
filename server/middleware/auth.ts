import type { Request, Response, NextFunction } from 'express';

// TODO: Replace with your real session/JWT logic
export interface AuthedUser {
  id: string;
  email: string;
  name: string;
  roles: string[]; // 'OWNER'|'ADMIN'|'MANAGER'|'SUPPORT'|'VIEWER'
  two_factor_ok?: boolean;
}

declare global {
  namespace Express {
    interface Request { user?: AuthedUser; }
  }
}

export function attachUser(req: Request, _res: Response, next: NextFunction) {
  // Demo: always an OWNER; replace with your auth (session/JWT)
  req.user = {
    id: 'U-ADMIN-1',
    email: 'owner@example.com',
    name: 'Owner',
    roles: ['OWNER', 'ADMIN']
  };
  next();
}