import React, { useState, useEffect } from 'react';
import { Route, Switch, useLocation, useRoute } from 'wouter';
import { PosLogin } from './PosLogin';
import { PosDashboard } from './PosDashboard';
import { EnhancedPosSale } from './EnhancedPosSale';
import { PosInventory } from './PosInventory';
import { PosCustomers } from './PosCustomers';
import PosReports from './PosReports';
import HardwareTestPage from './HardwareTestPage';
// import { usePosAuth } from './PosAuthContext'; // Will integrate proper auth later

// Professional POS theme colors inspired by RMS/RMH
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

export const PosApp: React.FC = () => {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/instore/:page?');
  // Check for POS authentication
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  useEffect(() => {
    // Check if user has valid POS session/token
    const posToken = localStorage.getItem('pos_auth_token');
    const posSession = localStorage.getItem('pos_session');
    
    if (posToken && posSession) {
      // Validate the token with backend
      fetch('/api/pos/validate-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${posToken}`
        },
        body: JSON.stringify({ session: posSession })
      })
      .then(response => response.json())
      .then(data => {
        if (data.valid) {
          setIsAuthenticated(true);
        } else {
          // Clear invalid tokens
          localStorage.removeItem('pos_auth_token');
          localStorage.removeItem('pos_session');
        }
      })
      .catch(() => {
        // Clear tokens on error
        localStorage.removeItem('pos_auth_token');
        localStorage.removeItem('pos_session');
      });
    }
  }, []);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize POS system with small delay
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);

  // Handle redirects and default routing
  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        setLocation('/instore/login');
      } else if (!params?.page || params.page === '') {
        setLocation('/instore/dashboard');
      }
    }
  }, [isAuthenticated, isLoading, params]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg">
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-lg font-medium text-gray-700">Initializing POS System...</span>
          </div>
        </div>
      </div>
    );
  }

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
    setLocation('/instore/dashboard');
  };

  if (!isAuthenticated) {
    return <PosLogin onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div 
      className="min-h-screen"
      style={{ 
        backgroundColor: POS_THEME.background,
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}
    >
      <Switch>
        <Route path="/instore/login" component={() => <PosLogin onLoginSuccess={handleLoginSuccess} />} />
        <Route path="/instore/dashboard" component={PosDashboard} />
        <Route path="/instore/sale" component={EnhancedPosSale} />
        <Route path="/instore/inventory" component={PosInventory} />
        <Route path="/instore/customers" component={PosCustomers} />
        <Route path="/instore/reports" component={PosReports} />
        <Route path="/instore/till" component={() => React.lazy(() => import('./TillManagement'))} />
        <Route path="/instore/hardware-test" component={HardwareTestPage} />
        <Route>
          {/* Default fallback - redirect to dashboard */}
          <PosDashboard />
        </Route>
      </Switch>
    </div>
  );
};

export default PosApp;