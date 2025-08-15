import React from 'react';
import { useOrder } from '../../hooks/useNewOrders';
import { StatusPill } from './StatusPill';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Package, CreditCard, Truck, History } from 'lucide-react';

interface NewOrderDetailProps {
  orderId: string;
  onBack: () => void;
}

export function NewOrderDetail({ orderId, onBack }: NewOrderDetailProps) {
  const { data: orderData, isLoading, error } = useOrder(orderId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !orderData) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600">Failed to load order details</p>
        <Button onClick={onBack} className="mt-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Orders
        </Button>
      </div>
    );
  }

  const { data: order, history, payments } = orderData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{order.id}</h1>
            <p className="text-gray-600">{order.customer_name}</p>
          </div>
        </div>
        <StatusPill status={order.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order Items */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-4 w-4 mr-2" />
                Order Items
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items?.map((item: any, index: number) => (
                  <div key={item.id || index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-gray-500">SKU: {item.sku}</p>
                      <p className="text-sm text-gray-500">Qty: {item.qty} × ${(item.unit_price / 100).toFixed(2)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${((item.qty * item.unit_price) / 100).toFixed(2)}</p>
                      {item.line_tax_rate > 0 && (
                        <p className="text-xs text-gray-500">
                          Tax: {(item.line_tax_rate * 100).toFixed(1)}%
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Order History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <History className="h-4 w-4 mr-2" />
                Order History
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {history?.map((event: any) => (
                  <div key={event.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                    <div>
                      <p className="font-medium">
                        {event.from_status} → {event.to_status}
                      </p>
                      {event.reason && (
                        <p className="text-sm text-gray-500">{event.reason}</p>
                      )}
                    </div>
                    <div className="text-sm text-gray-500">
                      {new Date(event.created_at).toLocaleString()}
                    </div>
                  </div>
                )) || <p className="text-gray-500">No history available</p>}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${(order.subtotal / 100).toFixed(2)}</span>
              </div>
              
              {order.tax_il_otp > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm">IL Tobacco Tax (45%):</span>
                  <span className="text-sm">${(order.tax_il_otp / 100).toFixed(2)}</span>
                </div>
              )}
              
              {order.tax_other > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm">Other Taxes:</span>
                  <span className="text-sm">${(order.tax_other / 100).toFixed(2)}</span>
                </div>
              )}
              
              {order.shipping > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm">Shipping:</span>
                  <span className="text-sm">${(order.shipping / 100).toFixed(2)}</span>
                </div>
              )}
              
              {order.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span className="text-sm">Discount:</span>
                  <span className="text-sm">-${(order.discount / 100).toFixed(2)}</span>
                </div>
              )}
              
              <Separator />
              
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span>${(order.total / 100).toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Paid:</span>
                <span className="text-green-600">${(order.paid / 100).toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between">
                <span>Balance:</span>
                <span className={order.balance > 0 ? 'text-red-600' : 'text-green-600'}>
                  ${(order.balance / 100).toFixed(2)}
                </span>
              </div>

              {/* IL Tobacco Tax Compliance Notice */}
              {order.tax_il_otp >= 0 && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
                  <p className="text-xs font-medium text-blue-800">
                    45% IL TOBACCO TAX PAID
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Illinois compliance requirement - always displayed
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Info */}
          <Card>
            <CardHeader>
              <CardTitle>Customer Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <p className="font-medium">{order.customer_name}</p>
                {order.customer_email && (
                  <p className="text-sm text-gray-600">{order.customer_email}</p>
                )}
                {order.customer_phone && (
                  <p className="text-sm text-gray-600">{order.customer_phone}</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Payments */}
          {payments && payments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Payments
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {payments.map((payment: any) => (
                    <div key={payment.id} className="flex justify-between items-center py-2 border-b last:border-b-0">
                      <div>
                        <p className="font-medium">{payment.provider}</p>
                        <p className="text-xs text-gray-500">{payment.type}</p>
                      </div>
                      <div className="text-right">
                        <p className={payment.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {payment.amount >= 0 ? '+' : ''}${(payment.amount / 100).toFixed(2)}
                        </p>
                        <Badge variant={payment.status === 'succeeded' ? 'default' : 'destructive'}>
                          {payment.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}