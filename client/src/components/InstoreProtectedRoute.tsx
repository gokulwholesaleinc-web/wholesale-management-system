import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/queryClient";

interface InstoreProtectedRouteProps {
  component: React.ComponentType;
}

export function InstoreProtectedRoute({ component: Component }: InstoreProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [hasInstoreAccess, setHasInstoreAccess] = useState<boolean | null>(null);

  useEffect(() => {
    const verifyInstoreAccess = async () => {
      // For in-store POS, check staff token instead of regular user auth
      const staffToken = localStorage.getItem('staffToken');
      
      if (!staffToken) {
        // No staff token, redirect to staff login
        setLocation('/staff-login');
        return;
      }

      // Verify the staff token is valid
      try {
        const response = await fetch('/api/staff/auth/verify-token', {
          headers: {
            'Authorization': `Bearer ${staffToken}`
          }
        });
        
        if (response.ok) {
          setHasInstoreAccess(true);
        } else {
          // Token invalid, clear it and redirect to login
          localStorage.removeItem('staffToken');
          localStorage.removeItem('staffUser');
          setHasInstoreAccess(false);
          setLocation('/staff-login');
        }
      } catch (error) {
        console.error('Error verifying staff token:', error);
        setHasInstoreAccess(false);
        setLocation('/staff-login');
      }
    };

    verifyInstoreAccess();
  }, [setLocation]);

  // Show loading while checking authentication and access
  if (hasInstoreAccess === null) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying staff access...</p>
        </div>
      </div>
    );
  }

  // If no access, redirect should have happened in useEffect
  if (!hasInstoreAccess) {
    return null;
  }

  return <Component />;
}