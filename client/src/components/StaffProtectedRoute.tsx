import React, { useEffect } from 'react';
import { Redirect, useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface StaffProtectedRouteProps {
  component: React.ComponentType<any>;
}

export const StaffProtectedRoute: React.FC<StaffProtectedRouteProps> = ({ component: Component }) => {
  const { user, isLoading, isAuthenticated, isAdmin, isEmployee } = useAuth();
  const [location, setLocation] = useLocation();
  
  // Handle staff permission check
  const isUserStaff = !!(
    user?.isAdmin || user?.is_admin || user?.isEmployee || user?.is_employee || 
    isAdmin || isEmployee
  );
  
  // Log for debugging
  useEffect(() => {
    console.log('StaffProtectedRoute - User staff status:', isUserStaff);
    console.log('Current path:', location);
    console.log('Auth state:', { isAuthenticated, isAdmin, isEmployee });
    console.log('User:', user?.username, 'ID:', user?.id);
  }, [location, isUserStaff, isAuthenticated, user]);
  
  // Show loading spinner while auth state is being determined
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  // Redirect to main page if not authenticated
  if (!isAuthenticated) {
    console.log('User not authenticated, redirecting to main page');
    // Store the current path so we can redirect back after login
    localStorage.setItem('redirectAfterLogin', window.location.pathname);
    return <Redirect to="/" />;
  }
  
  // Redirect to dashboard if authenticated but not staff (employee or admin)
  if (!isUserStaff) {
    console.log('User authenticated but not staff, redirecting to home');
    return <Redirect to="/" />;
  }
  
  // If authenticated and has staff permission, render the protected component
  console.log('User authenticated and is staff, rendering protected component');
  return <Component />;
};