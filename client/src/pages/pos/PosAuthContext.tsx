import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@/hooks/use-toast';

interface PosUser {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
  isEmployee: boolean;
  role: string;
}

interface PosAuthContextType {
  user: PosUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (userData: PosUser, posToken: string) => void;
  logout: () => void;
}

interface LoginCredentials {
  username: string;
  password: string;
  instoreCode: string;
}

export const PosAuthContext = createContext<PosAuthContextType | null>(null);

export const usePosAuth = () => {
  const context = useContext(PosAuthContext);
  if (!context) {
    throw new Error('usePosAuth must be used within PosAuthProvider');
  }
  return context;
};

interface PosAuthProviderProps {
  children: ReactNode;
}

export const PosAuthProvider: React.FC<PosAuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<PosUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Separate POS token storage
  const getPosToken = () => localStorage.getItem('pos_auth_token');
  const setPosToken = (token: string) => localStorage.setItem('pos_auth_token', token);
  const removePosToken = () => localStorage.removeItem('pos_auth_token');

  const verifyPosToken = async (token: string): Promise<PosUser | null> => {
    try {
      const response = await fetch('/api/pos/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Token verification failed');
      }

      const userData = await response.json();
      return userData.user;
    } catch (error) {
      console.error('POS token verification failed:', error);
      return null;
    }
  };

  const login = (userData: PosUser, posToken: string, mainToken?: string) => {
    try {
      setPosToken(posToken);
      setUser(userData);
      
      // UNIFIED AUTH FIX: Also set main app token for API calls
      if (mainToken) {
        localStorage.setItem('authToken', mainToken);
        console.log('✅ Set main auth token for POS API calls');
      }
      
      console.log('✅ POS user authenticated:', userData.username);
      
      toast({
        title: "POS Login Successful",
        description: `Welcome ${userData.firstName || userData.username}`,
      });
    } catch (error: any) {
      console.error('POS login error:', error);
      toast({
        title: "Login Failed", 
        description: "Failed to complete POS authentication",
        variant: "destructive"
      });
    }
  };

  const logout = () => {
    try {
      removePosToken();
      setUser(null);
      
      // Clear any POS-specific session data
      sessionStorage.removeItem('pos_session');
      sessionStorage.removeItem('pos_cart');
      sessionStorage.removeItem('pos_customer');
      
      toast({
        title: "Logged Out",
        description: "POS session ended successfully",
      });
    } catch (error) {
      console.error('POS logout error:', error);
    }
  };

  // Initialize authentication on mount
  useEffect(() => {
    console.log('🏪 Initializing POS authentication system...');
    
    const initializeAuth = async () => {
      try {
        const token = getPosToken();
        if (token) {
          console.log('🔑 Found existing POS token, verifying...');
          const userData = await verifyPosToken(token);
          if (userData) {
            console.log('✅ POS token verified, user authenticated:', userData.username);
            setUser(userData);
          } else {
            console.log('❌ POS token invalid, removing...');
            removePosToken();
          }
        } else {
          console.log('🔓 No POS token found, user needs to login');
        }
      } catch (error) {
        console.error('❌ POS auth initialization error:', error);
        removePosToken();
      } finally {
        setIsLoading(false);
        console.log('🏪 POS authentication initialization complete');
      }
    };

    initializeAuth();
  }, []);

  const value: PosAuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  };

  return (
    <PosAuthContext.Provider value={value}>
      {children}
    </PosAuthContext.Provider>
  );
};