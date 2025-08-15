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
      if (!user) {
        setLocation('/instore');
        return;
      }

      try {
        const response = await apiRequest('GET', '/api/auth/check-instore-access');
        setHasInstoreAccess(true);
      } catch (error) {
        console.error('Error checking in-store access:', error);
        setHasInstoreAccess(false);
        setLocation('/instore');
      }
    };

    if (!isLoading) {
      verifyInstoreAccess();
    }
  }, [user, isLoading, setLocation]);

  // Show loading while checking authentication and access
  if (isLoading || hasInstoreAccess === null) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Verifying in-store access...</p>
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