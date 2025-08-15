import { Switch, Route } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { OfflineBanner } from "@/components/OfflineBanner";
import NotFound from "@/pages/not-found";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import Account from "@/pages/Account";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminProductAdd from "@/pages/AdminProductAdd";
import AdminProductManagement from "@/pages/AdminProductManagement";
import AdminOrdersPage from "@/pages/AdminOrdersPage";
// AdminOrderDetailPage removed - using unified OrderDetailPage
import ManageStaffPage from "@/pages/ManageStaffPage";
import StaffDashboard from "@/pages/StaffDashboard";
import StaffCreateOrderPage from "@/pages/StaffCreateOrderPage";
import StaffProductManagement from "@/pages/StaffProductManagement";
import StaffActivityMonitor from "@/pages/StaffActivityMonitor";
// RealActivityLogs removed during cleanup
import Admin from "@/pages/Admin";
import EnhancedUserManagement from "@/pages/EnhancedUserManagement";
import Login from "@/pages/Login";
// Enhanced cart is now a popup component, no dedicated routes needed
import { EnhancedCartPage } from "@/pages/EnhancedCartPage";
// Unified order components
import OrdersPage from "@/pages/OrdersPage";
import OrderDetailPage from "@/pages/OrderDetailPage";
import DeliveryAddresses from "@/pages/DeliveryAddresses";
import CategoryManagementPage from "@/pages/CategoryManagementPage";

import BackupManagement from "@/pages/BackupManagement";

import AdminInvoiceManager from "@/pages/admin/AdminInvoiceManager";
import UnifiedInvoiceManager from "@/pages/admin/UnifiedInvoiceManager";
import AdminExcelExports from "@/pages/admin/AdminExcelExports";
import AdminReceiptQueue from "@/pages/admin/AdminReceiptQueue";

import BulkOperationsPage from "@/pages/admin/BulkOperationsPage";
import AdminCreditManagement from "@/pages/AdminCreditManagement";
import CustomerBalance from "@/pages/CustomerBalance";

import AIInvoiceProcessor from "@/pages/AIInvoiceProcessor";

import AIRecommendationsPage from "@/pages/AIRecommendationsPage";
import BusinessIntelligencePage from "@/pages/BusinessIntelligencePage";
import PublicCatalog from "@/pages/PublicCatalog";
import HomePage from "@/pages/HomePage";
import CreateAccountRequest from "@/pages/CreateAccountRequest";
import AgeVerification from "@/components/AgeVerification";
import PosSystem from "@/pages/PosSystem";
// All order detail pages unified into single OrderDetailPage component
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import LoyaltyRedemptionHistoryPage from "@/pages/LoyaltyRedemptionHistoryPage";
import AdminInvoices from "@/pages/AdminInvoices";
import AdminTaxManagerPage from "@/pages/AdminTaxManagerPage";
import AdminOrderSettings from "@/pages/AdminOrderSettings";
import EnterpriseAdminDashboard from "@/pages/EnterpriseAdminDashboard";
import InStorePOS from "@/pages/pos/InStorePOS";
import InstoreLoginNew from "@/pages/InstoreLoginNew";
import PosApp from "@/pages/pos/PosApp";
import NewOrdersPage from "@/pages/NewOrdersPage";


import { Helmet } from "react-helmet";
// Import the queryClient only - we'll handle CartProvider in a safer way
import { queryClient } from "@/lib/queryClient";
// Import protection components for securing routes
import { AdminProtectedRoute } from "@/components/AdminProtectedRoute";
import { AuthProtectedRoute } from "@/components/AuthProtectedRoute";
import { StaffProtectedRoute } from "@/components/StaffProtectedRoute";
import { InstoreProtectedRoute } from "@/components/InstoreProtectedRoute";
// Import error handling components
import { ErrorBoundary } from "@/components/ui/error-boundary";
// Import auth hook for root route protection
import { useAuth } from "@/hooks/useAuth";
// Import session management utilities
import { initSessionManager } from "@/lib/sessionManager";
// Import enhanced cache management system
import "@/lib/cacheManager";
import { useEffect } from "react";
import { useLocation } from "wouter";
// Import privacy policy context
import { PrivacyPolicyProvider } from "@/contexts/PrivacyPolicyContext";
// Import initial notification opt-in context
import { InitialNotificationOptinProvider } from "@/contexts/InitialNotificationOptinContext";

// Simple auth manager for basic session backup functionality
import { simpleAuthManager } from "@/lib/simpleAuthManager";

