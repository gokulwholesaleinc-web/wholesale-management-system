import { User } from '@/hooks/useAuth';

// Storage keys
const TOKEN_KEY = 'gokul_auth_token';
const USER_KEY = 'gokul_user_data';
const EXPIRY_KEY = 'gokul_auth_expiry';

// Token expiration time - 7 days
const TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; 

/**
 * Save authentication data to session storage (cleared when browser closes)
 */
export function saveAuthData(token: string, userData: User): void {
  try {
    // Save token
    sessionStorage.setItem(TOKEN_KEY, token);
    
    // Save user data
    sessionStorage.setItem(USER_KEY, JSON.stringify(userData));
    
    // Set expiry time (1 day, but will be cleared when browser closes anyway)
    const expiryTime = Date.now() + (24 * 60 * 60 * 1000);
    sessionStorage.setItem(EXPIRY_KEY, expiryTime.toString());
    
    console.log('Authentication data saved to session storage');
  } catch (error) {
    console.error('Error saving auth data to session storage:', error);
  }
}

/**
 * Get the saved authentication token
 */
export function getAuthToken(): string | null {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const expiry = sessionStorage.getItem(EXPIRY_KEY);
    
    // Check if token exists and is not expired
    if (token && expiry) {
      const expiryTime = parseInt(expiry, 10);
      
      if (Date.now() < expiryTime) {
        return token;
      } else {
        // Token expired, clear auth data
        clearAuthData();
        return null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting auth token from session storage:', error);
    return null;
  }
}

/**
 * Get the saved user data
 */
export function getSavedUserData(): User | null {
  try {
    const userDataStr = sessionStorage.getItem(USER_KEY);
    const expiry = sessionStorage.getItem(EXPIRY_KEY);
    
    // Check if user data exists and is not expired
    if (userDataStr && expiry) {
      const expiryTime = parseInt(expiry, 10);
      
      if (Date.now() < expiryTime) {
        return JSON.parse(userDataStr);
      } else {
        // Data expired, clear auth data
        clearAuthData();
        return null;
      }
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user data from session storage:', error);
    return null;
  }
}

/**
 * Check if user is authenticated based on session storage
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken() && !!getSavedUserData();
}

/**
 * Clear all authentication data from session storage
 */
export function clearAuthData(): void {
  try {
    // Clear from session storage
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(EXPIRY_KEY);
    
    // Also clear from local storage for backward compatibility
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(EXPIRY_KEY);
    
    console.log('Auth data cleared from session storage');
  } catch (error) {
    console.error('Error clearing auth data from storage:', error);
  }
}

/**
 * Refresh the token expiry time (call this on successful API requests)
 */
export function refreshAuthExpiry(): void {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (token) {
      // Use a shorter 24-hour expiry time since session storage will be cleared when browser closes anyway
      const expiryTime = Date.now() + (24 * 60 * 60 * 1000);
      sessionStorage.setItem(EXPIRY_KEY, expiryTime.toString());
    }
  } catch (error) {
    console.error('Error refreshing auth expiry:', error);
  }
}