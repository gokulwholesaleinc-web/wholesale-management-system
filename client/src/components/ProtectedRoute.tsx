import { ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // If still loading, show a loading indicator
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // If not authenticated, redirect to main page
  if (!isAuthenticated) {
    // Use setTimeout to avoid React state update during render
    setTimeout(() => {
      setLocation('/');
    }, 100);
    
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-muted-foreground">Redirecting to login...</p>
      </div>
    );
  }

  // If authenticated, render the children
  return <>{children}</>;
}