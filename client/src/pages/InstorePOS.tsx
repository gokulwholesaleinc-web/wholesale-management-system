import React from 'react';
import { useLocation } from 'wouter';

// This component redirects to staff login for authentication
export default function InstorePOS() {
  const [, setLocation] = useLocation();

  React.useEffect(() => {
    // Check if staff is already authenticated
    const staffToken = localStorage.getItem('staffToken');
    
    if (staffToken) {
      // If authenticated, redirect to the POS PWA
      window.location.href = '/instore/app';
    } else {
      // If not authenticated, redirect to staff login
      setLocation('/staff-login');
    }
  }, [setLocation]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Checking Authentication...</p>
        <p className="text-sm text-gray-500 mt-2">Redirecting to login if needed</p>
      </div>
    </div>
  );
}