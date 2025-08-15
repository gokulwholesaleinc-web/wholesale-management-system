/**
 * Centralized Authentication Token Store
 * Eliminates scattered token retrieval logic across the codebase
 */

export type TokenType = 'main' | 'pos' | 'admin';

/**
 * Get authentication token for specific type
 */
export function getAuthToken(type: TokenType = 'main'): string | null {
  switch (type) {
    case 'main':
      // Check multiple sources for main auth token
      return localStorage.getItem('authToken') || 
             sessionStorage.getItem('authToken') ||
             document.cookie.split(';').find(c => c.trim().startsWith('authToken='))?.split('=')[1] ||
             null;
             
    case 'pos':
      // Standardized on 'pos_auth_token' as the single key
      return localStorage.getItem('pos_auth_token') || 
             sessionStorage.getItem('pos_auth_token') ||
             null;
             
    case 'admin':
      // Admin tokens inherit from main but check admin-specific storage first
      return localStorage.getItem('admin-token') ||
             getAuthToken('main');
             
    default:
      return null;
  }
}

/**
 * Store authentication token
 */
export function setAuthToken(token: string, type: TokenType = 'main'): void {
  const key = type === 'pos' ? 'pos_auth_token' : 
              type === 'admin' ? 'admin-token' : 'authToken';
  
  localStorage.setItem(key, token);
  
  // Also store in sessionStorage for redundancy
  sessionStorage.setItem(key, token);
}

/**
 * Clear specific or all authentication tokens
 */
export function clearAuthToken(type?: TokenType): void {
  if (!type) {
    // Clear all tokens
    clearAllAuth();
    return;
  }
  
  const key = type === 'pos' ? 'pos_auth_token' : 
              type === 'admin' ? 'admin-token' : 'authToken';
  
  localStorage.removeItem(key);
  sessionStorage.removeItem(key);
  
  // Clear related cookie
  document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}

/**
 * Clear all authentication data - NUCLEAR option
 */
export function clearAllAuth(): void {
  const authKeys = [
    'authToken', 'pos_auth_token', 'admin-token', 
    'tempAuthToken', 'posAuthToken', // Legacy keys
    'user', 'currentUser', 'posUser'
  ];
  
  // Clear localStorage
  authKeys.forEach(key => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
    
    // Clear cookies
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });
  
  // Clear any auth-related session data
  if (typeof window !== 'undefined' && window.location) {
    // Don't redirect here, let caller handle redirect
  }
}

/**
 * Get authorization header for API requests
 */
export function getAuthHeader(type: TokenType = 'main'): Record<string, string> {
  const token = getAuthToken(type);
  
  if (!token) {
    return {};
  }
  
  return {
    'Authorization': `Bearer ${token}`
  };
}

/**
 * Check if user is authenticated for specific type
 */
export function isAuthenticated(type: TokenType = 'main'): boolean {
  return !!getAuthToken(type);
}

/**
 * Get token expiry (basic check for standard JWT format)
 */
export function isTokenExpired(type: TokenType = 'main'): boolean {
  const token = getAuthToken(type);
  
  if (!token) return true;
  
  try {
    // Basic JWT expiry check (if token follows JWT format)
    const payload = JSON.parse(atob(token.split('.')[1]));
    const now = Date.now() / 1000;
    
    return payload.exp ? payload.exp < now : false;
  } catch {
    // If not JWT format, assume valid (let server validate)
    return false;
  }
}