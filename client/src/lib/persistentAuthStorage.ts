/**
 * Session-only authentication storage system
 * Stores authentication data in sessionStorage so it's cleared when browser is closed
 */

// Define the types for our stored data
interface StoredAuthData {
  token: string;
  userId: string;
  username: string;
  isAdmin: boolean;
  isEmployee: boolean;
  userData: any;
  expiresAt: number;
}

// Storage keys
const AUTH_STORAGE_KEY = 'gokul_auth_data';
const TOKEN_FALLBACK_KEY = 'authToken'; // For backward compatibility

// Default expiration - 1 day (session will be cleared when browser closes anyway)
const DEFAULT_EXPIRY_DAYS = 1;

/**
 * Save comprehensive authentication data
 */
export function saveAuthData(token: string, userData: any): void {
  try {
    const expiresAt = Date.now() + (DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    
    // Create structured auth data with proper handling of both field naming conventions
    const authData: StoredAuthData = {
      token,
      userId: userData.id || '',
      username: userData.username || '',
      isAdmin: !!(userData.isAdmin || userData.is_admin),
      isEmployee: !!(userData.isEmployee || userData.is_employee),
      userData: {
        ...userData,
        // Ensure consistent field names regardless of what the server sends
        isAdmin: !!(userData.isAdmin || userData.is_admin),
        isEmployee: !!(userData.isEmployee || userData.is_employee)
      },
      expiresAt
    };
    
    // Store in sessionStorage with proper serialization (will be cleared when browser closes)
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
    
    // Also store token in legacy location for backward compatibility
    sessionStorage.setItem(TOKEN_FALLBACK_KEY, token);
    
    console.log('Auth data saved successfully. Expires:', new Date(expiresAt).toLocaleString());
  } catch (error) {
    console.error('Failed to save auth data:', error);
  }
}

/**
 * Get the stored authentication data if valid
 */
export function getAuthData(): StoredAuthData | null {
  try {
    // Try to get and parse the stored auth data
    const storedData = sessionStorage.getItem(AUTH_STORAGE_KEY);
    
    if (!storedData) {
      return null;
    }
    
    const authData: StoredAuthData = JSON.parse(storedData);
    
    // Check if the token has expired
    if (authData.expiresAt < Date.now()) {
      console.log('Auth token expired. Clearing data.');
      clearAuthData();
      return null;
    }
    
    return authData;
  } catch (error) {
    console.error('Error retrieving auth data:', error);
    return null;
  }
}

/**
 * Get just the authentication token (for API calls)
 */
export function getAuthToken(): string | null {
  // First try to get the token from our structured storage
  const authData = getAuthData();
  if (authData?.token) {
    return authData.token;
  }
  
  // Fall back to legacy token storage
  return sessionStorage.getItem(TOKEN_FALLBACK_KEY);
}

/**
 * Check if the user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

/**
 * Check if the authenticated user is an admin
 */
export function isAdmin(): boolean {
  const authData = getAuthData();
  
  // Check our structured storage first
  if (authData?.isAdmin) {
    return true;
  }
  
  // Fall back to legacy token-based admin check
  const legacyToken = sessionStorage.getItem(TOKEN_FALLBACK_KEY);
  return !!(legacyToken && legacyToken.startsWith('admin-token-'));
}

/**
 * Check if the authenticated user is an employee
 */
export function isEmployee(): boolean {
  const authData = getAuthData();
  
  // Check our structured storage
  return !!authData?.isEmployee;
}

/**
 * Check if the authenticated user is a staff member (admin or employee)
 */
export function isStaff(): boolean {
  return isAdmin() || isEmployee();
}

/**
 * Clear all authentication data
 */
export function clearAuthData(): void {
  // Check if we have an admin token before clearing
  const token = localStorage.getItem(TOKEN_FALLBACK_KEY) || sessionStorage.getItem(TOKEN_FALLBACK_KEY);
  const isAdminToken = token && (token.startsWith('admin-token-') || token.includes('admin'));
  
  // Clear session storage (always gets cleared when browser closes anyway)
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(TOKEN_FALLBACK_KEY);
  sessionStorage.removeItem('gokul_auth_token');
  sessionStorage.removeItem('gokul_user_data');
  sessionStorage.removeItem('gokul_auth_expiry');
  
  // Only clear localStorage if it's not an admin token
  if (!isAdminToken) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(TOKEN_FALLBACK_KEY);
    localStorage.removeItem('gokul_auth_token');
    localStorage.removeItem('gokul_user_data');
    localStorage.removeItem('gokul_auth_expiry');
    
    console.log('All auth data cleared');
  } else {
    console.log('Regular auth data cleared, admin token preserved');
  }
}

/**
 * Refresh the expiration date of the authentication data
 */
export function refreshAuthExpiry(): void {
  try {
    const authData = getAuthData();
    
    if (authData) {
      // Update the expiration date
      authData.expiresAt = Date.now() + (DEFAULT_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
      
      // Save the updated auth data
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authData));
      
      console.log('Auth expiry refreshed. New expiry:', new Date(authData.expiresAt).toLocaleString());
    }
  } catch (error) {
    console.error('Failed to refresh auth expiry:', error);
  }
}

/**
 * Get user data if available
 */
export function getUserData(): any | null {
  const authData = getAuthData();
  return authData?.userData || null;
}