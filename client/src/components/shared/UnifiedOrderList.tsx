import React, { useState, useMemo } from 'react';
import { useUnifiedOrders } from '@/lib/unified-api-registry';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Link } from 'wouter';
import { Eye, Package, Calendar, DollarSign, User, Building2, Filter, Search } from 'lucide-react';
import { format } from 'date-fns';

interface Order {
  id: number;
  userId?: string;
  total: number;
  status: string;
  createdAt: string;
  orderType: 'delivery' | 'pickup';
  user?: {
    firstName?: string;
    lastName?: string;
    company?: string;
  };
  items?: Array<{
    id: number;
    quantity: number;
    product?: { name: string };
  }>;
}

interface UnifiedOrderListProps {
  showCustomerInfo?: boolean;
  baseUrl?: string;
  title?: string;
  emptyMessage?: string;
  emptyDescription?: string;
}

export function UnifiedOrderList({ 
  showCustomerInfo = false,
  baseUrl = "/orders",
  title = "Orders",
  emptyMessage = "No orders yet",
  emptyDescription = "Orders will appear here when they are placed"
}: UnifiedOrderListProps) {
  const { user } = useAuth();
  
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date-desc');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  const { orders, isOrdersLoading: isLoading } = useUnifiedOrders();

  // Filter and sort orders
  const filteredAndSortedOrders = useMemo(() => {
    if (!orders || !Array.isArray(orders)) return [];
    
    let filtered = [...orders];
    
    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(order => order.status.toLowerCase() === statusFilter.toLowerCase());
    }
    
    // Filter by search term (order ID, customer name, company)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(order => 
        order.id.toString().includes(term) ||
        order.user?.firstName?.toLowerCase().includes(term) ||
        order.user?.lastName?.toLowerCase().includes(term) ||
        order.user?.company?.toLowerCase().includes(term)
      );
    }
    
    // Sort orders
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'date-asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'total-desc':
          return b.total - a.total;
        case 'total-asc':
          return a.total - b.total;
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });
    
    return filtered;
  }, [orders, statusFilter, sortBy, searchTerm]);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">{title}</h1>
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-1/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error handling is managed by useUnifiedOrders hook

  const ordersList = filteredAndSortedOrders;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">{title}</h1>
        
        {/* Filters and Search */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 w-40"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Newest First</SelectItem>
              <SelectItem value="date-asc">Oldest First</SelectItem>
              <SelectItem value="total-desc">Highest Amount</SelectItem>
              <SelectItem value="total-asc">Lowest Amount</SelectItem>
              <SelectItem value="status">Status</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {ordersList.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">{emptyMessage}</h3>
            <p className="text-gray-600 mb-4">{emptyDescription}</p>
            {!showCustomerInfo && (
              <Link href="/products">
                <Button>Browse Products</Button>
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {ordersList.map((order) => (
            <Card key={order.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      Order #{order.id}
                    </CardTitle>
                    
                    {/* Customer Info - Only shown for admin/staff views */}
                    {showCustomerInfo && order.user && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <User className="h-4 w-4" />
                        <span>
                          {order.user.firstName} {order.user.lastName}
                          {order.user.company && ` (${order.user.company})`}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(order.createdAt), 'MMM d, yyyy')}
                      </div>
                      <div className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        ${order.total.toFixed(2)}
                      </div>
                      <Badge className={`${getStatusColor(order.status)} border-0`}>
                        {order.status?.charAt(0).toUpperCase() + order.status?.slice(1)}
                      </Badge>
                    </div>
                  </div>
                  
                  <Link href={`${baseUrl}/${order.id}`}>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View Details
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">
                      {order.items?.length || 0} item(s) • {order.orderType}
                    </p>
                    {order.items?.slice(0, 2).map((item: any, idx: number) => (
                      <p key={idx} className="text-xs text-gray-500">
                        {item.quantity}x {item.product?.name || 'Product'}
                      </p>
                    ))}
                    {(order.items?.length || 0) > 2 && (
                      <p className="text-xs text-gray-500">
                        +{(order.items?.length || 0) - 2} more items
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}