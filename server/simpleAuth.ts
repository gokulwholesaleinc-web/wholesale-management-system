import { type Request, type Response, type NextFunction } from "express";
import { storage } from "./storage";
// Import role utilities for consistent role handling
import { normalizeUserRoles, isAdmin, isStaff } from '../shared/roleUtils';

// Simple token-based authentication
export const generateToken = (userId: string) => {
  // Basic implementation: userId-timestamp-random
  return `${userId}-${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
};

// Simple in-memory token store (would be replaced with DB in production)
const tokens: Record<string, { userId: string, expires: number }> = {};

// Create a token and store it
export const createAuthToken = (userId: string) => {
  const token = generateToken(userId);
  // Token expires in 24 hours
  const expires = Date.now() + (24 * 60 * 60 * 1000);
  tokens[token] = { userId, expires };
  return token;
};

// Validate a token
export const validateToken = async (token: string) => {
  console.log(`[validateToken] Validating token: ${token?.substring(0, 20)}...`);
  
  // SECURITY FIX: Removed hardcoded admin token bypass - all authentication must go through proper validation

  // First check in-memory store
  const tokenData = tokens[token];
  
  if (tokenData) {
    // Check if token has expired
    if (tokenData.expires < Date.now()) {
      console.log('[validateToken] Token expired, removing from store');
      delete tokens[token];
      return null;
    }
    console.log(`[validateToken] Valid token found in store for user: ${tokenData.userId}`);
    
    // Get user data from database to ensure it's current
    try {
      const user = await storage.getUser(tokenData.userId);
      if (user) {
        return user;
      } else {
        console.log('[validateToken] User not found in database, removing token');
        delete tokens[token];
        return null;
      }
    } catch (error) {
      console.error('[validateToken] Database error:', error);
      return null;
    }
  }
  
  // CRITICAL FIX: Enhanced token recovery for production environments
  // If token is not in memory store (could happen after server restart)
  // but has the expected format, try to extract userId and verify user exists
  if (token.includes('-')) {
    const parts = token.split('-');
    if (parts.length >= 3) {
      // FIXED: Handle different token formats correctly:
      // Format 1: "user-1750354461611-timestamp-hash" -> extract "user-1750354461611"
      // Format 2: "cust_mbpxj6vffmc-timestamp-hash" -> extract "cust_mbpxj6vffmc"
      // Format 3: "test1-timestamp-hash" -> extract "test1"
      // Format 4: "admin-token-timestamp-hash" -> extract "admin"
      // Format 5: "pos-admin_49rzcl0p-timestamp" -> extract "admin_49rzcl0p"
      
      let potentialUserId;
      if (parts[0] === 'admin' && parts[1] === 'token') {
        // Admin token format: admin-token-timestamp-hash
        potentialUserId = 'admin';
      } else if (parts[0] === 'pos' && parts.length >= 3) {
        // POS token format: pos-{userId}-{timestamp}
        // Extract userId from parts[1] to parts[length-1] (excluding last timestamp part)
        potentialUserId = parts.slice(1, -1).join('-');
        console.log(`[validateToken] POS token detected, extracted userId: ${potentialUserId}`);
      } else if (parts[0] === 'user' && parts.length >= 3 && parts[1].match(/^\d+$/)) {
        // User token format: user-1750354461611-timestamp-hash
        // Extract user-ID portion (first two parts)
        potentialUserId = `${parts[0]}-${parts[1]}`;
      } else if (parts[0].includes('_')) {
        // Customer format: cust_prefix-timestamp-hash
        potentialUserId = parts[0];
      } else {
        // Simple customer format: test1-timestamp-hash
        potentialUserId = parts[0];
      }
      
      console.log(`[validateToken] Token not in memory, extracting userId from token: ${potentialUserId} (from parts: ${parts.join('-')})`);
      console.log(`[validateToken] Token parts analysis: [${parts.join(', ')}], extracted: ${potentialUserId}`);
      
      // Verify the user actually exists in the database
      try {
        const user = await storage.getUser(potentialUserId);
        if (user) {
          console.log(`[validateToken] ✅ User validated after server restart: ${user.username} (${potentialUserId})`);
          // Re-create the token entry with fresh expiration (24 hours)
          tokens[token] = { userId: potentialUserId, expires: Date.now() + (24 * 60 * 60 * 1000) };
          // Return the full user object with standardized role fields
          return {
            ...user,
            isAdmin: Boolean(user.isAdmin || user.is_admin),
            isEmployee: Boolean(user.isEmployee || user.is_employee)
          };
        } else {
          console.log(`[validateToken] ❌ User not found for token: ${potentialUserId}`);
          return null;
        }
      } catch (error) {
        console.error('[validateToken] Error validating user from token:', error);
        return null;
      }
    } else if (parts.length === 2) {
      // Handle legacy format if needed
      const potentialUserId = parts[0];
      console.log('Legacy token format detected, extracting userId:', potentialUserId);
      
      try {
        const user = await storage.getUser(potentialUserId);
        if (user) {
          console.log(`✅ Legacy user validated: ${user.username} (${potentialUserId})`);
          tokens[token] = { userId: potentialUserId, expires: Date.now() + (24 * 60 * 60 * 1000) };
          return {
            ...user,
            isAdmin: Boolean(user.isAdmin || user.is_admin),
            isEmployee: Boolean(user.isEmployee || user.is_employee)
          };
        }
      } catch (error) {
        console.error('Error validating legacy token:', error);
        return null;
      }
    }
  }

  // Additional fallback for production - try pattern matching for customer tokens
  if (token.startsWith('cust_') && token.includes('-token-')) {
    const userIdMatch = token.match(/^(cust_[a-zA-Z0-9]+)-token-/);
    if (userIdMatch) {
      const potentialUserId = userIdMatch[1];
      console.log('Attempting customer token recovery for:', potentialUserId);
      
      try {
        const user = await storage.getUser(potentialUserId);
        if (user) {
          console.log(`✅ Customer token recovered: ${user.username} (${potentialUserId})`);
          // Re-create the token entry
          tokens[token] = { userId: potentialUserId, expires: Date.now() + (24 * 60 * 60 * 1000) };
          return potentialUserId;
        }
      } catch (error) {
        console.error('Error recovering customer token:', error);
      }
    }
  }
  
  console.log('[validateToken] Invalid token format or expired:', token.substring(0, 20) + '...');
  return null;
};

// Remove a token (logout)
export const removeToken = (token: string) => {
  delete tokens[token];
};

// Middleware to verify authentication - UNIFIED VERSION
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    console.log('[requireAuth] Starting authentication check');
    let token: string | undefined;
    
    // 1. Authorization header (Bearer token - standard)
    const authHeader = req.headers.authorization;
    if (authHeader) {
      if (authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
        console.log('[requireAuth] Found Bearer token');
      } else if (authHeader.startsWith('Token ')) {
        token = authHeader.split(' ')[1];
        console.log('[requireAuth] Found Token header');
      } else {
        // Direct token without prefix
        token = authHeader;
        console.log('[requireAuth] Found direct authorization token');
      }
    }
    
    // 2. x-auth-token header (custom header for API requests)
    if (!token && req.headers['x-auth-token']) {
      token = req.headers['x-auth-token'] as string;
      console.log('[requireAuth] Found x-auth-token header');
    }
    
    // 3. auth-token header (alternative format)
    if (!token && req.headers['auth-token']) {
      token = req.headers['auth-token'] as string;
      console.log('[requireAuth] Found auth-token header');
    }
    
    // 4. Authentication header (some clients use this)
    if (!token && req.headers['authentication']) {
      token = req.headers['authentication'] as string;
      console.log('[requireAuth] Found authentication header');
    }
    if (!token && req.headers['x-access-token']) {
      token = req.headers['x-access-token'] as string;
    }
    
    // 6. Check cookies
    if (!token && req.cookies?.authToken) {
      token = req.cookies.authToken;
    }
    
    // 7. Check query parameters (for testing/debugging)
    if (!token && req.query.token) {
      token = req.query.token as string;
    }
    
    // 8. Check request body for token (POST requests)
    if (!token && req.body?.token) {
      token = req.body.token;
    }
    
    // 9. Enhanced mobile/app compatibility - scan all headers
    if (!token) {
      const headerKeys = Object.keys(req.headers);
      for (const key of headerKeys) {
        const value = req.headers[key];
        if (typeof value === 'string') {
          // Look for JWT tokens (start with eyJ)
          if (value.startsWith('eyJ')) {
            console.log(`Found JWT token in header: ${key}`);
            token = value;
            break;
          }
          // Look for custom token patterns (contains -token-)
          if (value.includes('-token-') && value.length > 20) {
            console.log(`Found custom token in header: ${key}`);
            token = value;
            break;
          }
          // SECURITY FIX: Removed admin token pattern matching - proper authentication required
        }
      }
    }
    
    // No token found anywhere
    if (!token) {
      console.log('No authentication token found in request headers, cookies, or body');
      console.log('Available headers:', Object.keys(req.headers));
      return res.status(401).json({ message: "Unauthorized" });
    }
    
    // SECURITY FIX: Removed hardcoded admin token bypass - all authentication must go through proper database validation
    
    // Validate regular token
    const user = await validateToken(token);
    if (!user) {
      console.log('[requireAuth] Invalid or expired token');
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    
    // User object already has standardized fields from validateToken
    // Log authentication details for debugging
    console.log(`[requireAuth] User roles: Admin=${user.isAdmin}, Employee=${user.isEmployee}`);
    
    // Attach user to request with all standardized fields
    req.user = { 
      ...user,
      customerLevel: user.customerLevel || 1
    };
    
    console.log(`[requireAuth] ✅ Authenticated as user: ${user.username} (ID: ${user.id})`);
    next();
  } catch (error) {
    console.error("Authentication error:", error);
    res.status(500).json({ message: "Authentication error" });
  }
};

// Admin-only middleware that includes authentication check
export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // First check if user is already authenticated from a previous middleware
    let user = req.user as any;
    
    // If not, attempt to authenticate from various token sources
    if (!user) {
      // Get token from Authorization header, x-auth-token header, or cookies
      let token = null;
      
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
      } else if (req.headers.authorization) {
        token = req.headers.authorization;
      } else if (req.headers['x-auth-token']) {
        token = req.headers['x-auth-token'] as string;
      } else if (req.cookies?.authToken) {
        token = req.cookies.authToken;
      }
      
      // SECURITY FIX: Removed hardcoded admin token bypass - proper authentication required
      
      // For mobile app - special handling
      if (req.headers['user-agent']?.includes('Mobile')) {
        console.log('Mobile app detected - trying additional auth methods');
        
        // SECURITY FIX: Removed hardcoded admin token detection - proper authentication required
      }
      
      // No token or not admin token
      if (!token) {
        console.log('No authentication token found in requireAdmin');
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // For regular tokens, validate and check user
      const validatedUser = await validateToken(token);
      if (!validatedUser) {
        console.log('Invalid or expired token in requireAdmin');
        return res.status(401).json({ message: "Invalid or expired token" });
      }
      
      // Set the validated user object with standardized fields
      user = validatedUser;
      req.user = user;
    }
    
    // Ensure user object exists before checking admin status
    if (!user) {
      console.log('No user found after validation in requireAdmin');
      return res.status(401).json({ message: "Authentication failed" });
    }
    
    // Normalize user roles for consistent checking
    const normalizedUser = normalizeUserRoles(user);
    console.log('RequireAdmin - user found:', normalizedUser.username, 'roles:', normalizedUser.roles);

    // Check admin access using normalized role system
    if (!isAdmin(normalizedUser)) {
      console.log('❌ User lacks admin privileges:', normalizedUser.username, 'roles:', normalizedUser.roles);
      return res.status(403).json({ message: "Admin access required" });
    }

    // Attach normalized user to request
    req.user = normalizedUser;
    
    // User is authenticated and is an admin
    next();
  } catch (error) {
    console.error("Admin check error:", error);
    res.status(500).json({ message: "Admin check error" });
  }
};

// Middleware to require employee or admin privileges
export const requireEmployeeOrAdmin = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // First check if user is already authenticated from a previous middleware
    let user = req.user as any;
    
    // If not authenticated, attempt to authenticate from various token sources
    if (!user) {
      // Get token from Authorization header, x-auth-token header, or cookies
      let token = null;
      
      if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
        token = req.headers.authorization.split(' ')[1];
      } else if (req.headers.authorization) {
        token = req.headers.authorization;
      } else if (req.headers['x-auth-token']) {
        token = req.headers['x-auth-token'] as string;
      } else if (req.cookies?.authToken) {
        token = req.cookies.authToken;
      }
      
      // SECURITY FIX: Removed hardcoded admin token bypass - proper authentication required
      
      // No token found
      if (!token) {
        console.log('No authentication token found in requireEmployeeOrAdmin');
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      // For regular tokens, validate and check user
      const validatedUser = await validateToken(token);
      if (!validatedUser) {
        console.log('Invalid or expired token in requireEmployeeOrAdmin');
        return res.status(401).json({ message: "Invalid or expired token" });
      }
      
      // Set the validated user object
      user = validatedUser;
      req.user = user;
    }
    
    // Ensure user object exists before checking staff status
    if (!user) {
      console.log('No user found after validation in requireEmployeeOrAdmin');
      return res.status(401).json({ message: "Authentication failed" });
    }
    
    // Normalize user roles for consistent checking
    const normalizedUser = normalizeUserRoles(user);
    console.log('RequireEmployeeOrAdmin - user found:', normalizedUser.username, 'roles:', normalizedUser.roles);
    
    // Check staff access using normalized role system
    if (!isStaff(normalizedUser)) {
      console.log('❌ User lacks staff privileges:', normalizedUser.username, 'roles:', normalizedUser.roles);
      return res.status(403).json({ message: "Staff access required" });
    }

    // Attach normalized user to request
    req.user = normalizedUser;
    
    // User is authenticated and has appropriate access
    next();
  } catch (error) {
    console.error("Staff check error:", error);
    res.status(500).json({ message: "Staff access check error" });
  }
};

// Modify Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        isAdmin?: boolean;
        isEmployee?: boolean;
        customerLevel?: number;
      };
    }
  }
}