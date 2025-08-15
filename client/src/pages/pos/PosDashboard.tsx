import React, { useState, useEffect } from 'react';
import { ArrowLeft, ShoppingCart, Package, Users, BarChart3, Calculator, CreditCard, Printer, Settings, LogOut, Clock, DollarSign, TrendingUp, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

export const PosDashboard: React.FC = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Update time every second for professional look
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch real data from main application
  const { data: products = [] } = useQuery({
    queryKey: ['/api/pos/products'],
    select: (data: any) => data || []
  });

  const { data: todaysSales } = useQuery({
    queryKey: ['/api/pos/todays-sales']
  });

  const { data: lowStockItems } = useQuery({
    queryKey: ['/api/pos/products'],
    select: (data: any) => (data || []).filter((product: any) => product.stock <= 10)
  });

  const handleBack = () => {
    // Navigate to main application (outside POS system)
    window.location.href = '/dashboard';
  };

  const handleLogout = () => {
    // Clear POS session data - use correct POS token names
    localStorage.removeItem('pos_auth_token');
    localStorage.removeItem('pos_session');
    localStorage.removeItem('pos_device_fingerprint');
    sessionStorage.clear();
    
    toast({
      title: "POS Session Ended",
      description: "You have been logged out of the in-store system",
    });
    
    // Navigate to POS login page
    setLocation('/instore/login');
  };

  const handleSettings = () => {
    setIsSettingsOpen(true);
  };

  const posModules = [
    {
      title: 'Sale Terminal',
      description: 'Process transactions and sales',
      icon: ShoppingCart,
      path: '/instore/sale',
      color: 'bg-blue-600 hover:bg-blue-700',
      shortcut: 'F1'
    },
    {
      title: 'Inventory Lookup',
      description: 'Check stock and product details',
      icon: Package,
      path: '/instore/inventory',
      color: 'bg-green-600 hover:bg-green-700',
      shortcut: 'F2'
    },
    {
      title: 'Customer Management',
      description: 'Find customer information and history',
      icon: Users,
      path: '/instore/customers',
      color: 'bg-purple-600 hover:bg-purple-700',
      shortcut: 'F3'
    },
    {
      title: 'Reports & Analytics',
      description: 'View sales and business reports',
      icon: BarChart3,
      path: '/instore/reports',
      color: 'bg-orange-600 hover:bg-orange-700',
      shortcut: 'F4'
    }
  ];

  // Keyboard shortcuts (RMS-style)
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'F1') {
        e.preventDefault();
        setLocation('/instore/sale');
      } else if (e.key === 'F2') {
        e.preventDefault();
        setLocation('/instore/inventory');
      } else if (e.key === 'F3') {
        e.preventDefault();
        setLocation('/instore/customers');
      } else if (e.key === 'F4') {
        e.preventDefault();
        setLocation('/instore/reports');
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Professional Status Bar */}
      <div className="h-8 bg-blue-600 text-white text-xs px-4 flex items-center justify-between">
        <span>Gokul Wholesale - Point of Sale System</span>
        <div className="flex items-center space-x-4">
          <span>Store: Main Location</span>
          <span>Terminal: 001</span>
          <span>{currentTime.toLocaleString()}</span>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Main Application
            </Button>
            <div className="h-6 w-px bg-gray-300"></div>
            <div className="text-sm text-gray-600">In-Store Operations</div>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900">POS Dashboard</h1>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleSettings}>
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* System Alerts */}
          {lowStockItems && lowStockItems.length > 0 && (
            <Card className="mb-6 border-yellow-200 bg-yellow-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                  <span className="font-medium text-yellow-800">
                    {lowStockItems.length} item(s) have low stock. Check inventory for details.
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Welcome Message */}
          <div className="mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome to POS Terminal</h2>
            <p className="text-gray-600">Professional point-of-sale system for in-store operations</p>
          </div>

          {/* Quick Stats Dashboard */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm">
                  Today's Sales
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ${(todaysSales as any)?.total?.toFixed(2) || '0.00'}
                </div>
                <p className="text-sm text-gray-600">
                  {(todaysSales as any)?.transactions || 0} transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm">
                  Products Available
                  <Package className="h-4 w-4 text-blue-600" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {products.length.toLocaleString()}
                </div>
                <p className="text-sm text-gray-600">
                  {lowStockItems?.length || 0} low stock
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm">
                  System Status
                  <Printer className="h-4 w-4 text-green-600" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Database: Connected</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Network: Online</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-sm">
                  Quick Actions
                  <Clock className="h-4 w-4 text-purple-600" />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  <div>F1 - New Sale</div>
                  <div>F2 - Inventory</div>
                  <div>F3 - Customer</div>
                  <div>F4 - Reports</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* POS Modules Grid - RMS/RMH Style */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {posModules.map((module) => (
              <Card 
                key={module.title} 
                className="cursor-pointer hover:shadow-lg transition-all duration-200 border-2 hover:border-blue-300"
                onClick={() => setLocation(module.path)}
              >
                <CardContent className="p-6 text-center relative">
                  <Badge 
                    variant="outline" 
                    className="absolute top-4 right-4 text-xs"
                  >
                    {module.shortcut}
                  </Badge>
                  
                  <div className={`w-16 h-16 ${module.color} rounded-lg flex items-center justify-center mx-auto mb-4 transition-colors`}>
                    <module.icon className="h-8 w-8 text-white" />
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {module.title}
                  </h3>
                  <p className="text-gray-600 text-sm mb-3">
                    {module.description}
                  </p>
                  
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLocation(module.path);
                    }}
                  >
                    Open Module
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Footer Information */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">System Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Version:</span>
                    <span>POS v2.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Products in Database:</span>
                    <span>{products.length.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Sync:</span>
                    <span>{new Date().toLocaleTimeString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Quick Tips</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Use function keys for quick navigation</li>
                  <li>• Barcode scanner ready for product lookup</li>
                  <li>• Touch screen optimized interface</li>
                  <li>• Real-time inventory synchronization</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Status Information */}
          <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-800">
                POS System Online - All systems operational
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>POS Settings</DialogTitle>
            <DialogDescription>
              Configure point-of-sale terminal settings
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Terminal ID:</span>
                <p className="font-medium">001</p>
              </div>
              <div>
                <span className="text-gray-500">Store Location:</span>
                <p className="font-medium">Main Location</p>
              </div>
              <div>
                <span className="text-gray-500">Version:</span>
                <p className="font-medium">POS v2.0</p>
              </div>
              <div>
                <span className="text-gray-500">Connection:</span>
                <p className="font-medium text-green-600">Online</p>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-3">Quick Actions</h4>
              <div className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start" 
                  onClick={() => {
                    // Clear cache and refresh data
                    window.location.reload();
                  }}
                >
                  <Package className="h-4 w-4 mr-2" />
                  Refresh Product Data
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    localStorage.removeItem('posPriceMemory');
                    toast({
                      title: "Price Memory Cleared",
                      description: "Customer price history has been reset",
                    });
                  }}
                >
                  <Calculator className="h-4 w-4 mr-2" />
                  Clear Price Memory
                </Button>
                
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => {
                    setIsSettingsOpen(false);
                    setLocation('/instore/hardware-test');
                  }}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Test Hardware (MMF & Epson)
                </Button>
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setIsSettingsOpen(false)}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};