import React, { useState } from 'react';
import { useOrders, useChangeStatus } from '../../hooks/useNewOrders';
import { StatusPill } from './StatusPill';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Filter } from 'lucide-react';

export function NewOrderList() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  
  const { data: orders, isLoading, error } = useOrders({ query, status, page, limit: 20 });
  const changeStatus = useChangeStatus();

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      await changeStatus.mutateAsync({ 
        id: orderId, 
        to: newStatus, 
        reason: `Status changed to ${newStatus}` 
      });
    } catch (error) {
      console.error('Failed to change status:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Failed to load orders</p>
        <Button onClick={() => window.location.reload()} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Order Management</h1>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Order
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search orders..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
                <SelectItem value="NEW">New</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="PACKED">Packed</SelectItem>
                <SelectItem value="SHIPPED">Shipped</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
                <SelectItem value="REFUNDED">Refunded</SelectItem>
                <SelectItem value="ON_HOLD">On Hold</SelectItem>
                <SelectItem value="RETURN_REQUESTED">Return Requested</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <div className="space-y-4">
        {orders?.data?.map((order: any) => (
          <Card key={order.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{order.id}</h3>
                    <StatusPill status={order.status} />
                  </div>
                  <p className="text-gray-600">{order.customer_name}</p>
                  {order.customer_email && (
                    <p className="text-sm text-gray-500">{order.customer_email}</p>
                  )}
                </div>

                <div className="text-right space-y-2">
                  <div className="text-2xl font-bold">
                    ${(order.total / 100).toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-500">
                    Balance: ${(order.balance / 100).toFixed(2)}
                  </div>
                  {order.tax_il_otp > 0 && (
                    <Badge variant="outline" className="text-xs">
                      IL Tobacco Tax: ${(order.tax_il_otp / 100).toFixed(2)}
                    </Badge>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    {order.items?.length} items • Created {new Date(order.created_at).toLocaleDateString()}
                  </div>
                  <div className="flex gap-2">
                    <Select 
                      onValueChange={(newStatus) => handleStatusChange(order.id, newStatus)}
                      disabled={changeStatus.isPending}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="Change Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PAID">Mark Paid</SelectItem>
                        <SelectItem value="PACKED">Mark Packed</SelectItem>
                        <SelectItem value="SHIPPED">Mark Shipped</SelectItem>
                        <SelectItem value="DELIVERED">Mark Delivered</SelectItem>
                        <SelectItem value="ON_HOLD">Put On Hold</SelectItem>
                        <SelectItem value="CANCELLED">Cancel</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pagination */}
      {orders && orders.total > orders.limit && (
        <div className="flex justify-center gap-2 mt-6">
          <Button 
            variant="outline" 
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Previous
          </Button>
          <span className="flex items-center px-4">
            Page {page} of {Math.ceil(orders.total / orders.limit)}
          </span>
          <Button 
            variant="outline"
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(orders.total / orders.limit)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}