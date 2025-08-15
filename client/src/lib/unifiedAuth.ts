/**
 * Centralized Authentication Token Management
 * Fixes inconsistent token naming across the application
 */

export type TokenType = 'main' | 'pos';

interface AuthToken {
  token: string;
  type: TokenType;
  userId: string;
  expires?: number;
}

/**
 * Single source of truth for getting authentication tokens
 * Handles multiple token formats and storage locations
 */
export function getAuthToken(preferredType: TokenType = 'main'): string | null {
  // Priority order based on requested type
  if (preferredType === 'pos') {
    // POS-specific token priority
    const posToken = localStorage.getItem('pos_auth_token');
    if (posToken) return posToken;
    
    // Fallback to unified auth if POS token not found
    const unifiedAuth = localStorage.getItem('gokul_unified_auth');
    if (unifiedAuth) {
      try {
        const parsed = JSON.parse(unifiedAuth);
        return parsed.token || parsed.authToken;
      } catch (e) {
        console.warn('Failed to parse unified auth token');
      }
    }
    
    // Legacy fallbacks
    return localStorage.getItem('pos_auth_token') || 
           localStorage.getItem('authToken') ||
           localStorage.getItem('token');
  } else {
    // Main app token priority
    const unifiedAuth = localStorage.getItem('gokul_unified_auth');
    if (unifiedAuth) {
      try {
        const parsed = JSON.parse(unifiedAuth);
        return parsed.token || parsed.authToken;
      } catch (e) {
        console.warn('Failed to parse unified auth token');
      }
    }
    
    // Legacy fallbacks
    return localStorage.getItem('authToken') ||
           localStorage.getItem('token') ||
           localStorage.getItem('pos_auth_token');
  }
}

/**
 * Set authentication token with proper storage
 */
export function setAuthToken(token: string, type: TokenType = 'main', userId?: string): void {
  if (type === 'pos') {
    localStorage.setItem('pos_auth_token', token);
    
    // Also update unified auth for consistency
    const existingUnified = localStorage.getItem('gokul_unified_auth');
    if (existingUnified) {
      try {
        const parsed = JSON.parse(existingUnified);
        parsed.posToken = token;
        localStorage.setItem('gokul_unified_auth', JSON.stringify(parsed));
      } catch (e) {
        console.warn('Failed to update unified auth with POS token');
      }
    }
  } else {
    // Main app token
    const authData = {
      token,
      authToken: token, // Legacy compatibility
      type,
      userId,
      timestamp: Date.now()
    };
    
    localStorage.setItem('gokul_unified_auth', JSON.stringify(authData));
    localStorage.setItem('authToken', token); // Legacy compatibility
  }
}

/**
 * Clear all authentication tokens
 */
export function clearAuthTokens(): void {
  const tokenKeys = [
    'gokul_unified_auth',
    'pos_auth_token', 
    'pos_auth_token',
    'authToken',
    'token',
    'tempAuthToken'
  ];
  
  tokenKeys.forEach(key => localStorage.removeItem(key));
}

/**
 * Check if user is authenticated for specific context
 */
export function isAuthenticated(type: TokenType = 'main'): boolean {
  const token = getAuthToken(type);
  return !!token && token.length > 0;
}

/**
 * Get Authorization header value for API requests
 */
export function getAuthHeader(type: TokenType = 'main'): string | null {
  const token = getAuthToken(type);
  return token ? `Bearer ${token}` : null;
}

/**
 * Enhanced API request wrapper that always includes proper auth
 */
export async function authenticatedFetch(
  url: string, 
  options: RequestInit = {}, 
  tokenType: TokenType = 'main'
): Promise<Response> {
  const authHeader = getAuthHeader(tokenType);
  
  if (!authHeader) {
    throw new Error(`No valid ${tokenType} authentication token found`);
  }
  
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': authHeader,
    ...options.headers
  };
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  // Handle 401 errors consistently
  if (response.status === 401) {
    console.warn(`401 Unauthorized for ${tokenType} request to ${url}`);
    // Clear invalid tokens
    if (tokenType === 'pos') {
      localStorage.removeItem('pos_auth_token');
    } else {
      localStorage.removeItem('gokul_unified_auth');
      localStorage.removeItem('authToken');
    }
    throw new Error(`401: Unauthorized - ${tokenType} token invalid`);
  }
  
  return response;
}

/**
 * Parse token to extract user information (for debugging)
 */
export function parseToken(token: string): { userId?: string; type?: string } | null {
  try {
    // Handle POS tokens: pos-{userId}-{timestamp}-{hash}
    if (token.startsWith('pos-')) {
      const parts = token.split('-');
      if (parts.length >= 3) {
        return { 
          userId: parts.slice(1, -2).join('-'), 
          type: 'pos' 
        };
      }
    }
    
    // Handle main auth tokens: user-{userId}-{timestamp}-{hash}
    if (token.startsWith('user-')) {
      const parts = token.split('-');
      if (parts.length >= 3) {
        return { 
          userId: parts[1], 
          type: 'main' 
        };
      }
    }
    
    return null;
  } catch (e) {
    console.warn('Failed to parse token:', e);
    return null;
  }
}