import React, { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';

interface AuthProtectedRouteProps {
  component: React.ComponentType<any>;
}

export const AuthProtectedRoute: React.FC<AuthProtectedRouteProps> = ({ component: Component }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const [location] = useLocation();

  useEffect(() => {
    // Only run when auth state stabilizes
    if (isLoading) return;
    
    if (!isAuthenticated) {
      // Check all possible auth storage locations
      const hasMainAuth = sessionStorage.getItem('authToken') || sessionStorage.getItem('gokul_auth_data');
      const hasBackupAuth = localStorage.getItem('_backup_authToken') || localStorage.getItem('_backup_gokul_auth_data');
      
      if (!hasMainAuth && !hasBackupAuth) {
        console.log('No authentication found, redirecting to login');
        // Store current location for redirect after login
        localStorage.setItem('redirectAfterLogin', location);
        window.location.replace('/');
      } else if (!hasMainAuth && hasBackupAuth) {
        console.log('Found backup auth data, triggering restoration');
        window.dispatchEvent(new CustomEvent('authStateChanged'));
      }
    }
  }, [isLoading, isAuthenticated]); // Removed location dependency to prevent infinite loops

  // Show loading spinner while checking auth status or redirecting
  if (isLoading || !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  // If authenticated, render the protected component
  return <Component />;
};