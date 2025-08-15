// Authentication related utilities
import { apiRequest } from "./queryClient";
import { simpleAuthManager } from "./simpleAuthManager";

// Log the current authentication status to console
export const logAuthStatus = () => {
  // Check for auth token
  const hasToken = !!sessionStorage.getItem('authToken') || !!sessionStorage.getItem('gokul_auth_data');

  // Log status for debugging
  console.log('Auth status:', {
    hasToken
  });
};

// Login function with enhanced browser compatibility
export async function login(username: string, password: string) {
  try {
    console.log('🔐 Attempting login for user:', username);
    console.log('🔐 Login Request Details:');
    console.log('- Username:', username);
    console.log('- Password length:', password.length);
    console.log('- Request URL:', '/api/login');
    console.log('- Request headers:', {
      'Content-Type': 'application/json',
    });
    console.log('- Request body:', JSON.stringify({ username, password: '***' }));

    console.log('🔐 Password provided:', !!password);
    console.log('🔐 Username length:', username.length);
    console.log('🔐 Password length:', password.length);

    const requestBody = JSON.stringify({ username, password });
    console.log('📤 Request body:', requestBody);

    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: requestBody,
      credentials: "include"
    });

    console.log('📡 Login response status:', response.status);
    console.log('📡 Login response ok:', response.ok);
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      let errorText = 'Login failed';
      try {
        // Check if response has text method and can be read
        if (typeof response.text === 'function') {
          errorText = await response.text();
        } else if (response.statusText) {
          errorText = response.statusText;
        }
      } catch (textError) {
        console.warn('Could not read error text:', textError);
        errorText = `HTTP ${response.status}`;
      }
      console.error('❌ Login failed with status:', response.status, 'Error:', errorText);
      
      // Return specific error messages based on status and content
      if (response.status === 401 || errorText.includes('Invalid credentials') || errorText.includes('Incorrect password')) {
        throw new Error('Incorrect username or password. Please try again.');
      } else if (response.status >= 500) {
        throw new Error('Server error. Please try again later.');
      } else {
        throw new Error('Incorrect username or password. Please try again.');
      }
    }

    let result;
    try {
      // Enhanced JSON parsing with better error handling
      if (typeof response.json === 'function') {
        result = await response.json();
      } else {
        // Fallback for older browsers
        const text = await response.text();
        result = JSON.parse(text);
      }
    } catch (jsonError) {
      console.error('❌ Failed to parse JSON response:', jsonError);
      throw new Error('Invalid response format from server');
    }

    console.log('✅ Login successful, result:', result);

    if (result && result.token && result.user) {
      // Store auth data using unified auth system
      const authData = {
        token: result.token,
        user: result.user,
        expiresAt: Date.now() + (8 * 60 * 60 * 1000), // 8 hours
        loginTime: Date.now()
      };

      // Primary storage in unified auth system
      sessionStorage.setItem('gokul_unified_auth', JSON.stringify(authData));
      localStorage.setItem('gokul_unified_auth', JSON.stringify(authData));
      
      // Legacy storage for compatibility
      sessionStorage.setItem('authToken', result.token);
      sessionStorage.setItem('gokul_auth_data', JSON.stringify(authData));

      console.log('💾 Auth data stored in unified system');
      console.log('💾 Token stored for API requests');
      
      return result;
    } else {
      console.error('❌ Invalid login response format:', result);
      throw new Error('Invalid login response format');
    }
  } catch (error) {
    console.error('💥 Login error:', error);
    throw error;
  }
}

// Logout function - clears auth data and redirects
export const logout = async () => {
  try {
    console.log('Attempting to logout...');
    
    // Call the API logout endpoint first
    try {
      await fetch('/api/logout', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: "include"
      });
    } catch (apiError) {
      console.warn('API logout failed, but continuing with local cleanup:', apiError);
    }

    // Use simple auth manager for comprehensive cleanup
    simpleAuthManager.clearAuth();

    // Clear query cache to reset auth state
    try {
      const { queryClient } = await import('./queryClient');
      queryClient.clear();
    } catch (e) {
      // Query client not available, continue with logout
    }

    // Trigger auth state change event
    window.dispatchEvent(new CustomEvent('authStateChanged'));

    console.log('Auth data cleared, redirecting to main page');

    // Force full page reload to reset all state
    window.location.href = '/';
    
    return true;
  } catch (error) {
    console.error('Logout failed:', error);

    // Fallback cleanup
    sessionStorage.clear();
    localStorage.removeItem('authToken');
    localStorage.removeItem('gokul_auth_data');

    window.location.href = '/';
    return false;
  }
};

// Check if user is authenticated
export const isAuthenticated = () => {
  return !!sessionStorage.getItem('authToken') || !!sessionStorage.getItem('gokul_auth_data');
};

// Check if user is admin
export const isAdmin = () => {
  // Check for admin token format
  const token = sessionStorage.getItem('authToken');
  if (token && token.startsWith('admin-token-')) {
    return true;
  }

  // Check in storage data
  try {
    const authData = sessionStorage.getItem('gokul_auth_data');
    if (authData) {
      const parsed = JSON.parse(authData);
      return !!parsed.isAdmin;
    }
  } catch (err) {
    console.error('Error checking admin status:', err);
  }

  return false;
};
// Bulletproof authentication function
export async function loginDirectly(username: string, password: string) {
  try {
    console.log('🔐 Direct login attempt:', username);
    
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ username, password }),
      credentials: 'include'
    });

    console.log('📡 Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Login failed:', errorText);
      throw new Error(errorText);
    }

    const result = await response.json();
    console.log('✅ Login successful:', result);
    
    if (result.success && result.token) {
      // Store auth data
      sessionStorage.setItem('authToken', result.token);
      sessionStorage.setItem('gokul_auth_data', JSON.stringify({
        token: result.token,
        userData: result.user,
        expiresAt: Date.now() + (8 * 60 * 60 * 1000)
      }));
      
      return result;
    }
    
    throw new Error('Invalid response format');
  } catch (error) {
    console.error('💥 Direct login error:', error);
    throw error;
  }
}

