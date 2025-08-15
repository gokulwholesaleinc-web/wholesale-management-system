import React from 'react';
import { useLocation, useRoute } from 'wouter';
import { PosLogin } from './PosLogin';
import { PosDashboard } from './PosDashboard';
import { EnhancedPosSale } from './EnhancedPosSale';
import { PosInventory } from './PosInventory';
import { PosCustomers } from './PosCustomers';
import PosReports from './PosReports';
import HardwareTestPage from './HardwareTestPage';
import { PosAuthProvider, usePosAuth } from './PosAuthContext';
import { QueryClientProvider } from '@tanstack/react-query';
import posQueryClient from '@/lib/posQueryClient';

// Professional POS theme colors
const POS_THEME = {
  primary: '#2563eb', // Professional blue
  secondary: '#64748b', // Neutral gray
  success: '#16a34a', // Green for success states
  warning: '#d97706', // Orange for warnings
  danger: '#dc2626', // Red for errors
  background: '#f8fafc', // Light background
  surface: '#ffffff', // White surface
  text: '#1e293b', // Dark text
  border: '#e2e8f0' // Light border
};

// Internal POS Router - handles routing within POS system
const PosRouter: React.FC = () => {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/instore/:page?');
  const { user, isAuthenticated, isLoading } = usePosAuth();

  // Handle routing logic
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            <span className="text-gray-600 font-medium">Initializing POS System...</span>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <PosLogin onLoginSuccess={() => setLocation('/instore/dashboard')} />;
  }

  // Get current page from URL params
  const currentPage = params?.page || 'dashboard';

  // Render appropriate page component based on route
  const renderPage = () => {
    switch (currentPage) {
      case 'login':
        return <PosLogin onLoginSuccess={() => setLocation('/instore/dashboard')} />;
      case 'dashboard':
        return <PosDashboard />;
      case 'sale':
      case 'sales':
        return <EnhancedPosSale />;
      case 'inventory':
        return <PosInventory />;
      case 'customers':
        return <PosCustomers />;
      case 'reports':
        return <PosReports />;
      case 'hardware':
        return <HardwareTestPage />;
      default:
        // Redirect unknown routes to dashboard
        setLocation('/instore/dashboard');
        return <PosDashboard />;
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: POS_THEME.background }}>
      {renderPage()}
    </div>
  );
};

// Main POS App with proper authentication and query client providers
export const PosApp: React.FC = () => {
  return (
    <QueryClientProvider client={posQueryClient}>
      <PosAuthProvider>
        <PosRouter />
      </PosAuthProvider>
    </QueryClientProvider>
  );
};

export default PosApp;