// HomeRoute component to handle the root path routing
function HomeRoute() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  // Show loading while checking auth status
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  // If user is authenticated, redirect to dashboard
  if (user) {
    setLocation('/dashboard');
    return null;
  }
  
  // If not authenticated, show the public home page
  return <HomePage />;
}

function App() {
  const { user, isLoading } = useAuth();
  
  // Simplified initialization to prevent React conflicts
  useEffect(() => {
    let mounted = true;
    
    // Clean up any hash fragments that might cause routing issues
    if (window.location.hash) {
      window.history.replaceState({}, '', window.location.pathname);
    }
    
    // Initialize services only once and safely
    const initServices = async () => {
      if (!mounted) return;
      
      try {
        // Initialize production cache manager (automatically starts via import)
        console.log('Production cache management initialized automatically');
        
        // Initialize session management for non-admin users
        const cleanupSessionManager = initSessionManager();
        console.log('Session management initialized');
        
        // Real-time cache management is handled by ProductionCacheManager
        // No service worker needed - using localStorage-based caching
        
        return cleanupSessionManager;
      } catch (error) {
        console.warn('Service initialization error:', error);
        return null;
      }
    };
    
    const cleanup = initServices();
    
    return () => {
      mounted = false;
      cleanup?.then(cleanupFn => cleanupFn?.());
    };
  }, []);
  
  return (
    <>
      <Helmet>
        <title>Gokul Wholesale - Inventory & Orders</title>
        <meta name="description" content="Manage your wholesale orders with our easy-to-use app. Browse products, place orders, and schedule deliveries." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#1e3a8a" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Montserrat:wght@500;600;700&display=swap" rel="stylesheet" />
      </Helmet>
      
      <TooltipProvider>
        <PrivacyPolicyProvider>
          <InitialNotificationOptinProvider>
            <OfflineBanner />
            <Toaster />
            <OfflineIndicator />
          
          <ErrorBoundary>
          <Switch>
          {/* Admin routes need to be defined before regular routes - protected now */}
          <Route path="/admin/products/add">
            <AdminProtectedRoute component={AdminProductAdd} />
          </Route>


          <Route path="/admin/products/inventory">
            <AdminProtectedRoute component={AdminProductManagement} />
          </Route>
          <Route path="/admin/products">
            <AdminProtectedRoute component={AdminProductManagement} />
          </Route>
          <Route path="/admin/categories">
            <AdminProtectedRoute component={CategoryManagementPage} />
          </Route>
          <Route path="/admin/tax-management">
            <AdminProtectedRoute component={AdminTaxManagerPage} />
          </Route>
          <Route path="/admin/order-settings">
            <AdminProtectedRoute component={AdminOrderSettings} />
          </Route>
          <Route path="/admin/enterprise">
            <AdminProtectedRoute component={EnterpriseAdminDashboard} />
          </Route>
          
          {/* Consolidated Admin Routes - Enterprise becomes the main admin interface */}
          <Route path="/admin">
            <AdminProtectedRoute component={EnterpriseAdminDashboard} />
          </Route>

          <Route path="/admin/purchase-orders">
            <AdminProtectedRoute component={AdminProductManagement} />
          </Route>
          <Route path="/admin/ai-invoice-processor">
            <AdminProtectedRoute component={AIInvoiceProcessor} />
          </Route>
          <Route path="/admin/invoice-manager">
            <AdminProtectedRoute component={AdminInvoiceManager} />
          </Route>
          <Route path="/admin/invoice-management">
            <AdminProtectedRoute component={UnifiedInvoiceManager} />
          </Route>
          <Route path="/admin/excel-exports">
            <AdminProtectedRoute component={AdminExcelExports} />
          </Route>
          <Route path="/admin/receipt-queue">
            <AdminProtectedRoute component={AdminReceiptQueue} />
          </Route>
          <Route path="/admin/invoices">
            <AdminProtectedRoute component={AdminInvoices} />
          </Route>
          <Route path="/admin/users">
            <AdminProtectedRoute component={EnhancedUserManagement} />
          </Route>
          <Route path="/admin/staff">
            <AdminProtectedRoute component={ManageStaffPage} />
          </Route>
          {/* Activity logs route removed during cleanup */}


          <Route path="/admin/ai-recommendations">
            <AdminProtectedRoute component={AIRecommendationsPage} />
          </Route>
          <Route path="/business-intelligence">
            <AdminProtectedRoute component={BusinessIntelligencePage} />
          </Route>
          <Route path="/admin/backup">
            <AdminProtectedRoute component={BackupManagement} />
          </Route>
          <Route path="/admin/bulk-operations">
            <AdminProtectedRoute component={BulkOperationsPage} />
          </Route>
          <Route path="/admin/credit-management">
            <AdminProtectedRoute component={AdminCreditManagement} />
          </Route>
          {/* Unified POS System - Consolidating /instore and /pos-direct */}
          <Route path="/instore/:path*">
            <AdminProtectedRoute component={InStorePOS} />
          </Route>
          <Route path="/instore">
            <AdminProtectedRoute component={InStorePOS} />
          </Route>
          <Route path="/pos-direct">
            <AdminProtectedRoute component={InStorePOS} />
          </Route>
          <Route path="/pos">
            <AdminProtectedRoute component={InStorePOS} />
          </Route>
          <Route path="/order-details/:orderId">
            <StaffProtectedRoute component={OrderDetailPage} />
          </Route>
          <Route path="/staff-activity-monitor">
            <AdminProtectedRoute component={StaffActivityMonitor} />
          </Route>
          
          {/* Account Settings Route */}
          <Route path="/account-settings">
            <AuthProtectedRoute component={Account} />
          </Route>
          <Route path="/account">
            <AuthProtectedRoute component={Account} />
          </Route>
          

          
          {/* Staff routes for employees */}
          <Route path="/staff/activity-logs">
            <StaffProtectedRoute component={StaffActivityMonitor} />
          </Route>
          <Route path="/staff/orders/:id">
            <StaffProtectedRoute component={OrderDetailPage} />
          </Route>
          <Route path="/staff/orders">
            <StaffProtectedRoute component={AdminOrdersPage} />
          </Route>



          <Route path="/staff/products">
            <StaffProtectedRoute component={StaffProductManagement} />
          </Route>
          <Route path="/staff/purchase-orders">
            <StaffProtectedRoute component={AdminProductManagement} />
          </Route>
          <Route path="/staff/ai-invoice-processor">
            {/* Staff AI Invoice Processor removed per user request */}
          </Route>
          <Route path="/staff/dashboard">
            <StaffProtectedRoute component={StaffDashboard} />
          </Route>
          <Route path="/staff">
            <StaffProtectedRoute component={StaffDashboard} />
          </Route>
          
          {/* Admin order management routes */}
          <Route path="/admin/orders/:id">
            <AdminProtectedRoute component={OrderDetailPage} />
          </Route>
          <Route path="/admin/orders">
            <AdminProtectedRoute component={AdminOrdersPage} />
          </Route>
          <Route path="/admin/new-orders">
            <AdminProtectedRoute component={NewOrdersPage} />
          </Route>
          
          {/* Public routes */}
          <Route path="/login">
            {(params) => <Login />}
          </Route>
          
          {/* Public catalog route */}
          <Route path="/catalog">
            <PublicCatalog />
          </Route>
          
          {/* Account creation request route */}
          <Route path="/create-account">
            <CreateAccountRequest />
          </Route>
          
          {/* Privacy Policy route */}
          <Route path="/privacy-policy">
            <PrivacyPolicy />
          </Route>
          
          {/* Default route - show dashboard for authenticated users, login for others */}
          <Route path="/">
            {(params) => <HomeRoute />}
          </Route>
          
          {/* Protected regular user routes */}
          <Route path="/dashboard">
            <AuthProtectedRoute component={Dashboard} />
          </Route>
          <Route path="/products">
            <AuthProtectedRoute component={Products} />
          </Route>
          {/* Enhanced cart is now a popup component accessible from anywhere */}
          <Route path="/cart-enhanced">
            <AuthProtectedRoute component={EnhancedCartPage} />
          </Route>
          
          {/* Protected order management for customers */}
          <Route path="/orders/:id">
            <AuthProtectedRoute component={OrderDetailPage} />
          </Route>
          <Route path="/orders">
            <AuthProtectedRoute component={OrdersPage} />
          </Route>
          <Route path="/account/orders">
            <AuthProtectedRoute component={OrdersPage} />
          </Route>
          <Route path="/account/addresses">
            <AuthProtectedRoute component={DeliveryAddresses} />
          </Route>
          <Route path="/account/balance">
            <AuthProtectedRoute component={CustomerBalance} />
          </Route>
          <Route path="/loyalty/history">
            <AuthProtectedRoute component={LoyaltyRedemptionHistoryPage} />
          </Route>
          <Route path="/account">
            <AuthProtectedRoute component={Account} />
          </Route>
          
          {/* 404 catch-all route */}
          <Route path="/:rest*" component={NotFound} />
          </Switch>
        </ErrorBoundary>
          </InitialNotificationOptinProvider>
        </PrivacyPolicyProvider>
      </TooltipProvider>
    </>
  );
}

export default App;
