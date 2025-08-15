/**
 * Input Validation Middleware
 * Uses Zod schemas with consistent error envelope
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

interface ValidationError {
  code: string;
  message: string;
  details: Array<{
    field: string;
    message: string;
    value?: any;
  }>;
}

/**
 * Middleware factory for input validation
 */
export function validateInput(schema: z.ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const validationError: ValidationError = {
          code: 'VALIDATION_ERROR',
          message: 'Invalid input data',
          details: error.errors.map(err => ({
            field: err.path.join('.'),
            message: err.message,
            value: err.code === 'invalid_type' ? undefined : err.input
          }))
        };

        return res.status(400).json(validationError);
      }

      // Unexpected error
      console.error('Validation middleware error:', error);
      res.status(500).json({
        code: 'INTERNAL_ERROR',
        message: 'Validation failed',
        details: []
      });
    }
  };
}

/**
 * Common validation schemas
 */
export const commonSchemas = {
  // Pagination
  pagination: z.object({
    page: z.number().min(1).default(1),
    limit: z.number().min(1).max(100).default(20),
    sort: z.string().optional(),
    order: z.enum(['asc', 'desc']).default('asc')
  }),

  // User login
  login: z.object({
    username: z.string().min(1, 'Username is required'),
    password: z.string().min(1, 'Password is required'),
    rememberMe: z.boolean().optional()
  }),

  // POS login
  posLogin: z.object({
    username: z.string().min(1),
    password: z.string().min(1),
    deviceFingerprint: z.string().optional(),
    rememberDevice: z.boolean().optional()
  }),

  // Cart operations
  addToCart: z.object({
    productId: z.number().positive(),
    quantity: z.number().positive().max(1000)
  }),

  updateCart: z.object({
    productId: z.number().positive(),
    quantity: z.number().min(0).max(1000)
  }),

  // User creation
  createUser: z.object({
    username: z.string().min(3).max(50),
    password: z.string().min(6),
    email: z.string().email().optional(),
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
    company: z.string().max(200).optional(),
    customerLevel: z.number().min(1).max(5).default(1),
    isAdmin: z.boolean().default(false),
    isEmployee: z.boolean().default(false)
  }),

  // Product updates
  updateProduct: z.object({
    name: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
    price: z.number().positive().optional(),
    isVisible: z.boolean().optional(),
    isDraft: z.boolean().optional(),
    categoryId: z.number().positive().optional()
  })
};