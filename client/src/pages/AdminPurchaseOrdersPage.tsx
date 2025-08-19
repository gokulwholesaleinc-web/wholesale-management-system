import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { AlertCircle, Plus, Eye, Trash2, Package, CheckCircle, XCircle, Clock, Truck, Edit3, FileText, DollarSign, Calendar } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Type definitions based on the actual backend data structure
interface PurchaseOrder {
  id: number;
  orderNumber: string;
  supplier: string;
  supplierName?: string;
  supplierAddress?: string;
  status: 'pending' | 'submitted' | 'receiving' | 'received' | 'cancelled';
  totalAmount: number;
  totalCost?: number; // fallback
  notes?: string;
  createdAt: string;
  orderDate?: string;
  expectedDeliveryDate?: string;
  createdBy?: string;
  receivedBy?: string;
  receivedAt?: string;
  createdByName?: string;
}

// Purchase Order form schema
const purchaseOrderSchema = z.object({
  orderNumber: z.string().min(1, 'Order number is required'),
  supplierName: z.string().min(1, 'Supplier name is required'),
  supplierAddress: z.string().optional(),
  totalCost: z.number().min(0, 'Total cost must be positive'),
  notes: z.string().optional(),
  expectedDeliveryDate: z.string().optional(),
});

type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>;

// Status badge component
function StatusBadge({ status }: { status: string }) {
  const variants = {
    pending: { variant: 'outline' as const, icon: Clock, color: 'text-yellow-600' },
    submitted: { variant: 'secondary' as const, icon: Package, color: 'text-blue-600' },
    receiving: { variant: 'default' as const, icon: Truck, color: 'text-orange-600' },
    received: { variant: 'default' as const, icon: CheckCircle, color: 'text-green-600' },
    cancelled: { variant: 'destructive' as const, icon: XCircle, color: 'text-red-600' },
  };

  const config = variants[status as keyof typeof variants] || variants.pending;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="flex items-center gap-1">
      <Icon className={`h-3 w-3 ${config.color}`} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </Badge>
  );
}

