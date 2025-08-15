import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Redirect } from 'wouter';
import { Skeleton } from '@/components/ui/skeleton';

interface AdminProtectedRouteProps {
  component: React.ComponentType;
}

export function AdminProtectedRoute({ component: Component }: AdminProtectedRouteProps) {
  const { user, isLoading, isAuthenticated, isAdmin } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="space-y-4">
          <Skeleton className="h-8 w-full max-w-md" />
          <Skeleton className="h-40 w-full" />
          <div className="grid grid-cols-2 gap-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to home page (where login is handled)
  if (!isAuthenticated) {
    return <Redirect to="/" />;
  }

  // If authenticated but not admin, redirect to home page
  if (!isAdmin) {
    return <Redirect to="/" />;
  }

  // If admin, render the requested component
  return <Component />;
}