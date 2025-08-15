import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Download, 
  Eye, 
  Search, 
  Filter, 
  Calendar,
  DollarSign,
  User,
  Package,
  Receipt,
  Printer,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { generateOrderPDF } from '@/utils/pdfGenerator';
import { PageHeader } from '@/components/ui/page-header';

import PrinterControls from '@/components/pos/PrinterControls';

export default function AdminInvoices() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State management
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [previewMode, setPreviewMode] = useState<'pdf' | 'thermal' | null>(null);

  // Fetch all orders for admin
  const { 
    data: orders = [], 
    isLoading, 
    refetch: refetchOrders 
  } = useQuery({
    queryKey: ['/api/admin/orders'],
    enabled: !!user?.isAdmin
  });

  // Filter orders based on current filters
  const filteredOrders = orders.filter((order: any) => {
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    const matchesSearch = !searchQuery || 
      order.id.toString().includes(searchQuery) ||
      order.customerName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customer?.lastName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesDate = dateFilter === 'all' || (() => {
      const orderDate = new Date(order.createdAt);
      const now = new Date();
      
      switch (dateFilter) {
        case 'today':
          return orderDate.toDateString() === now.toDateString();
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return orderDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return orderDate >= monthAgo;
        default:
          return true;
      }
    })();
    
    return matchesStatus && matchesSearch && matchesDate;
  });

  // Download PDF invoice
  const downloadInvoice = (order: any) => {
    try {
      const customerName = getCustomerName(order);
      generateOrderPDF(order, customerName);
      toast({
        title: "Invoice Generated",
        description: `PDF invoice for Order #${order.id} downloaded successfully`
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to generate PDF invoice",
        variant: "destructive"
      });
    }
  };

  // Generate receipt PDF
  const generateReceiptMutation = useMutation({
    mutationFn: async (orderId: number) => {
      return apiRequest(`/api/admin/orders/${orderId}/receipt`, {
        method: 'POST'
      });
    },
    onSuccess: (data, orderId) => {
      // Create and download PDF blob
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `receipt-${orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Receipt Generated",
        description: `Receipt PDF downloaded successfully`
      });
    },
    onError: () => {
      toast({
        title: "Receipt Generation Failed",
        description: "Failed to generate receipt PDF",
        variant: "destructive"
      });
    }
  });

  // Helper function to get customer name
  const getCustomerName = (order: any): string => {
    if (order.customerName) return order.customerName;
    if (order.customer) {
      const { firstName, lastName, company, businessName, username } = order.customer;
      return businessName || company || `${firstName || ''} ${lastName || ''}`.trim() || username || 'Unknown Customer';
    }
    return 'Unknown Customer';
  };

  // Get status badge variant
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default';
      case 'pending': return 'secondary';
      case 'cancelled': return 'destructive';
      case 'delivered': return 'outline';
      default: return 'outline';
    }
  };

  // Access control
  if (!user?.isAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Admin Access Required</h2>
            <p className="text-gray-600">You need admin privileges to view invoices and receipts.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-6 max-w-7xl">
        
        {/* Page Header */}
        <div className="mb-6">
          <PageHeader 
            title="Invoices & Receipts"
            subtitle="View, download, and print all order documents with tobacco license compliance"
          />
        </div>

        {/* Filters and Controls */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4 items-center">
              
              {/* Search */}
              <div className="flex-1 min-w-64">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search by order ID, customer name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Filter */}
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                </SelectContent>
              </Select>

              {/* Refresh */}
              <Button variant="outline" onClick={() => refetchOrders()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>

            {/* Results Summary */}
            <div className="mt-4 text-sm text-gray-600">
              Showing {filteredOrders.length} of {orders.length} orders
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Order Documents
            </CardTitle>
            <CardDescription>
              All invoices include TP#97239 tobacco license and IL tobacco exercise tax notices
            </CardDescription>
          </CardHeader>
          <CardContent>
            
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-center space-x-4 p-4 border rounded-lg">
                      <div className="w-16 h-4 bg-gray-200 rounded"></div>
                      <div className="flex-1 space-y-2">
                        <div className="w-1/4 h-4 bg-gray-200 rounded"></div>
                        <div className="w-1/2 h-3 bg-gray-200 rounded"></div>
                      </div>
                      <div className="w-20 h-4 bg-gray-200 rounded"></div>
                      <div className="w-24 h-8 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Orders Found</h3>
                <p className="text-gray-600">Try adjusting your filters to see more results</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((order: any) => {
                  const customerName = getCustomerName(order);
                  const orderDate = new Date(order.createdAt).toLocaleDateString();
                  const orderTime = new Date(order.createdAt).toLocaleTimeString();
                  
                  return (
                    <div key={order.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        
                        {/* Order Info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold">Order #{order.id}</h4>
                            <Badge variant={getStatusVariant(order.status)}>
                              {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                            </Badge>
                            {order.orderType && (
                              <Badge variant="outline">
                                {order.orderType.charAt(0).toUpperCase() + order.orderType.slice(1)}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                            <div>
                              <User className="w-4 h-4 inline mr-1" />
                              {customerName}
                            </div>
                            <div>
                              <Calendar className="w-4 h-4 inline mr-1" />
                              {orderDate} {orderTime}
                            </div>
                            <div>
                              <DollarSign className="w-4 h-4 inline mr-1" />
                              ${order.total?.toFixed(2) || '0.00'}
                            </div>
                            <div>
                              <Package className="w-4 h-4 inline mr-1" />
                              {order.items?.length || 0} items
                            </div>
                          </div>

                          {/* Loyalty Points Display */}
                          {order.loyaltyPointsRedeemed > 0 && (
                            <div className="mt-2 text-sm text-green-600">
                              <CheckCircle className="w-4 h-4 inline mr-1" />
                              {order.loyaltyPointsRedeemed} loyalty points redeemed (-${order.loyaltyPointsValue?.toFixed(2) || '0.00'})
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          
                          {/* Preview Button */}
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedOrder(order)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Preview
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-4xl max-h-[90vh]">
                              <DialogHeader>
                                <DialogTitle>Order #{order.id} - Invoice Preview</DialogTitle>
                                <DialogDescription>
                                  Customer: {customerName} • Date: {orderDate} • Total: ${order.total?.toFixed(2)}
                                </DialogDescription>
                              </DialogHeader>
                              
                              <Tabs defaultValue="details" className="w-full">
                                <TabsList>
                                  <TabsTrigger value="details">Order Details</TabsTrigger>
                                  <TabsTrigger value="documents">Documents</TabsTrigger>
                                  <TabsTrigger value="print">Print & Hardware</TabsTrigger>
                                </TabsList>
                                
                                <TabsContent value="details" className="mt-4">
                                  <ScrollArea className="h-96">
                                    <div className="space-y-4">
                                      
                                      {/* Order Summary */}
                                      <Card>
                                        <CardHeader>
                                          <CardTitle className="text-lg">Order Summary</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                          <div className="grid grid-cols-2 gap-4">
                                            <div>
                                              <p><strong>Order ID:</strong> #{order.id}</p>
                                              <p><strong>Customer:</strong> {customerName}</p>
                                              <p><strong>Status:</strong> <Badge variant={getStatusVariant(order.status)}>{order.status}</Badge></p>
                                              <p><strong>Type:</strong> {order.orderType || 'Standard'}</p>
                                            </div>
                                            <div>
                                              <p><strong>Date:</strong> {orderDate}</p>
                                              <p><strong>Time:</strong> {orderTime}</p>
                                              <p><strong>Total:</strong> ${order.total?.toFixed(2) || '0.00'}</p>
                                              {order.paymentMethod && <p><strong>Payment:</strong> {order.paymentMethod}</p>}
                                            </div>
                                          </div>
                                          
                                          {/* Loyalty Points */}
                                          {order.loyaltyPointsRedeemed > 0 && (
                                            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                                              <p className="text-green-800">
                                                <CheckCircle className="w-4 h-4 inline mr-2" />
                                                <strong>Loyalty Discount Applied:</strong> {order.loyaltyPointsRedeemed} points redeemed for ${order.loyaltyPointsValue?.toFixed(2)} discount
                                              </p>
                                            </div>
                                          )}
                                        </CardContent>
                                      </Card>

                                      {/* Items */}
                                      <Card>
                                        <CardHeader>
                                          <CardTitle className="text-lg">Items</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                          <div className="space-y-2">
                                            {order.items?.map((item: any, index: number) => (
                                              <div key={index} className="flex justify-between items-center py-2 border-b last:border-b-0">
                                                <div>
                                                  <p className="font-medium">{item.product?.name || item.productName || 'Product'}</p>
                                                  <p className="text-sm text-gray-600">Qty: {item.quantity} × ${item.price?.toFixed(2)}</p>
                                                </div>
                                                <p className="font-medium">${(item.quantity * item.price)?.toFixed(2)}</p>
                                              </div>
                                            ))}
                                          </div>
                                        </CardContent>
                                      </Card>
                                    </div>
                                  </ScrollArea>
                                </TabsContent>
                                
                                <TabsContent value="documents" className="mt-4">
                                  <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                      <Button onClick={() => downloadInvoice(order)}>
                                        <Download className="w-4 h-4 mr-2" />
                                        Download PDF Invoice
                                      </Button>
                                      
                                      <Button 
                                        variant="outline" 
                                        onClick={() => generateReceiptMutation.mutate(order.id)}
                                        disabled={generateReceiptMutation.isPending}
                                      >
                                        <Receipt className="w-4 h-4 mr-2" />
                                        Generate Receipt PDF
                                      </Button>
                                    </div>
                                    
                                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                      <h4 className="font-medium text-blue-900 mb-2">Compliance Information</h4>
                                      <ul className="text-sm text-blue-800 space-y-1">
                                        <li>• Tobacco License TP#97239 displayed on all documents</li>
                                        <li>• "45% IL Tobacco Tax Paid" notice included</li>
                                        <li>• All invoices and receipts are compliant with Illinois requirements</li>
                                      </ul>
                                    </div>
                                  </div>
                                </TabsContent>
                                
                                <TabsContent value="print" className="mt-4">
                                  <div className="space-y-4">
                                    <div className="text-sm text-gray-600 mb-4">
                                      Hardware printer controls for thermal receipts and cash drawer operation
                                    </div>
                                    
                                    <PrinterControls 
                                      orderData={order}
                                      onPrintComplete={(success) => {
                                        if (success) {
                                          toast({
                                            title: "Receipt Printed",
                                            description: `Thermal receipt printed for Order #${order.id}`
                                          });
                                        }
                                      }}
                                    />
                                  </div>
                                </TabsContent>
                              </Tabs>
                            </DialogContent>
                          </Dialog>

                          {/* Quick Download */}
                          <Button
                            size="sm"
                            onClick={() => downloadInvoice(order)}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            PDF
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}