export default function AdminPurchaseOrdersPage() {
  const { toast } = useToast();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [viewingOrder, setViewingOrder] = useState<PurchaseOrder | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Fetch purchase orders
  const { data: purchaseOrders = [], isLoading, error } = useQuery<PurchaseOrder[]>({
    queryKey: ['/api/admin/purchase-orders'],
    staleTime: 30000, // Cache for 30 seconds
  });

  // Create purchase order form
  const createForm = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(purchaseOrderSchema),
    defaultValues: {
      orderNumber: `PO-${Date.now()}`,
      supplierName: '',
      supplierAddress: '',
      totalCost: 0,
      notes: '',
      expectedDeliveryDate: '',
    },
  });

  // Edit purchase order form  
  const editForm = useForm<PurchaseOrderFormData>({
    resolver: zodResolver(purchaseOrderSchema),
  });

  // Create purchase order mutation
  const createMutation = useMutation({
    mutationFn: async (data: PurchaseOrderFormData) => {
      return await apiRequest('/api/admin/purchase-orders', {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Purchase Order Created",
        description: "Manual purchase order has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/purchase-orders'] });
      setIsCreateModalOpen(false);
      createForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Creation Failed",
        description: "Failed to create purchase order.",
        variant: "destructive",
      });
    },
  });

  // Update purchase order mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: PurchaseOrderFormData }) => {
      return await apiRequest(`/api/admin/purchase-orders/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Purchase Order Updated",
        description: "Purchase order has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/purchase-orders'] });
      setEditingOrder(null);
      editForm.reset();
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update purchase order.",
        variant: "destructive",
      });
    },
  });

  // Update purchase order status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      return await apiRequest(`/api/admin/purchase-orders/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
        headers: {
          'Content-Type': 'application/json',
        },
      });
    },
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "Purchase order status has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/purchase-orders'] });
    },
    onError: (error) => {
      toast({
        title: "Update Failed",
        description: "Failed to update purchase order status.",
        variant: "destructive",
      });
    },
  });

  // Delete purchase order
  const deleteMutation = useMutation({
    mutationFn: async (orderId: number) => {
      return await apiRequest(`/api/admin/purchase-orders/${orderId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      toast({
        title: "Purchase Order Deleted",
        description: "Purchase order has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/purchase-orders'] });
    },
    onError: (error) => {
      toast({
        title: "Delete Failed",
        description: "Failed to delete purchase order.",
        variant: "destructive",
      });
    },
  });

  const handleStatusChange = (orderId: number, newStatus: string) => {
    updateStatusMutation.mutate({ orderId, status: newStatus });
  };

  const handleDeleteOrder = (orderId: number) => {
    if (confirm('Are you sure you want to delete this purchase order? This action cannot be undone.')) {
      deleteMutation.mutate(orderId);
    }
  };

  const handleEditOrder = (order: PurchaseOrder) => {
    editForm.reset({
      orderNumber: order.orderNumber,
      supplierName: order.supplier || order.supplierName || '',
      supplierAddress: order.supplierAddress || '',
      totalCost: order.totalAmount || order.totalCost || 0,
      notes: order.notes || '',
      expectedDeliveryDate: order.expectedDeliveryDate || '',
    });
    setEditingOrder(order);
  };

  const handleViewOrder = (order: PurchaseOrder) => {
    setViewingOrder(order);
    setIsViewModalOpen(true);
  };

  const onCreateSubmit = (data: PurchaseOrderFormData) => {
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: PurchaseOrderFormData) => {
    if (editingOrder) {
      updateMutation.mutate({ id: editingOrder.id, data });
    }
  };

  if (error) {
    return (
      <AppLayout title="Purchase Orders">
        <div className="flex flex-col items-center justify-center min-h-[50vh] px-4">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Purchase Orders</h2>
          <p className="text-gray-600 text-center">Failed to load purchase orders. Please try again later.</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Purchase Orders">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <PageHeader 
          title="Purchase Orders"
          description="Manage supplier orders and inventory receiving"
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className="text-xs"
              >
                Cards
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="text-xs"
              >
                Table
              </Button>
            </div>
            <Button
              className="flex items-center gap-2"
              onClick={() => window.location.href = '/admin/ai-invoice-processor'}
              variant="outline"
            >
              <FileText className="h-4 w-4" />
              AI Processor
            </Button>
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Manually
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Purchase Order</DialogTitle>
                  <DialogDescription>
                    Manually create a new purchase order from supplier.
                  </DialogDescription>
                </DialogHeader>
                <Form {...createForm}>
                  <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
                    <FormField
                      control={createForm.control}
                      name="orderNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Order Number</FormLabel>
                          <FormControl>
                            <Input placeholder="PO-12345" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="supplierName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Supplier Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Supplier Company" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="supplierAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Supplier Address</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Full address (optional)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="totalCost"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Total Cost</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              step="0.01" 
                              placeholder="0.00" 
                              {...field} 
                              onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="expectedDeliveryDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Expected Delivery</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={createForm.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Additional notes (optional)" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-3">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setIsCreateModalOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button 
                        type="submit" 
                        disabled={createMutation.isPending}
                      >
                        {createMutation.isPending ? 'Creating...' : 'Create Order'}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </PageHeader>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : purchaseOrders.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <Package className="mx-auto h-16 w-16 text-gray-300" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No purchase orders found</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Start by creating a purchase order manually or via the AI Invoice Processor.
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <Button 
                    onClick={() => setIsCreateModalOpen(true)}
                    className="flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Create Manually
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => window.location.href = '/admin/ai-invoice-processor'}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    AI Processor
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : viewMode === 'cards' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {purchaseOrders.map((order) => (
              <Card key={order.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg font-semibold">
                        {order.orderNumber}
                      </CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {order.supplier || order.supplierName || 'Unknown Supplier'}
                      </CardDescription>
                    </div>
                    <StatusBadge status={order.status} />
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span className="font-semibold text-lg">
                        ${((order.totalAmount || order.totalCost || 0).toFixed(2))}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Created: {new Date(order.createdAt || order.orderDate || '').toLocaleDateString()}
                      </span>
                    </div>
                    {order.notes && (
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {order.notes}
                      </p>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t flex items-center gap-2">
                    <Select
                      value={order.status}
                      onValueChange={(value) => handleStatusChange(order.id, value)}
                      disabled={updateStatusMutation.isPending}
                    >
                      <SelectTrigger className="flex-1 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="submitted">Submitted</SelectItem>
                        <SelectItem value="receiving">Receiving</SelectItem>
                        <SelectItem value="received">Received</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewOrder(order)}
                      className="flex items-center gap-1"
                    >
                      <Eye className="h-3 w-3" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditOrder(order)}
                      className="flex items-center gap-1"
                    >
                      <Edit3 className="h-3 w-3" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteOrder(order.id)}
                      disabled={deleteMutation.isPending}
                      className="flex items-center gap-1 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Purchase Orders Table</CardTitle>
              <CardDescription>
                Detailed view of all purchase orders with advanced actions.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 font-medium">Order #</th>
                      <th className="text-left py-3 px-2 font-medium">Supplier</th>
                      <th className="text-left py-3 px-2 font-medium">Status</th>
                      <th className="text-left py-3 px-2 font-medium">Total</th>
                      <th className="text-left py-3 px-2 font-medium">Created</th>
                      <th className="text-left py-3 px-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {purchaseOrders.map((order) => (
                      <tr key={order.id} className="border-b hover:bg-gray-50">
                        <td className="py-3 px-2 font-medium">{order.orderNumber}</td>
                        <td className="py-3 px-2">{order.supplier || order.supplierName || 'Unknown'}</td>
                        <td className="py-3 px-2">
                          <Select
                            value={order.status}
                            onValueChange={(value) => handleStatusChange(order.id, value)}
                            disabled={updateStatusMutation.isPending}
                          >
                            <SelectTrigger className="w-32">
                              <StatusBadge status={order.status} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="submitted">Submitted</SelectItem>
                              <SelectItem value="receiving">Receiving</SelectItem>
                              <SelectItem value="received">Received</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="py-3 px-2 font-semibold">
                          ${((order.totalAmount || order.totalCost || 0).toFixed(2))}
                        </td>
                        <td className="py-3 px-2 text-sm text-gray-500">
                          {new Date(order.createdAt || order.orderDate || '').toLocaleDateString()}
                        </td>
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewOrder(order)}
                              className="flex items-center gap-1"
                            >
                              <Eye className="h-3 w-3" />
                              View
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleEditOrder(order)}
                              className="flex items-center gap-1"
                            >
                              <Edit3 className="h-3 w-3" />
                              Edit
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteOrder(order.id)}
                              disabled={deleteMutation.isPending}
                              className="flex items-center gap-1 text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Edit Purchase Order Modal */}
        <Dialog open={!!editingOrder} onOpenChange={(open) => !open && setEditingOrder(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Purchase Order</DialogTitle>
              <DialogDescription>
                Update purchase order details.
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="orderNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Order Number</FormLabel>
                      <FormControl>
                        <Input placeholder="PO-12345" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="supplierName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Supplier Company" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="supplierAddress"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier Address</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Full address (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="totalCost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Total Cost</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00" 
                          {...field} 
                          onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="expectedDeliveryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expected Delivery</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Additional notes (optional)" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-3">
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setEditingOrder(null)}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? 'Updating...' : 'Update Order'}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* View Purchase Order Modal */}
        <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
          <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Purchase Order Details</DialogTitle>
              <DialogDescription>
                Detailed view of purchase order items, pricing, and stock information.
              </DialogDescription>
            </DialogHeader>
            {viewingOrder && (
              <div className="space-y-6">
                {/* Order Header Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Order Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Order Number:</span>
                        <span className="font-medium">{viewingOrder.orderNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <StatusBadge status={viewingOrder.status} />
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total Amount:</span>
                        <span className="font-semibold text-green-600">
                          ${(viewingOrder.totalAmount || viewingOrder.totalCost || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Created:</span>
                        <span>{new Date(viewingOrder.createdAt || viewingOrder.orderDate || '').toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Supplier Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Supplier:</span>
                        <span className="font-medium">{viewingOrder.supplier || viewingOrder.supplierName || 'Unknown'}</span>
                      </div>
                      {viewingOrder.supplierAddress && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Address:</span>
                          <span className="font-medium text-right">{viewingOrder.supplierAddress}</span>
                        </div>
                      )}
                      {viewingOrder.expectedDeliveryDate && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Expected Delivery:</span>
                          <span>{new Date(viewingOrder.expectedDeliveryDate).toLocaleDateString()}</span>
                        </div>
                      )}
                      {viewingOrder.createdByName && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Created By:</span>
                          <span>{viewingOrder.createdByName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notes Section */}
                {viewingOrder.notes && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="font-semibold mb-2">Notes</h3>
                    <p className="text-sm text-gray-700">{viewingOrder.notes}</p>
                  </div>
                )}

                {/* Placeholder for Purchase Order Items */}
                <div className="border rounded-lg">
                  <div className="p-4 border-b bg-gray-50">
                    <h3 className="font-semibold text-lg">Order Items</h3>
                    <p className="text-sm text-gray-600">Detailed breakdown of items in this purchase order</p>
                  </div>
                  <div className="p-4">
                    <div className="text-center py-8 text-gray-500">
                      <Package className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                      <p className="text-sm">Purchase order items not available</p>
                      <p className="text-xs text-gray-400 mt-1">
                        This is a manually created purchase order. Item details would be shown here for AI-processed orders.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3 pt-4 border-t">
                  <Button
                    variant="outline"
                    onClick={() => handleEditOrder(viewingOrder)}
                    className="flex items-center gap-2"
                  >
                    <Edit3 className="h-4 w-4" />
                    Edit Order
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsViewModalOpen(false)}
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}