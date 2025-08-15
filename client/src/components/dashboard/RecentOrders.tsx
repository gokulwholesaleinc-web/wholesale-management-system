import React, { useState } from "react";
import { useUnifiedOrders } from "@/lib/unified-api-registry";
import { useLocation } from "wouter";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { OrderDetailModal } from "./OrderDetailModal";

interface Order {
  id: number;
  userId: string;
  total: number;
  paymentDate: string;
  completedAt: string;
  status: string;
  createdAt: string;
  items: {
    id: number;
    productId: number;
    quantity: number;
    price: number;
  }[];
}

export function RecentOrders() {
  const [_, setLocation] = useLocation();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const { orders: data, isOrdersLoading: isLoading } = useUnifiedOrders();
  
  // Extract orders from the response - fix TypeScript issues
  const orders = Array.isArray(data) 
    ? data 
    : (data && typeof data === 'object' && 'rows' in data && Array.isArray(data.rows) 
        ? data.rows 
        : []);

  // Get the most recent 5 orders
  const recentOrders = [...orders].sort((a, b) => {
    return new Date(b?.createdAt || 0).getTime() - new Date(a?.createdAt || 0).getTime();
  }).slice(0, 5);
  
  const handleViewDetails = (orderId: number) => {
    setSelectedOrderId(orderId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedOrderId(null);
  };
  
  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'processing':
        return <Badge className="bg-blue-100 text-blue-800">Processing</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800">Cancelled</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    try {
      if (!dateString) return 'N/A';
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      return 'Invalid Date';
    }
  };

  const getItemCount = (items: any[]) => {
    if (!Array.isArray(items)) return 0;
    return items.reduce((total, item) => total + (item?.quantity || 0), 0);
  };

  const viewAllOrders = () => {
    setLocation('/orders');
  };

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl md:text-2xl font-bold font-heading">Recent Orders</h2>
          <p className="text-slate-600">Track your recent purchases and deliveries</p>
        </div>
        <Button 
          variant="link" 
          className="text-primary hover:text-blue-700 font-medium flex items-center"
          onClick={viewAllOrders}
        >
          View All <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6">
            <div className="space-y-4">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex flex-col space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          </div>
        ) : recentOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Completion Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentOrders.map((order) => (
                  <TableRow key={order.id} className="hover:bg-slate-50">
                    <TableCell className="font-medium">#{order.id}</TableCell>
                    <TableCell>{formatDate(order.createdAt)}</TableCell>
                    <TableCell>{getItemCount(order.items)}</TableCell>
                    <TableCell className="font-medium">${order.total.toFixed(2)}</TableCell>
                    <TableCell>
                      {order.paymentDate ? formatDate(order.paymentDate) : 
                       order.completedAt ? formatDate(order.completedAt) : 
                       order.status === 'completed' ? 'Completed' : 'Pending'}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      <Button 
                        variant="link" 
                        className="text-primary hover:text-blue-700 p-0"
                        onClick={() => handleViewDetails(order.id)}
                      >
                        View details
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-16">
            <h3 className="text-lg font-semibold">No orders yet</h3>
            <p className="text-slate-600 mt-2">Your recent orders will appear here once you make your first purchase.</p>
          </div>
        )}
      </div>

      <OrderDetailModal
        orderId={selectedOrderId}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </section>
  );
}