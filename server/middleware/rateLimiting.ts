/**
 * Rate Limiting Middleware
 * Protects critical endpoints with IP + user keyed limits
 */

interface RateLimit {
  count: number;
  resetTime: number;
  lastRequest: number;
}

class RateLimiter {
  private store = new Map<string, RateLimit>();
  private cleanupInterval: NodeJS.Timeout;

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, limit] of this.store.entries()) {
      if (now > limit.resetTime) {
        this.store.delete(key);
      }
    }
  }

  private getKey(ip: string, userId?: string, endpoint?: string): string {
    return `${ip}:${userId || 'anonymous'}:${endpoint || 'general'}`;
  }

  isAllowed(
    ip: string, 
    maxRequests: number, 
    windowMs: number,
    userId?: string,
    endpoint?: string
  ): { allowed: boolean; resetTime: number; remaining: number } {
    const key = this.getKey(ip, userId, endpoint);
    const now = Date.now();
    const limit = this.store.get(key);

    if (!limit || now > limit.resetTime) {
      // First request or window expired
      this.store.set(key, {
        count: 1,
        resetTime: now + windowMs,
        lastRequest: now
      });
      
      return {
        allowed: true,
        resetTime: now + windowMs,
        remaining: maxRequests - 1
      };
    }

    if (limit.count >= maxRequests) {
      return {
        allowed: false,
        resetTime: limit.resetTime,
        remaining: 0
      };
    }

    // Increment count
    limit.count++;
    limit.lastRequest = now;
    
    return {
      allowed: true,
      resetTime: limit.resetTime,
      remaining: maxRequests - limit.count
    };
  }

  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}

const rateLimiter = new RateLimiter();

/**
 * Rate limiting middleware factory
 */
export function createRateLimit(
  maxRequests: number,
  windowMs: number,
  endpoint?: string
) {
  return (req: any, res: any, next: any) => {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    const userId = req.user?.id;

    const result = rateLimiter.isAllowed(
      ip, 
      maxRequests, 
      windowMs, 
      userId, 
      endpoint
    );

    // Set rate limit headers
    res.set({
      'X-RateLimit-Limit': maxRequests.toString(),
      'X-RateLimit-Remaining': result.remaining.toString(),
      'X-RateLimit-Reset': Math.ceil(result.resetTime / 1000).toString()
    });

    if (!result.allowed) {
      return res.status(429).json({
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests, please try again later',
        details: [{
          field: 'rate_limit',
          message: `Maximum ${maxRequests} requests per ${Math.ceil(windowMs / 60000)} minutes exceeded`,
          resetTime: result.resetTime
        }]
      });
    }

    next();
  };
}

/**
 * Predefined rate limiters for common use cases
 */
export const rateLimits = {
  // Login attempts - strict
  login: createRateLimit(5, 15 * 60 * 1000, 'login'), // 5 attempts per 15 minutes
  
  // POS login - moderate  
  posLogin: createRateLimit(10, 10 * 60 * 1000, 'pos-login'), // 10 attempts per 10 minutes
  
  // OTP generation - strict
  otpGeneration: createRateLimit(3, 5 * 60 * 1000, 'otp'), // 3 OTPs per 5 minutes
  
  // General API - lenient
  general: createRateLimit(100, 60 * 1000, 'general'), // 100 requests per minute
  
  // Admin operations - moderate
  admin: createRateLimit(30, 60 * 1000, 'admin'), // 30 requests per minute
  
  // Cart operations - lenient
  cart: createRateLimit(50, 60 * 1000, 'cart') // 50 operations per minute
};