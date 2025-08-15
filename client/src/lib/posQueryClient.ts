import { QueryClient } from '@tanstack/react-query';

// POS-specific query client with separate authentication
export const posQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const url = queryKey[0] as string;
        return posApiRequest(url, { method: 'GET' });
      },
      retry: (failureCount, error) => {
        // Don't retry on authentication errors
        if (error instanceof Error && error.message.includes('401')) {
          return false;
        }
        return failureCount < 3;
      },
      staleTime: 30 * 1000, // 30 seconds
      gcTime: 5 * 60 * 1000, // 5 minutes
    },
    mutations: {
      retry: false,
    },
  },
});

// POS-specific API request function
export async function posApiRequest(
  url: string,
  options: RequestInit = {}
): Promise<any> {
  // Get POS token from localStorage
  const posToken = localStorage.getItem('pos_auth_token');
  
  if (!posToken) {
    throw new Error('401: POS authentication required');
  }

  console.log(`[POS API] ${options.method || 'GET'} ${url} with POS token: ${posToken.substring(0, 20)}...`);

  const config: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${posToken}`,
      ...options.headers,
    },
  };

  // Add body for POST/PUT requests
  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const response = await fetch(url, config);
    
    console.log(`[POS API] Response status for ${url}: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      // Handle POS-specific authentication errors
      if (response.status === 401) {
        console.error('[POS API] Authentication failed - removing POS token');
        localStorage.removeItem('pos_auth_token');
        throw new Error(`401: POS Unauthorized - ${response.statusText}`);
      }
      
      let errorMessage = `${response.status}: ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData.message) {
          errorMessage = `${response.status}: ${errorData.message}`;
        }
      } catch {
        // Use default error message if JSON parsing fails
      }
      
      throw new Error(errorMessage);
    }

    const data = await response.json();
    console.log(`[POS API] Success response received for ${options.method || 'GET'} ${url}`);
    return data;
  } catch (error) {
    console.error(`[POS API] Request failed for ${url}:`, error);
    throw error;
  }
}

// Helper function to check if POS token is valid
export function isPosAuthenticated(): boolean {
  const posToken = localStorage.getItem('pos_auth_token');
  return !!posToken;
}

// Helper function to get current POS user from token (basic parsing)
export function getPosUserFromToken(): { id: string } | null {
  const posToken = localStorage.getItem('pos_auth_token');
  if (!posToken || !posToken.startsWith('pos-')) {
    return null;
  }
  
  try {
    const tokenParts = posToken.split('-');
    if (tokenParts.length < 3) {
      return null;
    }
    
    const userId = tokenParts.slice(1, -1).join('-');
    return { id: userId };
  } catch {
    return null;
  }
}

export default posQueryClient;