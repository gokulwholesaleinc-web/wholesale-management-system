/**
 * Authentication Sync Utility
 * Ensures frontend and backend authentication stay synchronized
 */

// Clear all authentication data
export const clearAllAuthData = () => {
  // Clear unified auth
  sessionStorage.removeItem('gokul_unified_auth');
  localStorage.removeItem('gokul_unified_auth');
  
  // Clear legacy storage
  sessionStorage.removeItem('authToken');
  localStorage.removeItem('authToken');
  sessionStorage.removeItem('userData');
  localStorage.removeItem('userData');
  sessionStorage.removeItem('gokul_auth_data');
  localStorage.removeItem('gokul_auth_data');
  
  console.log('[authSync] All authentication data cleared');
};

// Force login page redirect
export const forceLoginRedirect = () => {
  clearAllAuthData();
  if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
    console.log('[authSync] Redirecting to login page');
    window.location.href = '/';
  }
};

// Check if current stored token matches expected format
export const validateStoredToken = () => {
  const unifiedAuthStr = sessionStorage.getItem('gokul_unified_auth') || localStorage.getItem('gokul_unified_auth');
  if (unifiedAuthStr) {
    try {
      const unifiedAuth = JSON.parse(unifiedAuthStr);
      if (unifiedAuth.token && unifiedAuth.expiresAt > Date.now()) {
        return unifiedAuth.token;
      }
    } catch (e) {
      // Invalid format, clear it
      clearAllAuthData();
    }
  }
  
  const legacyToken = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
  return legacyToken;
};