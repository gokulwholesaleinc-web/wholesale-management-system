import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    
    // Handle 401 Unauthorized errors specifically
    if (res.status === 401) {
      console.warn('[apiRequest] 401 Unauthorized - clearing stored auth data');
      // Clear all auth storage locations to force re-login
      sessionStorage.clear();
      localStorage.removeItem('gokul_unified_auth');
      localStorage.removeItem('authToken');
      localStorage.removeItem('gokul_auth_data');
      
      // Check if we're in POS context before clearing POS token
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/instore')) {
        console.warn('[apiRequest] 401 in POS context - redirecting to POS login');
        localStorage.removeItem('pos_auth_token');
        window.location.href = '/instore/login';
      } else {
        window.location.href = '/';
      }
    }
    
    throw new Error(`${res.status}: ${text}`);
  }
}

// Overloaded function signatures
export async function apiRequest(url: string): Promise<any>;
export async function apiRequest(url: string, options: { method?: string; body?: unknown }): Promise<any>;
export async function apiRequest(method: string, url: string, data?: unknown): Promise<any>;

export async function apiRequest(
  urlOrMethod: string,
  urlOrOptions?: string | { method?: string; body?: unknown },
  data?: unknown | undefined,
): Promise<any> {
  // Determine if this is the old style (method, url, data) or new style (url, options)
  let method: string;
  let url: string;
  let body: unknown;
  
  if (typeof urlOrOptions === 'string') {
    // Old style: (method, url, data)
    method = urlOrMethod;
    url = urlOrOptions;
    body = data;
  } else if (typeof urlOrOptions === 'object' && urlOrOptions !== null) {
    // New style: (url, options)
    method = urlOrOptions.method || 'GET';
    url = urlOrMethod;
    body = urlOrOptions.body;
  } else {
    // Simple style: (url) - defaults to GET
    method = 'GET';
    url = urlOrMethod;
    body = undefined;
  }
  // Add auth headers - always include Content-Type AND token if available
  const headers: Record<string, string> = { 
    "Content-Type": "application/json"
  };
  
  // Enhanced token retrieval using unified auth system
  try {
    let token: string | null = null;
    
    // 1. Check unified auth system first (primary method)
    const unifiedAuthStr = sessionStorage.getItem('gokul_unified_auth') || localStorage.getItem('gokul_unified_auth');
    if (unifiedAuthStr) {
      try {
        const unifiedAuth = JSON.parse(unifiedAuthStr);
        if (unifiedAuth.token && unifiedAuth.expiresAt > Date.now()) {
          token = unifiedAuth.token;
          console.log(`[apiRequest] Using unified auth token: ${token?.substring(0, 20)}...`);
        } else if (unifiedAuth.expiresAt <= Date.now()) {
          console.warn('[apiRequest] Unified auth token expired, clearing storage');
          sessionStorage.removeItem('gokul_unified_auth');
          localStorage.removeItem('gokul_unified_auth');
        }
      } catch (e) {
        console.warn('[apiRequest] Failed to parse unified auth data:', e);
        // Clear corrupted data
        sessionStorage.removeItem('gokul_unified_auth');
        localStorage.removeItem('gokul_unified_auth');
      }
    }
    
    // 2. Fallback to legacy storage (for compatibility)
    if (!token) {
      token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
      if (token) {
        console.log(`[apiRequest] Using legacy auth token: ${token?.substring(0, 20)}...`);
      }
    }
    
    // 3. Check for POS authentication (for in-store system)
    if (!token) {
      const posToken = localStorage.getItem('pos_auth_token');
      if (posToken) {
        token = posToken;
        console.log(`[apiRequest] Using POS auth token: ${token?.substring(0, 20)}...`);
      }
    }
    
    // 4. Check structured auth data with expiration (backup method)
    if (!token) {
      const authDataStr = sessionStorage.getItem('gokul_auth_data') || localStorage.getItem('gokul_auth_data');
      if (authDataStr) {
        try {
          const authData = JSON.parse(authDataStr);
          if (authData.token && authData.expiresAt > Date.now()) {
            token = authData.token;
            console.log(`[apiRequest] Using structured auth token: ${token?.substring(0, 20)}...`);
          } else if (authData.expiresAt <= Date.now()) {
            console.warn('[apiRequest] Structured auth token expired, clearing storage');
            sessionStorage.removeItem('gokul_auth_data');
            localStorage.removeItem('gokul_auth_data');
          }
        } catch (e) {
          console.warn('[apiRequest] Failed to parse auth data:', e);
          sessionStorage.removeItem('gokul_auth_data');
          localStorage.removeItem('gokul_auth_data');
        }
      }
    }
    
    // Debug token retrieval
    if (!token) {
      console.warn('[apiRequest] ⚠️ No authentication token found in any storage location');
      console.log('[apiRequest] Storage check results:');
      console.log('- unified auth (session):', !!sessionStorage.getItem('gokul_unified_auth'));
      console.log('- unified auth (local):', !!localStorage.getItem('gokul_unified_auth'));
      console.log('- legacy token (session):', !!sessionStorage.getItem('authToken'));
      console.log('- legacy token (local):', !!localStorage.getItem('authToken'));
      console.log('- structured auth (session):', !!sessionStorage.getItem('gokul_auth_data'));
      console.log('- structured auth (local):', !!localStorage.getItem('gokul_auth_data'));
    } else {
      console.log(`[apiRequest] ✅ Token found and will be sent: ${token.substring(0, 20)}...`);
    }
    
    // Add token to headers with proper format
    if (token && token.length > 0) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-auth-token'] = token;
      
      console.log(`[apiRequest] ✅ Auth token added for ${method} ${url} (${token.substring(0, 20)}...)`);
    } else {
      console.warn('[apiRequest] ⚠️ No authentication token available - request may fail with 401');
    }
  } catch (error) {
    console.error('[apiRequest] Authentication retrieval failed:', error);
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  console.log(`[apiRequest] Response status: ${res.status} ${res.statusText}`);
  
  // Enhanced 401 error handling with detailed logging
  if (res.status === 401) {
    console.error('[apiRequest] 401 Unauthorized - Authentication failed');
    console.log('[apiRequest] Request headers:', headers);
    throw new Error('401: Unauthorized - Authentication required');
  }

  await throwIfResNotOk(res);
  
  const responseData = await res.json();
  console.log(`[apiRequest] Success response received for ${method} ${url}`);
  return responseData;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Enhanced auth headers consistent with apiRequest function
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    
    // Multi-location token retrieval matching apiRequest logic
    let token: string | null = null;
    
    // 1. Check unified auth system first (primary method)
    const unifiedAuthStr = sessionStorage.getItem('gokul_unified_auth') || localStorage.getItem('gokul_unified_auth');
    if (unifiedAuthStr) {
      try {
        const unifiedAuth = JSON.parse(unifiedAuthStr);
        if (unifiedAuth.token && unifiedAuth.expiresAt > Date.now()) {
          token = unifiedAuth.token;
        } else if (unifiedAuth.expiresAt <= Date.now()) {
          console.warn('[queryFn] Unified auth token expired, clearing storage');
          sessionStorage.removeItem('gokul_unified_auth');
          localStorage.removeItem('gokul_unified_auth');
        }
      } catch (e) {
        console.warn('[queryFn] Failed to parse unified auth data:', e);
        sessionStorage.removeItem('gokul_unified_auth');
        localStorage.removeItem('gokul_unified_auth');
      }
    }
    
    // 2. Fallback to legacy storage (for compatibility)
    if (!token) {
      token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
    }
    
    // 3. Check for POS authentication (for in-store system)
    if (!token) {
      const posToken = localStorage.getItem('pos_auth_token');
      if (posToken) {
        token = posToken;
        console.log(`[queryFn] Using POS auth token: ${token?.substring(0, 20)}...`);
      }
    }
    
    // 4. Check structured auth data with expiration
    if (!token) {
      const authDataStr = sessionStorage.getItem('gokul_auth_data') || localStorage.getItem('gokul_auth_data');
      if (authDataStr) {
        try {
          const authData = JSON.parse(authDataStr);
          if (authData.token && authData.expiresAt > Date.now()) {
            token = authData.token;
          } else if (authData.expiresAt <= Date.now()) {
            console.warn('[queryFn] Structured auth token expired, clearing storage');
            sessionStorage.removeItem('gokul_auth_data');
            localStorage.removeItem('gokul_auth_data');
          }
        } catch (e) {
          console.warn('[queryFn] Failed to parse auth data:', e);
          sessionStorage.removeItem('gokul_auth_data');
          localStorage.removeItem('gokul_auth_data');
        }
      }
    }
    
    // Send token in multiple header formats for maximum compatibility
    if (token && token.length > 0) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-auth-token'] = token;
      console.log(`[queryFn] Added auth headers for ${queryKey[0]} with token: ${token.substring(0, 20)}...`);
    } else {
      console.warn(`[queryFn] No authentication token found for ${queryKey[0]}`);
    }
    
    const res = await fetch(queryKey[0] as string, {
      method: 'GET',
      credentials: "include",
      headers
    });

    console.log(`[queryFn] Response status for ${queryKey[0]}: ${res.status}`);

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      console.warn(`[queryFn] 401 Unauthorized for ${queryKey[0]} - returning null`);
      return null;
    }

    if (res.status === 401) {
      console.error(`[queryFn] 401 Unauthorized for ${queryKey[0]} - clearing auth data`);
      
      // Check if we're in POS context before clearing tokens
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/instore')) {
        console.warn('[queryFn] 401 in POS context - redirecting to POS login');
        localStorage.removeItem('pos_auth_token');
        window.location.href = '/instore/login';
      } else {
        // Clear main app auth storage
        sessionStorage.removeItem('gokul_unified_auth');
        localStorage.removeItem('gokul_unified_auth');
        sessionStorage.removeItem('authToken');
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('gokul_auth_data');
        localStorage.removeItem('gokul_auth_data');
        
        // Import and call redirect function
        try {
          const { forceLoginRedirect } = await import('../utils/authSync');
          forceLoginRedirect();
        } catch (e) {
          console.warn('[queryFn] Could not import authSync, falling back to direct redirect');
          window.location.href = '/';
        }
      }
      
      throw new Error(`401: Unauthorized`);
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 60000, // 1 minute
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
