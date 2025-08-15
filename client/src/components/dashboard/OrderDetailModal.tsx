import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  Package, 
  MapPin, 
  Calendar, 
  User,
  Building2,
  Phone,
  DollarSign,
  FileText,
  Store,
  Truck,
  Download,
  Mail
} from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface OrderDetailModalProps {
  orderId: number | null;
  isOpen: boolean;
  onClose: () => void;
}

interface OrderItem {
  id: number;
  quantity: number;
  price: number;
  product?: {
    id: number;
    name: string;
    sku?: string;
    imageUrl?: string;
    description?: string;
  };
}

interface DeliveryAddress {
  label?: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  instructions?: string;
}

interface OrderUser {
  id: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  phone?: string;
}

interface Order {
  id: number;
  userId: string;
  total: number;
  subtotal: number;
  taxAmount?: number;
  orderType: 'delivery' | 'pickup';
  status: string;
  createdAt: string;
  deliveryDate?: string;
  deliveryTimeSlot?: string;
  pickupDate?: string;
  pickupTimeSlot?: string;
  notes?: string;
  deliveryFee?: number;
  loyaltyPointsEarned?: number;
  flatTaxBreakdown?: Array<{ name: string; amount: number; count: number }>;
  tobaccoTaxBreakdown?: Array<{ name: string; amount: number; percentage: number }>;
  items: OrderItem[];
  deliveryAddress?: DeliveryAddress;
  user: OrderUser;
  customerName: string;
}

export function OrderDetailModal({ orderId, isOpen, onClose }: OrderDetailModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: order, isLoading, error } = useQuery<Order>({
    queryKey: [`/api/orders/${orderId}`],
    enabled: !!orderId && isOpen,
    retry: false,
  });

  const handleDownloadPDF = async () => {
    if (!orderId) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/orders/${orderId}/receipt`, {
        headers: token ? {
          'Authorization': `Bearer ${token}`
        } : {}
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `order-${orderId}-receipt.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        toast({
          title: "Success",
          description: "Receipt downloaded successfully"
        });
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download receipt",
        variant: "destructive"
      });
    }
  };

  const handleEmailPDF = async () => {
    if (!orderId) return;
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/orders/${orderId}/send-receipt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      
      if (response.ok) {
        toast({
          title: "Success",
          description: "Receipt emailed successfully"
        });
      } else {
        throw new Error('Email failed');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to email receipt",
        variant: "destructive"
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not specified';
    try {
      return format(new Date(dateString), 'EEEE, MMMM d, yyyy');
    } catch {
      return 'Invalid date';
    }
  };

  const formatTimeSlot = (timeSlot?: string) => {
    if (!timeSlot) return 'Not specified';
    return timeSlot;
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Order Details #{orderId}</span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadPDF}
                className="flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleEmailPDF}
                className="flex items-center gap-2"
              >
                <Mail className="h-4 w-4" />
                Email PDF
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">Order not found</h3>
            <p className="text-gray-600">The requested order could not be loaded.</p>
          </div>
        ) : order ? (
          <div className="space-y-6">
            {/* Order Status and Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-600">Order Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <Badge className={`${getStatusColor(order.status || 'pending')} border-0 mb-2`}>
                    {(order.status || 'pending').charAt(0).toUpperCase() + (order.status || 'pending').slice(1)}
                  </Badge>
                  <p className="text-sm text-gray-600">
                    Order Date: {(() => {
                      try {
                        if (!order.createdAt) return 'Date unavailable';
                        const date = new Date(order.createdAt);
                        if (!date || isNaN(date.getTime())) return 'Date unavailable';
                        return format(date, 'MMM d, yyyy');
                      } catch (error) {
                        return 'Date unavailable';
                      }
                    })()}
                  </p>
                  {order.orderType === 'pickup' && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-700">
                        Pickup: {formatDate(order.pickupDate)}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatTimeSlot(order.pickupTimeSlot)}
                      </p>
                    </div>
                  )}
                  {order.orderType === 'delivery' && (
                    <div className="mt-2">
                      <p className="text-sm font-medium text-gray-700">
                        Delivery: {formatDate(order.deliveryDate)}
                      </p>
                      <p className="text-sm text-gray-600 flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatTimeSlot(order.deliveryTimeSlot)}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-600">Customer Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-2 text-gray-500" />
                      <span className="text-sm">
                        {order.customerName || order.user?.company || `${order.user?.firstName || ''} ${order.user?.lastName || ''}`.trim() || 'Customer'}
                      </span>
                    </div>
                    {order.user?.phone && (
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-gray-500" />
                        <span className="text-sm">{order.user.phone}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-gray-600">Order Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Items ({order.items?.length || 0})</span>
                      <span>${(order.subtotal || order.total || 0).toFixed(2)}</span>
                    </div>
                    {order.deliveryFee && order.deliveryFee > 0 && (
                      <div className="flex justify-between">
                        <span>Delivery Fee</span>
                        <span>${(order.deliveryFee || 0).toFixed(2)}</span>
                      </div>
                    )}
                    {/* B2B company - no sales tax displayed in modal */}
                    <Separator className="my-2" />
                    <div className="flex justify-between font-semibold">
                      <span>Total</span>
                      <span>${(order.total || 0).toFixed(2)}</span>
                    </div>
                    {order.loyaltyPointsEarned && order.loyaltyPointsEarned > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Loyalty Points Earned</span>
                        <span>{order.loyaltyPointsEarned} pts</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Order Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Order Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.items?.map((item) => (
                    <div key={item.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                      {item.product?.imageUrl && (
                        <img
                          src={item.product.imageUrl}
                          alt={item.product.name}
                          className="w-16 h-16 object-cover rounded-md"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium">{item.product?.name || 'Unknown Product'}</h4>
                        {item.product?.sku && (
                          <p className="text-sm text-gray-600">SKU: {item.product.sku}</p>
                        )}
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm text-gray-600">
                            Quantity: {item.quantity || 0}
                          </span>
                          <span className="font-medium">
                            ${((item.price || 0) * (item.quantity || 0)).toFixed(2)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Delivery Address */}
            {order.orderType === 'delivery' && order.deliveryAddress && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <MapPin className="h-5 w-5 mr-2" />
                    Delivery Address
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {order.deliveryAddress.label && (
                      <p className="font-medium">{order.deliveryAddress.label}</p>
                    )}
                    <p>{order.deliveryAddress.streetAddress}</p>
                    <p>
                      {order.deliveryAddress.city}, {order.deliveryAddress.state} {order.deliveryAddress.zipCode}
                    </p>
                    {order.deliveryAddress.instructions && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm font-medium text-gray-700">Delivery Instructions:</p>
                        <p className="text-sm text-gray-600">{order.deliveryAddress.instructions}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Pickup Location */}
            {order.orderType === 'pickup' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Store className="h-5 w-5 mr-2" />
                    Pickup Location
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="font-medium">Gokul Wholesale, Inc</p>
                    <p>1141 W Bryn Mawr Ave</p>
                    <p>Itasca, IL 60143</p>
                    <p className="text-sm text-gray-600">Phone: (630) 540-9910</p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Order Notes */}
            {order.notes && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Order Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{order.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}