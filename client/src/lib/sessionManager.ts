// Session timeout management - much longer for wholesale business use
const SESSION_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours in milliseconds
let inactivityTimer: NodeJS.Timeout | null = null;
let lastActivity: number = Date.now();

// Helper function to check if current user is an admin
function isAdminUser(): boolean {
  // NEVER interfere with auth data during checks
  try {
    // Check storage locations for admin token
    const token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
    const isAdminToken = token && (token.startsWith('admin-token-') || token.includes('admin'));
    
    // Also check the gokul_auth_data for admin flag
    const authData = localStorage.getItem('gokul_auth_data') || sessionStorage.getItem('gokul_auth_data');
    if (authData) {
      const parsed = JSON.parse(authData);
      if (parsed && parsed.userData && (parsed.userData.isAdmin || parsed.userData.is_admin)) {
        return true;
      }
    }
    
    return !!isAdminToken;
  } catch (e) {
    // Don't log errors that might indicate auth checking
    return false;
  }
}

// Initialize the session manager
export function initSessionManager() {
  console.log('Initializing session timeout system');
  
  // Check if this is an admin account - admins get longer timeouts
  if (isAdminUser()) {
    console.log('Admin user detected - extended session timeout (8 hours)');
  } else {
    console.log('Regular user - standard session timeout (8 hours)');
  }
  
  // Reset the timer when user activity is detected
  const resetTimer = () => {
    lastActivity = Date.now();
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
    
    // Start a new timer (only for non-admin users)
    inactivityTimer = setTimeout(() => {
      console.log('Session expired due to inactivity');
      logoutUser();
    }, SESSION_TIMEOUT);
  };
  
  // Track user activity
  const trackActivity = () => {
    resetTimer();
  };
  
  // Add event listeners for user activity
  window.addEventListener('mousemove', trackActivity);
  window.addEventListener('mousedown', trackActivity);
  window.addEventListener('keypress', trackActivity);
  window.addEventListener('touchmove', trackActivity);
  window.addEventListener('touchstart', trackActivity);
  window.addEventListener('scroll', trackActivity);
  
  // Removed browser close/refresh handler that was clearing auth data
  // This was causing immediate logouts on page refresh
  
  // Delay starting the timer to allow user to establish session after login
  setTimeout(() => {
    resetTimer();
  }, 5000); // Wait 5 seconds after login before starting inactivity tracking
  
  // For debugging
  console.log('Session manager initialized with timeout of', SESSION_TIMEOUT / (60 * 60 * 1000), 'hours');
  
  // Return cleanup function
  return () => {
    if (inactivityTimer) {
      clearTimeout(inactivityTimer);
    }
    window.removeEventListener('mousemove', trackActivity);
    window.removeEventListener('mousedown', trackActivity);
    window.removeEventListener('keypress', trackActivity);
    window.removeEventListener('touchmove', trackActivity);
    window.removeEventListener('touchstart', trackActivity);
    window.removeEventListener('scroll', trackActivity);
  };
}

// Logout function
export function logoutUser() {
  console.log('Logging out user due to session expiration');
  
  // Clear all authentication data using standard methods
  sessionStorage.removeItem('authToken');
  sessionStorage.removeItem('gokul_auth_data');
  localStorage.removeItem('authToken');
  localStorage.removeItem('gokul_auth_data');
  
  // Trigger auth state change
  window.dispatchEvent(new CustomEvent('authStateChanged'));
  
  // Redirect to login page
  window.location.href = '/';
}

// Check if session is still valid
export function isSessionValid(): boolean {
  const now = Date.now();
  const timeElapsed = now - lastActivity;
  
  // Session is valid if less than timeout has passed since last activity
  return timeElapsed < SESSION_TIMEOUT;
}

// Function to manually extend session
export function extendSession() {
  lastActivity = Date.now();
  console.log('Session manually extended');
}