import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export interface User {
  id: string;
  username: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  company?: string;
  isAdmin?: boolean;
  isEmployee?: boolean;
  is_admin?: boolean; // Support snake_case from server
  is_employee?: boolean; // Support snake_case from server
  customerLevel?: number;
  createdAt?: string;
  updatedAt?: string;
}

function getStoredAuthData() {
  try {
    // Check unified auth system first
    const unifiedAuthStr = sessionStorage.getItem('gokul_unified_auth') || localStorage.getItem('gokul_unified_auth');
    if (unifiedAuthStr) {
      try {
        const unifiedAuth = JSON.parse(unifiedAuthStr);
        if (unifiedAuth.token && unifiedAuth.expiresAt > Date.now()) {
          return unifiedAuth;
        } else {
          // Clear expired unified auth
          sessionStorage.removeItem('gokul_unified_auth');
          localStorage.removeItem('gokul_unified_auth');
        }
      } catch (e) {
        // Clear corrupted unified auth
        sessionStorage.removeItem('gokul_unified_auth');
        localStorage.removeItem('gokul_unified_auth');
      }
    }

    // Check legacy gokul_auth_data
    let authData = sessionStorage.getItem('gokul_auth_data');
    
    if (!authData) {
      authData = localStorage.getItem('gokul_auth_data');
      if (authData) {
        sessionStorage.setItem('gokul_auth_data', authData);
        const token = localStorage.getItem('authToken');
        if (token) {
          sessionStorage.setItem('authToken', token);
        }
      }
    }
    
    if (authData) {
      const parsed = JSON.parse(authData);
      
      // Check expiration if available
      if (parsed.expiresAt && Date.now() > parsed.expiresAt) {
        console.log('[Auth] Token expired, clearing all auth data');
        sessionStorage.removeItem('gokul_auth_data');
        sessionStorage.removeItem('authToken');
        localStorage.removeItem('gokul_auth_data');
        localStorage.removeItem('authToken');
        return null;
      }
      return parsed;
    }

    // Fallback to basic token/userData storage
    const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
    const userData = sessionStorage.getItem('userData') || localStorage.getItem('userData');
    
    if (token && userData) {
      try {
        const user = JSON.parse(userData);
        return { token, userData: user };
      } catch (e) {
        console.error('Error parsing legacy userData:', e);
      }
    }
  } catch (e) {
    console.error('Error parsing auth data:', e);
  }
  return null;
}

function hasValidToken() {
  const token = sessionStorage.getItem('authToken') || localStorage.getItem('authToken');
  const authData = getStoredAuthData();
  return !!(token && authData);
}

export function useAuth() {
  const [authData, setAuthData] = useState<any>(() => getStoredAuthData());
  
  // Listen for authentication changes
  useEffect(() => {
    const handleAuthChange = () => {
      setAuthData(getStoredAuthData());
    };

    window.addEventListener('authStateChanged', handleAuthChange);
    return () => window.removeEventListener('authStateChanged', handleAuthChange);
  }, []);

  // Only fetch from server if we have a token but no local user data
  const { data: serverUser, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled: hasValidToken() && !authData?.userData,
  });

  const user = authData?.userData || serverUser;
  const isAuthenticated = hasValidToken() && !!user;
  
  return {
    user,
    isLoading: isLoading && !authData?.userData,
    isAuthenticated,
    isAdmin: user?.isAdmin || user?.is_admin || false,
    isEmployee: user?.isEmployee || user?.is_employee || false,
    isStaff: (user?.isAdmin || user?.is_admin || user?.isEmployee || user?.is_employee) || false,
    customerLevel: user?.customerLevel || 0
  };
}
