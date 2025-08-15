/**
 * Security Middleware
 * Helmet configuration and CORS restrictions
 */

import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';

/**
 * Get allowed origins from environment
 */
function getAllowedOrigins(): string[] {
  const origins = process.env.CORS_ALLOWED_ORIGINS;
  
  if (!origins) {
    // Default development origins
    return [
      'http://localhost:3000',
      'http://localhost:5000', 
      'https://localhost:3000',
      'https://localhost:5000'
    ];
  }
  
  return origins.split(',').map(origin => origin.trim());
}

/**
 * CORS configuration with environment-based allowlist
 */
export function configureCORS() {
  const allowedOrigins = getAllowedOrigins();
  
  return (req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      res.setHeader('Access-Control-Allow-Origin', '*');
    } else if (allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      console.warn(`Blocked CORS request from unauthorized origin: ${origin}`);
      return res.status(403).json({
        code: 'CORS_FORBIDDEN',
        message: 'Origin not allowed by CORS policy',
        details: []
      });
    }
    
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader(
      'Access-Control-Allow-Headers', 
      'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Auth-Token'
    );
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
      return res.status(204).send();
    }
    
    next();
  };
}

/**
 * Security headers with Helmet
 */
export function configureHelmet() {
  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: [
          "'self'",
          "'unsafe-inline'", // Required for Vite in development
          "'unsafe-eval'", // Required for development
          "https://cdn.jsdelivr.net"
        ],
        styleSrc: [
          "'self'",
          "'unsafe-inline'", // Required for styled components
          "https://fonts.googleapis.com"
        ],
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com"
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https:", // Allow HTTPS images
          "blob:" // Allow blob URLs for uploaded images
        ],
        connectSrc: [
          "'self'",
          "https://api.stripe.com",
          "https://api.twilio.com",
          "https://api.sendgrid.com"
        ]
      }
    },
    crossOriginEmbedderPolicy: false, // Disable for better compatibility
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  });
}

/**
 * Prevent GET endpoints from performing mutations
 */
export function preventGetMutations(req: Request, res: Response, next: NextFunction) {
  // List of endpoints that should never be GET if they perform mutations
  const dangerousGetPaths = [
    '/clear',
    '/delete',
    '/remove',
    '/update',
    '/create',
    '/reset'
  ];
  
  if (req.method === 'GET') {
    const hasAuthToken = req.headers.authorization || req.headers['x-auth-token'];
    const isDangerous = dangerousGetPaths.some(path => req.path.includes(path));
    
    if (isDangerous && hasAuthToken) {
      console.warn(`Suspicious GET request to potentially mutating endpoint: ${req.path}`);
      return res.status(405).json({
        code: 'METHOD_NOT_ALLOWED',
        message: 'GET method not allowed for this endpoint',
        details: [{
          field: 'method',
          message: 'Use POST, PUT, or DELETE for this operation'
        }]
      });
    }
  }
  
  next();
}

/**
 * Remove sensitive headers from responses
 */
export function sanitizeHeaders(req: Request, res: Response, next: NextFunction) {
  // Remove server information
  res.removeHeader('X-Powered-By');
  res.removeHeader('Server');
  
  // Add security headers
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
}

/**
 * Production security checks
 */
export function productionSecurityChecks(req: Request, res: Response, next: NextFunction) {
  // Block temp/emergency routes in production
  if (process.env.NODE_ENV === 'production') {
    const blockedPaths = [
      '/api/temp',
      '/api/debug',
      '/api/test',
      '/api/emergency'
    ];
    
    if (blockedPaths.some(path => req.path.startsWith(path))) {
      return res.status(404).json({
        code: 'NOT_FOUND',
        message: 'Endpoint not available in production',
        details: []
      });
    }
  }
  
  next();
}