import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PosLogin } from '../pages/pos/PosLogin';

interface PosProtectedRouteProps {
  children: React.ReactNode;
}

export const PosProtectedRoute: React.FC<PosProtectedRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const isAuthenticated = user && (user.isAdmin || user.isEmployee);

  console.log('🔐 POS Protected Route - Auth status:', isAuthenticated, 'User:', user?.username);

  if (!isAuthenticated) {
    return <PosLogin onLoginSuccess={() => {
      console.log('✅ POS login successful, reloading page...');
      window.location.reload();
    }} />;
  }

  return <>{children}</>;
};