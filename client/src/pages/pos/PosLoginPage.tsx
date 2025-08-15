import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { PosLogin } from './PosLogin';

export const PosLoginPage: React.FC = () => {
  const { user } = useAuth();

  const handleLoginSuccess = () => {
    // Authentication already handled by main auth system
    // Just need to redirect to dashboard
    window.location.href = '/instore/dashboard';
  };

  // If user is already authenticated with proper privileges, redirect
  if (user && (user.isAdmin || user.isEmployee)) {
    window.location.href = '/instore/dashboard';
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <PosLogin onLoginSuccess={handleLoginSuccess} />
      </div>
    </div>
  );
};