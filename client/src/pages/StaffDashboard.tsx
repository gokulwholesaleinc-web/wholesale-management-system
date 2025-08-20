import React from 'react';
import { Link } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, Image, DollarSign, Package, Settings, ShoppingBag, Activity, PlusCircle, FileText, Calculator, Users, CreditCard, TrendingUp, Download } from 'lucide-react';
// Logo removed during cleanup - using text instead
import { PageHeader } from "@/components/ui/page-header";
import { BreadcrumbNavigation } from "@/components/navigation/BreadcrumbNavigation";

export default function StaffDashboard() {
  const { user, isLoading } = useAuth();
  
  // Redirect if not staff (employee or admin) - check both naming conventions
  const isUserStaff = !!(user?.isAdmin || user?.is_admin || user?.isEmployee || user?.is_employee);
  const isAdmin = !!(user?.isAdmin || user?.is_admin);
  console.log('Staff Dashboard - User staff status:', isUserStaff, 'User:', user?.username);
  console.log('Admin check:', { isAdmin, userIsAdmin: user?.isAdmin, userIs_admin: user?.is_admin, fullUser: user });
  
  if (!isLoading && !isUserStaff) {
    console.log('Redirecting non-staff user away from staff dashboard');
    return (
      <AppLayout title="Unauthorized">
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-center mb-2">Staff Access Required</h1>
          <p className="text-gray-600 text-center mb-6">You need staff privileges to access this page.</p>
          <Button asChild>
            <Link href="/">Return to Dashboard</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Staff Dashboard">
      <div className="container px-2 sm:px-4 py-4 sm:py-6 mx-auto max-w-7xl">
        <PageHeader title="Staff Dashboard">
          <span className="text-xl font-bold text-blue-600">Gokul Wholesale</span>
        </PageHeader>
        
        <div className="mb-6">
          <p className="text-gray-600">Manage orders, products, and customer service</p>
        </div>
        
        <Tabs defaultValue="orders" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8">
            <TabsTrigger value="orders">Order Management</TabsTrigger>
            <TabsTrigger value="products">Products Management</TabsTrigger>
            <TabsTrigger value="customers">Customer Service</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>
          
          <TabsContent value="orders" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Order Management Card */}
              <Card className="border-2 border-green-200">
                <CardHeader className="bg-green-50 rounded-t-lg">
                  <CardTitle className="flex items-center">
                    <ShoppingBag className="w-5 h-5 mr-2" />
                    Order Management
                  </CardTitle>
                  <CardDescription>
                    View and manage customer orders
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Monitor order status, add notes, and update order information for customers.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full h-auto p-4 bg-blue-600 hover:bg-blue-700 text-white font-medium text-base">
                    <Link href="/staff/orders">
                      <ShoppingBag className="w-5 h-5 mr-2" />
                      Manage Orders
                    </Link>
                  </Button>
                </CardFooter>
              </Card>

              {/* POS System Card - Now handles all order creation */}
              <Card className="border-2 border-indigo-200">
                <CardHeader className="bg-indigo-50 rounded-t-lg">
                  <CardTitle className="flex items-center">
                    <Calculator className="w-5 h-5 mr-2" />
                    POS System
                  </CardTitle>
                  <CardDescription>
                    Create orders & handle transactions
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Use the unified POS system to create orders for customers, process payments, and manage transactions.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full h-auto p-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-base">
                    <Link href="/pos">
                      <Calculator className="w-5 h-5 mr-2" />
                      Open POS System
                    </Link>
                  </Button>
                </CardFooter>
              </Card>



              {/* Activity Monitoring Card - Admin Only */}
              {isAdmin ? (
                <Card className="border-2 border-purple-200">
                  <CardHeader className="bg-purple-50 rounded-t-lg">
                    <CardTitle className="flex items-center">
                      <Activity className="w-5 h-5 mr-2" />
                      Activity Monitoring
                    </CardTitle>
                    <CardDescription>
                      Track customer and staff activities
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Monitor order creation, profile changes, and system activities.
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/mobile-activity-logs">
                        <Activity className="w-4 h-4 mr-2" />
                        View Activity Logs
                      </Link>
                    </Button>
                  </CardFooter>
                </Card>
              ) : (
                <div style={{display: 'none'}}>
                  {/* Activity Monitoring hidden for non-admin staff */}
                  <p>Debug: isAdmin={isAdmin.toString()}, user.isAdmin={user?.isAdmin?.toString()}</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="products" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Product Management Card */}
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
                <CardFooter>
                  <Button asChild className="w-full bg-blue-600 hover:bg-blue-700">
                    <Link href="/staff/products">Manage Products</Link>
                  </Button>
                </CardFooter>
              </Card>

              {/* Purchase Orders Management Card */}
              <Card className="border-2 border-orange-200">
                <CardHeader className="bg-orange-50 rounded-t-lg">
                  <CardTitle className="flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Purchase Orders
                  </CardTitle>
                  <CardDescription>
                    Create and manage inventory purchase orders
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-5">
                  <p className="text-sm text-gray-500">
                    Create purchase orders with barcode scanning, update product costs, and generate PDF reports.
                  </p>
                </CardContent>
                <CardFooter className="flex flex-col space-y-2">
                  <Button asChild className="w-full bg-orange-600 hover:bg-orange-700">
                    <Link href="/staff/purchase-orders">Manage Purchase Orders</Link>
                  </Button>
                  <Button asChild className="w-full" variant="outline">
                    <Link href="/admin/ai-invoice-processor">
                      <FileText className="w-4 h-4 mr-2" />
                      AI Invoice Processing
                    </Link>
                  </Button>
                </CardFooter>
              </Card>



              {/* Add New Product Card */}
              <Card className="border-2 border-green-200">
                <CardHeader className="bg-green-50 rounded-t-lg">
                  <CardTitle className="flex items-center">
                    <PlusCircle className="w-5 h-5 mr-2" />
                    Add New Product
                  </CardTitle>
                  <CardDescription>
                    Add products to inventory
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-5">
                  <p className="text-sm text-gray-500">
                    Create new products with details, pricing, categories, and stock levels.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href="/staff/products/add">Add Product</Link>
                  </Button>
                </CardFooter>
              </Card>
              


              {/* Categories Management Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Settings className="w-5 h-5 mr-2" />
                    Categories
                  </CardTitle>
                  <CardDescription>
                    Manage product categories
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">
                    View and organize product categories
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full">
                    <Link href="/staff/products">Manage Categories</Link>
                  </Button>
                </CardFooter>
              </Card>


            </div>
          </TabsContent>
          
          <TabsContent value="customers" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Customer Accounts Card */}
              <Card className="border-2 border-green-200">
                <CardHeader className="bg-green-50 rounded-t-lg">
                  <CardTitle className="flex items-center">
                    <Users className="w-5 h-5 mr-2" />
                    Customer Accounts
                  </CardTitle>
                  <CardDescription>
                    Manage customer registrations and accounts
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Review account requests, approve new customers, and manage customer information.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full h-auto p-4 bg-green-600 hover:bg-green-700 text-white font-medium text-base">
                    <Link href="/admin/account-requests">
                      <Users className="w-5 h-5 mr-2" />
                      Manage Accounts
                    </Link>
                  </Button>
                </CardFooter>
              </Card>

              {/* Credit Management Card */}
              <Card className="border-2 border-yellow-200">
                <CardHeader className="bg-yellow-50 rounded-t-lg">
                  <CardTitle className="flex items-center">
                    <CreditCard className="w-5 h-5 mr-2" />
                    Credit Management
                  </CardTitle>
                  <CardDescription>
                    Monitor customer credit limits and balances
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Track customer credit usage, adjust limits, and manage payment schedules.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full h-auto p-4 bg-yellow-600 hover:bg-yellow-700 text-white font-medium text-base">
                    <Link href="/admin/credit-management">
                      <CreditCard className="w-5 h-5 mr-2" />
                      Credit Management
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Sales Reports Card */}
              <Card className="border-2 border-purple-200">
                <CardHeader className="bg-purple-50 rounded-t-lg">
                  <CardTitle className="flex items-center">
                    <TrendingUp className="w-5 h-5 mr-2" />
                    Sales Reports
                  </CardTitle>
                  <CardDescription>
                    View sales performance and analytics
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Generate detailed sales reports, track performance metrics, and analyze trends.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full h-auto p-4 bg-purple-600 hover:bg-purple-700 text-white font-medium text-base">
                    <Link href="/admin/business-intelligence">
                      <TrendingUp className="w-5 h-5 mr-2" />
                      View Reports
                    </Link>
                  </Button>
                </CardFooter>
              </Card>

              {/* Export Data Card */}
              <Card className="border-2 border-gray-200">
                <CardHeader className="bg-gray-50 rounded-t-lg">
                  <CardTitle className="flex items-center">
                    <Download className="w-5 h-5 mr-2" />
                    Export Data
                  </CardTitle>
                  <CardDescription>
                    Export sales and customer data
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Download Excel reports for sales data, customer information, and inventory levels.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button asChild className="w-full h-auto p-4 bg-gray-600 hover:bg-gray-700 text-white font-medium text-base">
                    <Link href="/admin/export">
                      <Download className="w-5 h-5 mr-2" />
                      Export Data
                    </Link>
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