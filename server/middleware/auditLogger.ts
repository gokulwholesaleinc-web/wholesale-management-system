/**
 * Audit Logging Middleware
 * Logs admin actions with userId, IP, and resource identifiers
 */

import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

interface AuditLog {
  userId: string;
  username: string;
  action: string;
  resource: string;
  resourceId?: string;
  ipAddress: string;
  userAgent: string;
  requestBody?: any;
  responseStatus?: number;
  timestamp: Date;
  details?: Record<string, any>;
}

class AuditLogger {
  private logs: AuditLog[] = [];
  private maxLogs = 10000; // Keep last 10k logs in memory

  async log(entry: AuditLog): Promise<void> {
    // Add to in-memory store
    this.logs.unshift(entry);
    
    // Trim if exceeding max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }

    // Store in database if available
    try {
      await storage.logActivity(
        entry.userId,
        entry.username,
        `${entry.action} ${entry.resource}`,
        {
          resource: entry.resource,
          resourceId: entry.resourceId,
          ipAddress: entry.ipAddress,
          userAgent: entry.userAgent,
          requestBody: entry.requestBody,
          responseStatus: entry.responseStatus,
          ...entry.details
        }
      );
    } catch (error) {
      console.error('Failed to log audit entry to database:', error);
    }

    // Log to console for immediate visibility
    console.log(`[AUDIT] ${entry.timestamp.toISOString()} - ${entry.username} (${entry.userId}) performed ${entry.action} on ${entry.resource} from ${entry.ipAddress}`);
  }

  getRecentLogs(limit = 100): AuditLog[] {
    return this.logs.slice(0, limit);
  }

  getLogsByUser(userId: string, limit = 50): AuditLog[] {
    return this.logs.filter(log => log.userId === userId).slice(0, limit);
  }

  getLogsByResource(resource: string, resourceId?: string, limit = 50): AuditLog[] {
    return this.logs
      .filter(log => 
        log.resource === resource && 
        (!resourceId || log.resourceId === resourceId)
      )
      .slice(0, limit);
  }
}

const auditLogger = new AuditLogger();

/**
 * Middleware to audit admin actions
 */
export function auditAdminAction(action: string, resource: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const originalSend = res.send;
    let responseBody: any;
    let responseStatus = res.statusCode;

    // Capture response
    res.send = function(body: any) {
      responseBody = body;
      responseStatus = res.statusCode;
      return originalSend.call(this, body);
    };

    // Continue to next middleware
    next();

    // Log after response (in the background)
    setImmediate(async () => {
      try {
        const user = (req as any).user;
        if (!user) return; // Skip if no authenticated user

        const resourceId = req.params.id || 
                          req.params.userId || 
                          req.params.productId ||
                          req.body?.id?.toString();

        const auditEntry: AuditLog = {
          userId: user.id || user.sub,
          username: user.username || user.firstName || 'Unknown',
          action,
          resource,
          resourceId,
          ipAddress: req.ip || req.connection?.remoteAddress || 'unknown',
          userAgent: req.get('User-Agent') || 'unknown',
          requestBody: req.method !== 'GET' ? req.body : undefined,
          responseStatus,
          timestamp: new Date(),
          details: {
            method: req.method,
            url: req.originalUrl,
            query: Object.keys(req.query).length > 0 ? req.query : undefined
          }
        };

        await auditLogger.log(auditEntry);
      } catch (error) {
        console.error('Audit logging failed:', error);
      }
    });
  };
}

/**
 * Get audit logs (for admin endpoints)
 */
export function getAuditLogs(filters?: {
  userId?: string;
  resource?: string;
  resourceId?: string;
  limit?: number;
}): AuditLog[] {
  if (filters?.userId) {
    return auditLogger.getLogsByUser(filters.userId, filters.limit);
  }
  
  if (filters?.resource) {
    return auditLogger.getLogsByResource(
      filters.resource, 
      filters.resourceId, 
      filters.limit
    );
  }

  return auditLogger.getRecentLogs(filters?.limit);
}

/**
 * Predefined audit actions for common operations
 */
export const auditActions = {
  // User management
  createUser: auditAdminAction('CREATE', 'user'),
  updateUser: auditAdminAction('UPDATE', 'user'),  
  deleteUser: auditAdminAction('DELETE', 'user'),
  
  // Product management
  createProduct: auditAdminAction('CREATE', 'product'),
  updateProduct: auditAdminAction('UPDATE', 'product'),
  deleteProduct: auditAdminAction('DELETE', 'product'),
  
  // Order management
  updateOrder: auditAdminAction('UPDATE', 'order'),
  cancelOrder: auditAdminAction('CANCEL', 'order'),
  
  // System operations
  clearCart: auditAdminAction('CLEAR', 'cart'),
  createBackup: auditAdminAction('CREATE', 'backup'),
  restoreBackup: auditAdminAction('RESTORE', 'backup'),
  
  // Bulk operations
  bulkUpdate: auditAdminAction('BULK_UPDATE', 'multiple'),
  bulkDelete: auditAdminAction('BULK_DELETE', 'multiple')
};