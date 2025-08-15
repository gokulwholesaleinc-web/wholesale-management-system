/**
 * Authentication Cleaner Utility
 * Clears all old authentication data to force fresh login
 */

export const clearAllOldAuthData = () => {
  console.log('[authCleaner] Clearing all authentication data...');
  
  // Clear all possible auth storage locations
  const storageKeys = [
    'gokul_unified_auth',
    'gokul_auth_data', 
    'authToken',
    'userData',
    'access_token',
    'token',
    'user',
    'auth',
    'authentication',
    'session'
  ];
  
  storageKeys.forEach(key => {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  });
  
  console.log('[authCleaner] All authentication data cleared');
  
  // Force page reload to clear any cached state
  if (window.location.pathname !== '/') {
    window.location.href = '/';
  } else {
    window.location.reload();
  }
};

// Call this function to clear all auth and force fresh login
export const forceLogout = () => {
  clearAllOldAuthData();
};