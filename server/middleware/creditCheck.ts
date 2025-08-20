import { Request, Response, NextFunction } from 'express';
import { customerExposureCents } from '../services/arService';
import { users } from '../../shared/schema';
import { db } from '../db';
import { eq } from 'drizzle-orm';

interface AuthenticatedRequest extends Request {
  user?: any;
}

export interface CreditCheckResult {
  approved: boolean;
  reason?: string;
  exposure?: number;
  creditLimit?: number;
  overrideRequired?: boolean;
}

export async function checkCreditLimit(customerId: string, orderAmountCents: number): Promise<CreditCheckResult> {
  try {
    // Get customer credit settings
    const [customer] = await db.select({
      creditTerm: users.creditTerm,
      creditLimitCents: users.creditLimitCents,
      onCreditHold: users.onCreditHold,
    }).from(users).where(eq(users.id, customerId));

    if (!customer) {
      return { approved: false, reason: 'Customer not found' };
    }

    // Check if customer is on credit hold
    if (customer.onCreditHold) {
      return { 
        approved: false, 
        reason: 'Customer is on credit hold',
        overrideRequired: true 
      };
    }

    // For prepaid customers, no credit check needed
    if (customer.creditTerm === 'Prepaid') {
      return { approved: true };
    }

    // Get current exposure (open invoice balances)
    const currentExposure = await customerExposureCents(customerId);
    const projectedExposure = currentExposure + orderAmountCents;
    
    // Check if projected exposure exceeds credit limit
    if (projectedExposure > customer.creditLimitCents) {
      return {
        approved: false,
        reason: `Order would exceed credit limit`,
        exposure: projectedExposure,
        creditLimit: customer.creditLimitCents,
        overrideRequired: true
      };
    }

    return { 
      approved: true,
      exposure: projectedExposure,
      creditLimit: customer.creditLimitCents
    };

  } catch (error) {
    console.error('Error checking credit limit:', error);
    return { 
      approved: false, 
      reason: 'Error checking credit limit' 
    };
  }
}

export function creditCheckMiddleware() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      // Skip credit check for admin users
      if (req.user?.isAdmin) {
        return next();
      }

      // Only apply to order-related endpoints
      if (!req.path.includes('/orders') || req.method !== 'POST') {
        return next();
      }

      const { totalCents, customerId } = req.body;
      const actualCustomerId = customerId || req.user?.id;

      if (!actualCustomerId) {
        return res.status(400).json({ 
          error: 'Customer ID is required' 
        });
      }

      if (!totalCents || totalCents <= 0) {
        return next(); // Let the order validation handle invalid amounts
      }

      const creditCheck = await checkCreditLimit(actualCustomerId, totalCents);

      if (!creditCheck.approved) {
        return res.status(400).json({
          error: 'Credit check failed',
          reason: creditCheck.reason,
          creditInfo: {
            currentExposure: creditCheck.exposure,
            creditLimit: creditCheck.creditLimit,
            overrideRequired: creditCheck.overrideRequired
          }
        });
      }

      // Attach credit info to request for logging
      req.creditCheck = creditCheck;
      next();

    } catch (error) {
      console.error('Credit check middleware error:', error);
      res.status(500).json({ 
        error: 'Internal server error during credit check' 
      });
    }
  };
}

// Manager override middleware for credit limit exceptions
export function creditOverrideMiddleware() {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { managerOverride } = req.body;

      // Skip if no override requested
      if (!managerOverride) {
        return next();
      }

      // Only admins can approve credit overrides
      if (!req.user?.isAdmin) {
        return res.status(403).json({
          error: 'Only administrators can approve credit limit overrides'
        });
      }

      console.log(`🔐 Credit limit override approved by admin: ${req.user.username} (${req.user.id})`);
      
      // Log the override for audit purposes
      req.overrideApproval = {
        approvedBy: req.user.id,
        approvedAt: new Date(),
        reason: managerOverride.reason || 'Credit limit override'
      };

      next();

    } catch (error) {
      console.error('Credit override middleware error:', error);
      res.status(500).json({ 
        error: 'Internal server error during credit override' 
      });
    }
  };
}

// Declare additional properties on Request for TypeScript
declare global {
  namespace Express {
    interface Request {
      creditCheck?: CreditCheckResult;
      overrideApproval?: {
        approvedBy: string;
        approvedAt: Date;
        reason: string;
      };
    }
  }
}