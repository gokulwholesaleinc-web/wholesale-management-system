import type { Request, Response, NextFunction } from 'express';
import { userHas, type Permission } from '../services/rbac';

export function requireAdmin(perm: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: 'unauthenticated' });
    if (!userHas(req.user.roles, perm)) return res.status(403).json({ error: 'forbidden' });

    // Optional 2FA gate for dangerous writes
    if (process.env.ADMIN_REQUIRE_2FA === 'true' && /\.(write|impersonate)$/.test(perm) && !req.user.two_factor_ok) {
      return res.status(428).json({ error: 'two_factor_required' });
    }
    next();
  };
}