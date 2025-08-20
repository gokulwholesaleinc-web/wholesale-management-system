import React from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Image, DollarSign, Package, PlusCircle, UserCog, Settings, ShoppingBag, ClipboardList, Activity, TrendingUp, Users, Calendar, Download, Truck, RefreshCw, Upload, FileText, Zap, CheckCircle, XCircle, Clock, Server, Database, Wifi, ShoppingCart, User, CreditCard, Calculator, Shield } from 'lucide-react';


import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { useState, useEffect } from "react";
import gokulLogo from "@assets/IMG_0846.png";
import { PageHeader } from "@/components/ui/page-header";
import { BreadcrumbNavigation } from "@/components/navigation/BreadcrumbNavigation";
import { AdminQuickActions } from "@/components/ui/admin-quick-actions";
import { useUnifiedOrders } from "@/lib/unified-api-registry";


// Utility function to format time ago
function formatTimeAgo(date: string | Date): string {
  const now = new Date();
  const createdAt = new Date(date);
  const diffInMinutes = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 1) return "Just now";
  if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  
  return createdAt.toLocaleDateString();
}

// Quick Cart Management Component - Enhanced cart and draft orders management
function QuickCartManagement({ stats }: { stats: any }) {
  // Fetch active cart items and draft orders data from existing endpoints
  const { data: allUsers = [], isLoading: usersLoading } = useQuery({
    queryKey: ['/api/admin/users'],
    refetchInterval: 60000,
  });

  const { orders: recentOrders = [], isOrdersLoading: ordersLoading } = useUnifiedOrders();

  if (usersLoading || ordersLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
            <div className="w-16 h-6 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  // Filter recent orders and extract useful cart/order insights
  const pendingOrders = (recentOrders as any[]).filter((order: any) => order.status === 'pending').slice(0, 3);
  const recentCustomers = (allUsers as any[]).filter((user: any) => !user.isAdmin && !user.is_admin).slice(0, 3);

  return (
    <div className="space-y-4 max-h-96 overflow-y-auto">
      {/* Pending Orders Section */}
      {pendingOrders.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
            <Clock className="h-4 w-4 mr-1 text-orange-600" />
            Pending Orders ({pendingOrders.length})
          </h4>
          <div className="space-y-2">
            {pendingOrders.map((order: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-2 bg-orange-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <ShoppingCart className="h-4 w-4 text-orange-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">Order #{order.id}</p>
                    <p className="text-xs text-gray-600">
                      {order.customer?.company && (
                        <>
                          {order.customer.company} <br />
                        </>
                      )}
                      {order.customer?.firstName || 'Customer'}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-medium text-orange-600">${order.total?.toFixed(2) || '0.00'}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Customers Section */}
      {recentCustomers.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
            <Users className="h-4 w-4 mr-1 text-blue-600" />
            Recent Customers ({recentCustomers.length})
          </h4>
          <div className="space-y-2">
            {recentCustomers.map((customer: any, index: number) => (
              <div key={index} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {customer.company && (
                        <>
                          {customer.company} <br />
                        </>
                      )}
                      {customer.firstName || customer.username}
                    </p>
                    <p className="text-xs text-gray-600">Level {customer.customerLevel || 1}</p>
                  </div>
                </div>
                <span className="text-xs text-blue-600">Customer</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cart Enhancement Preview */}
      <div className="pt-2 border-t border-gray-200">
        <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-3 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
            <Zap className="h-4 w-4 mr-1 text-purple-600" />
            Enhanced Cart Features
          </h4>
          <div className="space-y-1 text-xs text-gray-600">
            <p>• Draft order auto-save functionality</p>
            <p>• Customer wishlist management</p>
            <p>• AI-powered checkout suggestions</p>
            <p>• Order template system for recurring orders</p>
          </div>
          <p className="text-xs text-purple-600 mt-2 font-medium">Implementation in progress...</p>
        </div>
      </div>

      {/* Show message if no data */}
      {pendingOrders.length === 0 && recentCustomers.length === 0 && (
        <div className="text-center py-6 text-gray-500">
          <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No pending orders or recent activity</p>
          <p className="text-xs text-gray-400 mt-1">Enhanced cart features will appear here</p>
        </div>
      )}
    </div>
  );
}

// System Health Metrics Component
function SystemHealthMetrics({ stats }: { stats: any }) {
  const { data: healthData, isLoading } = useQuery({
    queryKey: ['/api/admin/system-health'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
            <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const healthMetrics = [
    {
      name: "Database Performance",
      status: (healthData as any)?.database?.status || "unknown",
      value: `${(healthData as any)?.database?.performance || 0}%`,
      detail: `${(healthData as any)?.database?.responseTime || 0}ms response`,
      icon: Database,
      color: (healthData as any)?.database?.status === 'healthy' ? "green" : 
             (healthData as any)?.database?.status === 'warning' ? "yellow" : "red"
    },
    {
      name: "API Response Time",
      status: (healthData as any)?.api?.status || "unknown",
      value: `${(healthData as any)?.api?.responseTime || 0}ms`,
      detail: "Request processing time",
      icon: Server,
      color: (healthData as any)?.api?.status === 'healthy' ? "green" : 
             (healthData as any)?.api?.status === 'warning' ? "yellow" : "red"
    },
    {
      name: "Cache Hit Rate",
      status: (healthData as any)?.cache?.status || "unknown",
      value: `${(healthData as any)?.cache?.hitRate || 0}%`,
      detail: "Data cache efficiency",
      icon: Wifi,
      color: (healthData as any)?.cache?.status === 'optimal' ? "green" : 
             (healthData as any)?.cache?.status === 'good' ? "yellow" : "red"
    },
    {
      name: "Order Processing",
      status: (healthData as any)?.orders?.status || "unknown",
      value: `${(healthData as any)?.orders?.pendingCount || 0} pending`,
      detail: `Total: ${(healthData as any)?.orders?.totalOrders || 0} orders`,
      icon: Clock,
      color: (healthData as any)?.orders?.status === 'healthy' ? "green" : 
             (healthData as any)?.orders?.status === 'monitoring' ? "yellow" : "red"
    }
  ];

  return (
    <div className="space-y-4">
      {healthMetrics.map((metric, index) => {
        const Icon = metric.icon;
        return (
          <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full ${
                metric.color === 'green' ? 'bg-green-100 text-green-600' :
                metric.color === 'yellow' ? 'bg-yellow-100 text-yellow-600' :
                'bg-red-100 text-red-600'
              }`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{metric.name}</p>
                <div className="flex items-center space-x-2">
                  {metric.color === 'green' && <CheckCircle className="h-3 w-3 text-green-500" />}
                  {metric.color === 'yellow' && <Clock className="h-3 w-3 text-yellow-500" />}
                  {metric.color === 'red' && <XCircle className="h-3 w-3 text-red-500" />}
                  <span className={`text-xs ${
                    metric.color === 'green' ? 'text-green-600' :
                    metric.color === 'yellow' ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {metric.status}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-gray-900">{metric.value}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [minimumOrderAmount, setMinimumOrderAmount] = useState('30');
  
  // Tab state management with localStorage persistence
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('admin_dashboard_tab') || 'statistics';
  });
  
  // Save tab state when it changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    localStorage.setItem('admin_dashboard_tab', value);
  };

  // Fetch current minimum order limit
  const { data: orderSettings } = useQuery({
    queryKey: ['/api/admin/order-settings'],
    enabled: !isLoading && !!user?.isAdmin
  });

  // Update minimum order amount when data loads
  useEffect(() => {
    if ((orderSettings as any)?.minimumOrderAmount) {
      setMinimumOrderAmount((orderSettings as any).minimumOrderAmount.toString());
    }
  }, [orderSettings]);

  // Mutation to update minimum order limit
  const updateMinimumOrderMutation = useMutation({
    mutationFn: async (amount: number) => {
      const token = 
        sessionStorage.getItem('authToken') || 
        sessionStorage.getItem('gokul_auth_token') ||
        JSON.parse(sessionStorage.getItem('gokul_auth_data') || '{}')?.token;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['x-auth-token'] = token;
      }

      const response = await fetch('/api/admin/order-settings', {
        method: 'PUT',
        headers,
        body: JSON.stringify({ 
          minimumOrderAmount: amount,
          deliveryFee: 5.00,
          freeDeliveryThreshold: 100.00
        })
      });

      if (!response.ok) throw new Error('Failed to update minimum order amount');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Settings Updated",
        description: "Minimum order amount has been updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/order-settings'] });
    },
    onError: (error) => {
      console.error('Update error:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update minimum order amount",
        variant: "destructive",
      });
    }
  });

  const handleUpdateMinimumOrder = () => {
    const amount = parseFloat(minimumOrderAmount);
    if (isNaN(amount) || amount < 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid minimum order amount",
        variant: "destructive",
      });
      return;
    }
    updateMinimumOrderMutation.mutate(amount);
  };

  // Refresh stats function for heavy cache
  const refreshStats = () => {
    // Clear admin cache if available
    if ('cacheManager' in window && (window as any).cacheManager) {
      (window as any).cacheManager.clearAdminCache();
    }
    
    // Invalidate TanStack queries for stats
    queryClient.invalidateQueries({ queryKey: ['/api/admin/stats'] });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/order-settings'] });
    
    toast({
      title: "Stats Refreshed",
      description: "Dashboard statistics have been refreshed",
    });
  };

  // Export functions
  const exportInventoryCSV = async () => {
    try {
      const token = 
        sessionStorage.getItem('authToken') || 
        sessionStorage.getItem('gokul_auth_token') ||
        JSON.parse(sessionStorage.getItem('gokul_auth_data') || '{}')?.token;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['x-auth-token'] = token;
      }

      const response = await fetch('/api/admin/export/inventory', { headers });
      if (!response.ok) throw new Error('Failed to export inventory');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: "Inventory data has been exported to CSV",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export inventory data",
        variant: "destructive",
      });
    }
  };

  const exportCustomersCSV = async () => {
    try {
      const token = 
        sessionStorage.getItem('authToken') || 
        sessionStorage.getItem('gokul_auth_token') ||
        JSON.parse(sessionStorage.getItem('gokul_auth_data') || '{}')?.token;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['x-auth-token'] = token;
      }

      const response = await fetch('/api/admin/export/customers', { headers });
      if (!response.ok) throw new Error('Failed to export customers');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `customers-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast({
        title: "Export Successful",
        description: "Customer data has been exported to CSV",
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: "Failed to export customer data",
        variant: "destructive",
      });
    }
  };
  
  // Fetch dashboard statistics
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/stats'],
    queryFn: async () => {
      const token = 
        sessionStorage.getItem('authToken') || 
        sessionStorage.getItem('gokul_auth_token') ||
        JSON.parse(sessionStorage.getItem('gokul_auth_data') || '{}')?.token;
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['x-auth-token'] = token;
      }
      
      const response = await fetch('/api/admin/stats', { headers });
      if (!response.ok) throw new Error('Failed to fetch stats');
      return response.json();
    },
    staleTime: 300000, // Cache for 5 minutes
    enabled: !isLoading && !!user?.isAdmin
  });
  
  // Redirect if not an admin
  if (!isLoading && (!user || !user.isAdmin)) {
    return (
      <AppLayout title="Unauthorized">
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-center mb-2">Admin Access Required</h1>
          <p className="text-gray-600 text-center mb-6">You need administrator privileges to access this page.</p>
          <Button asChild>
            <Link href="/">Return to Dashboard</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Admin Dashboard">
      <div className="container px-2 sm:px-4 py-4 sm:py-6 mx-auto max-w-7xl">
        <PageHeader 
          title="Admin Dashboard"
          description="Manage your wholesale business"
        >
          <div className="flex items-center gap-4">
            <Button 
              onClick={refreshStats}
              variant="outline" 
              size="sm"
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Stats
            </Button>
            <AdminQuickActions variant="dashboard" />
            <img 
              src={gokulLogo} 
              alt="Gokul Wholesale Logo" 
              className="h-8 sm:h-12 object-contain" 
            />
          </div>
        </PageHeader>
        
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-4 gap-2 mb-8 h-auto p-2 bg-gray-100 rounded-lg">
            <TabsTrigger 
              value="statistics" 
              className="text-xs sm:text-sm py-3 px-4 rounded-md border border-transparent data-[state=active]:bg-white data-[state=active]:border-gray-200 data-[state=active]:shadow-sm data-[state=inactive]:hover:bg-gray-50 transition-all duration-200"
            >
              Business Statistics
            </TabsTrigger>
            <TabsTrigger 
              value="products" 
              className="text-xs sm:text-sm py-3 px-4 rounded-md border border-transparent data-[state=active]:bg-white data-[state=active]:border-gray-200 data-[state=active]:shadow-sm data-[state=inactive]:hover:bg-gray-50 transition-all duration-200"
            >
              Products Management
            </TabsTrigger>
            <TabsTrigger 
              value="users" 
              className="text-xs sm:text-sm py-3 px-4 rounded-md border border-transparent data-[state=active]:bg-white data-[state=active]:border-gray-200 data-[state=active]:shadow-sm data-[state=inactive]:hover:bg-gray-50 transition-all duration-200"
            >
              User Management
            </TabsTrigger>
            <TabsTrigger 
              value="reports" 
              className="text-xs sm:text-sm py-3 px-4 rounded-md border border-transparent data-[state=active]:bg-white data-[state=active]:border-gray-200 data-[state=active]:shadow-sm data-[state=inactive]:hover:bg-gray-50 transition-all duration-200"
            >
              Reports & Analytics
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="statistics" className="space-y-6">
            {statsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <>
                {/* Revenue and Orders Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">${stats?.totalRevenue || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        Avg: ${stats?.averageOrderValue || 0} per order
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                      <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        {stats?.recentOrders || 0} in last 7 days
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                      <Package className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.totalProducts || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        {stats?.lowStockProducts || 0} low stock items
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{stats?.totalCustomers || 0}</div>
                      <p className="text-xs text-muted-foreground">
                        {stats?.totalUsers || 0} total users
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Order Status Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <TrendingUp className="w-5 h-5 mr-2" />
                      Order Status Overview
                    </CardTitle>
                    <CardDescription>Current order distribution by status</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center p-4 bg-yellow-50 rounded-lg">
                        <div className="text-2xl font-bold text-yellow-600">{stats?.pendingOrders || 0}</div>
                        <div className="text-sm text-yellow-700">Pending</div>
                      </div>
                      <div className="text-center p-4 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{stats?.processingOrders || 0}</div>
                        <div className="text-sm text-blue-700">Processing</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{stats?.completedOrders || 0}</div>
                        <div className="text-sm text-green-700">Completed</div>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg">
                        <div className="text-2xl font-bold text-red-600">{stats?.cancelledOrders || 0}</div>
                        <div className="text-sm text-red-700">Cancelled</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Order Settings */}
                

                {/* Recent Activity & System Health */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Quick Cart Management */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <ShoppingCart className="w-5 h-5 mr-2" />
                        Cart & Order Management
                      </CardTitle>
                      <CardDescription>Enhanced cart features and order insights</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <QuickCartManagement stats={stats} />
                      </div>
                    </CardContent>
                  </Card>

                  {/* System Health & Performance */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <TrendingUp className="w-5 h-5 mr-2" />
                        System Health & Performance
                      </CardTitle>
                      <CardDescription>Real-time system status and metrics</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <SystemHealthMetrics stats={stats} />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>
          
          <TabsContent value="products" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* All-in-One Product Management Card */}
              <Card className="border-2 border-blue-200">
                <CardHeader className="bg-blue-50 rounded-t-lg">
                  <CardTitle className="flex items-center">
                    <Package className="w-5 h-5 mr-2" />
                    Product Management
                  </CardTitle>
                  <CardDescription>
                    All-in-one product management
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-5">
                  <p className="text-sm text-gray-500">
                    Complete product management dashboard. Edit details, pricing, images, and stock all in one place.
                  </p>
                </CardContent>
                <CardFooter className="flex flex-col space-y-2">
                  <Button asChild className="w-full">
                    <Link href="/admin/products">Manage Products</Link>
                  </Button>
                  <Button 
                    onClick={exportInventoryCSV}
                    variant="outline" 
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Inventory CSV
                  </Button>
                </CardFooter>
              </Card>

              {/* Bulk Operations Card */}
              <Card className="border-2 border-purple-200">
                <CardHeader className="bg-purple-50 rounded-t-lg">
                  <CardTitle className="flex items-center">
                    <Package className="w-5 h-5 mr-2" />
                    Bulk Operations
                  </CardTitle>
                  <CardDescription>
                    Bulk product operations and CSV management
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-5">
                  <p className="text-sm text-gray-500">
                    Efficiently manage multiple products at once. Bulk price updates, stock adjustments, and CSV import/export.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full bg-purple-600 hover:bg-purple-700 text-white">
                    <Link href="/admin/bulk-operations">Bulk Operations Dashboard</Link>
                  </Button>
                </CardFooter>
              </Card>


              
              {/* Purchase Orders Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Truck className="w-5 h-5 mr-2" />
                    Purchase Orders
                  </CardTitle>
                  <CardDescription>
                    Manage inventory procurement and receiving
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">
                    Create, track, and receive purchase orders from suppliers
                  </p>
                </CardContent>
                <CardFooter className="flex flex-col space-y-2">
                  <Button asChild className="w-full">
                    <Link href="/admin/purchase-orders">Manage Purchase Orders</Link>
                  </Button>
                  <Button asChild className="w-full" variant="outline">
                    <Link href="/admin/ai-invoice-processor">
                      <Zap className="w-4 h-4 mr-2" />
                      AI Invoice Processing
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
              
              {/* Inventory & Catalog Management (Consolidated) */}
              <Card className="border-2 border-emerald-200">
                <CardHeader className="bg-emerald-50 rounded-t-lg">
                  <CardTitle className="flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    Inventory & Catalog
                  </CardTitle>
                  <CardDescription>
                    Complete inventory and product catalog management
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-5">
                  <p className="text-sm text-gray-500">
                    Manage product categories, organize inventory, and maintain product catalog organization
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href="/admin/categories">Manage Categories</Link>
                  </Button>
                </CardFooter>
              </Card>

              {/* Tax Management Card */}
              <Card className="border-2 border-red-200">
                <CardHeader className="bg-red-50 rounded-t-lg">
                  <CardTitle className="flex items-center">
                    <Calculator className="w-5 h-5 mr-2" />
                    Tax Management
                  </CardTitle>
                  <CardDescription>
                    Manage IL tobacco taxes & compliance
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-5">
                  <p className="text-sm text-gray-500">
                    Configure flat taxes, tobacco tax rates, IL compliance reporting, and tax calculation audits.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full bg-red-600 hover:bg-red-700 text-white">
                    <Link href="/admin/tax-management">
                      <Calculator className="w-4 h-4 mr-2" />
                      Manage Taxes
                    </Link>
                  </Button>
                </CardFooter>
              </Card>


            </div>
          </TabsContent>
          
          <TabsContent value="users" className="space-y-4" key="users-tab-v3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* User Management Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <UserCog className="w-5 h-5 mr-2" />
                    User Management
                  </CardTitle>
                  <CardDescription>
                    Manage customer accounts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">
                    Add, edit, and manage user accounts and pricing tiers
                  </p>
                </CardContent>
                <CardFooter className="flex flex-col space-y-2">
                  <Button asChild className="w-full">
                    <Link href="/admin/users">Manage Users</Link>
                  </Button>
                  <Button 
                    onClick={exportCustomersCSV}
                    variant="outline" 
                    className="w-full"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Export Customers CSV
                  </Button>
                </CardFooter>
              </Card>
              
              {/* Orders Management Card */}
              <Card className="border-2 border-blue-200">
                <CardHeader className="bg-blue-50 rounded-t-lg">
                  <CardTitle className="flex items-center">
                    <ShoppingBag className="w-5 h-5 mr-2" />
                    Order Management
                  </CardTitle>
                  <CardDescription>
                    Manage customer orders
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-5">
                  <p className="text-sm text-gray-500">
                    View all orders, update order status, mark orders as complete or ready for pickup/delivery
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href="/admin/orders">Manage Orders</Link>
                  </Button>
                </CardFooter>
              </Card>

              {/* Credit Management Card */}
              <Card className="border-2 border-purple-200">
                <CardHeader className="bg-purple-50 rounded-t-lg">
                  <CardTitle className="flex items-center">
                    <CreditCard className="w-5 h-5 mr-2" />
                    Credit Management
                  </CardTitle>
                  <CardDescription>
                    Manage customer credit accounts and limits
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-5">
                  <p className="text-sm text-gray-500">
                    Set credit limits, manage account balances, track payments, and monitor credit utilization across all customer accounts.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href="/admin/credit-management">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Manage Credit Accounts
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>



          <TabsContent value="reports" className="space-y-4">
            {/* Reports & Analytics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Unified Invoice Management Card */}
              <Card className="border-2 border-blue-200">
                <CardHeader className="bg-blue-50 rounded-t-lg">
                  <CardTitle className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Invoice Management
                  </CardTitle>
                  <CardDescription>
                    Complete invoice search, preview, and management system
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-5">
                  <p className="text-sm text-gray-500">
                    Unified system for invoice search, PDF generation, preview, download, and TP#97239 license compliance. Combines management and preview functionality.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href="/admin/invoice-management">
                      <FileText className="w-4 h-4 mr-2" />
                      Manage Invoices
                    </Link>
                  </Button>
                </CardFooter>
              </Card>

              {/* Excel Exports Card */}
              <Card className="border-2 border-green-200">
                <CardHeader className="bg-green-50 rounded-t-lg">
                  <CardTitle className="flex items-center">
                    <Download className="w-5 h-5 mr-2" />
                    Excel Exports
                  </CardTitle>
                  <CardDescription>
                    AI-powered business data exports
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-5">
                  <p className="text-sm text-gray-500">
                    Generate comprehensive Excel reports with AI insights for sales, customers, inventory, and trends.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href="/admin/excel-exports">Generate Reports</Link>
                  </Button>
                </CardFooter>
              </Card>

              {/* Receipt Print Queue Card */}
              <Card className="border-2 border-purple-200">
                <CardHeader className="bg-purple-50 rounded-t-lg">
                  <CardTitle className="flex items-center">
                    <Truck className="w-5 h-5 mr-2" />
                    Print Queue
                  </CardTitle>
                  <CardDescription>
                    Batch receipt and invoice printing
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-5">
                  <p className="text-sm text-gray-500">
                    Manage receipt printing queue for batch printing of receipts, invoices, and shipping labels.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href="/admin/receipt-queue">Manage Print Queue</Link>
                  </Button>
                </CardFooter>
              </Card>

              {/* Business Intelligence Card */}
              <Card className="border-2 border-indigo-200">
                <CardHeader className="bg-indigo-50 rounded-t-lg">
                  <CardTitle className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Business Intelligence
                  </CardTitle>
                  <CardDescription>
                    Advanced analytics & AI insights
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-5">
                  <p className="text-sm text-gray-500">
                    Comprehensive analytics: profit margins, customer LTV, pricing intelligence, sales forecasting, and AI-powered business insights.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white">
                    <Link href="/business-intelligence">
                      <TrendingUp className="w-4 h-4 mr-2" />
                      View Business Intelligence
                    </Link>
                  </Button>
                </CardFooter>
              </Card>



              {/* Activity Logs Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Activity className="w-5 h-5 mr-2" />
                    Activity Logs
                  </CardTitle>
                  <CardDescription>
                    System audit and monitoring
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">
                    Monitor all user activities, system changes, and administrative actions.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href="/admin/activity-logs">View Activity Logs</Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

        </Tabs>
      </div>
    </AppLayout>
  );
}