import { Request, Response, NextFunction } from 'express';

// Security validation middleware
export const validateInput = (req: Request, res: Response, next: NextFunction) => {
  // Validate all numeric IDs
  const params = req.params;
  for (const [key, value] of Object.entries(params)) {
    if (key.endsWith('Id') || key.endsWith('ID')) {
      const numValue = parseInt(value as string);
      if (!Number.isInteger(numValue) || numValue <= 0) {
        return res.status(400).json({ 
          message: `Invalid ${key} parameter`,
          error: 'INVALID_ID_FORMAT'
        });
      }
    }
  }
  next();
};

// Rate limiting for sensitive endpoints
const rateLimitMap = new Map();

export const rateLimit = (limit: number = 100, windowMs: number = 60000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    
    if (!rateLimitMap.has(key)) {
      rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    const userData = rateLimitMap.get(key);
    if (now > userData.resetTime) {
      userData.count = 1;
      userData.resetTime = now + windowMs;
      return next();
    }
    
    if (userData.count >= limit) {
      return res.status(429).json({ 
        message: 'Too many requests',
        retryAfter: Math.ceil((userData.resetTime - now) / 1000)
      });
    }
    
    userData.count++;
    next();
  };
};

// XSS protection
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  next();
};

function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return obj.replace(/<[^>]*>/g, ''); // Remove HTML tags
  }
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  if (typeof obj === 'object' && obj !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }
  return obj;
}
