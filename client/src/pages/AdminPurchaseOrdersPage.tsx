import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Plus, Eye, Trash2, Package, CheckCircle, XCircle, Clock, Truck } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';

// Type definitions based on the backend schema
interface PurchaseOrder {
  id: number;
  orderNumber: string;
  supplierName: string;
  supplierId?: string;
  status: 'pending' | 'submitted' | 'receiving' | 'received' | 'cancelled';
  totalCost: number;
  notes?: string;
  createdAt: string;
  createdBy?: string;
  receivedBy?: string;
  receivedAt?: string;
  createdByName?: string;
}

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

  // Fetch purchase orders
  const { data: purchaseOrders = [], isLoading, error } = useQuery<PurchaseOrder[]>({
    queryKey: ['/api/admin/purchase-orders'],
    staleTime: 30000, // Cache for 30 seconds
  });

  // Update purchase order status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      const response = await fetch(`/api/admin/purchase-orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error('Failed to update status');
      return response.json();
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
      const response = await fetch(`/api/admin/purchase-orders/${orderId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete purchase order');
      return response.json();
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
          <Button className="flex items-center gap-2" onClick={() => {
            // Navigate to AI Invoice Processor for creating purchase orders
            window.location.href = '/admin/ai-invoice-processor';
          }}>
            <Plus className="h-4 w-4" />
            Create Purchase Order
          </Button>
        </PageHeader>

        <Card>
          <CardHeader>
            <CardTitle>All Purchase Orders</CardTitle>
            <CardDescription>
              Manage and track orders from suppliers. Purchase orders are typically created via the AI Invoice Processor.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : purchaseOrders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No purchase orders</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Get started by processing an invoice with the AI Invoice Processor.
                </p>
                <div className="mt-6">
                  <Button onClick={() => window.location.href = '/admin/ai-invoice-processor'}>
                    <Plus className="h-4 w-4 mr-2" />
                    Process Invoice
                  </Button>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Total Cost</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.orderNumber}</TableCell>
                      <TableCell>{order.supplierName}</TableCell>
                      <TableCell>
                        <Select
                          value={order.status}
                          onValueChange={(value) => handleStatusChange(order.id, value)}
                          disabled={updateStatusMutation.isPending}
                        >
                          <SelectTrigger className="w-auto">
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
                      </TableCell>
                      <TableCell className="font-medium">${order.totalCost.toFixed(2)}</TableCell>
                      <TableCell>{new Date(order.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // View details - could expand this later
                              toast({
                                title: "View Details",
                                description: `Viewing details for PO #${order.orderNumber}`,
                              });
                            }}
                            className="flex items-center gap-1"
                          >
                            <Eye className="h-3 w-3" />
                            View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteOrder(order.id)}
                            disabled={deleteMutation.isPending}
                            className="flex items-center gap-1 text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}