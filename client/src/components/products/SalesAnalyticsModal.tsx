import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus, Users, DollarSign, ShoppingCart, Calendar } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

interface SalesAnalyticsModalProps {
  product: any;
  isOpen: boolean;
  onClose: () => void;
}

export function SalesAnalyticsModal({ product, isOpen, onClose }: SalesAnalyticsModalProps) {
  const { data: analytics, isLoading, error } = useQuery({
    queryKey: [`/api/admin/products/${product?.id}/sales-analytics`],
    enabled: !!product?.id && isOpen,
  });

  if (!product) return null;

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return 'bg-green-100 text-green-800';
      case 'decreasing':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Sales Analytics - {product.name}
          </DialogTitle>
          <DialogDescription>
            Comprehensive sales performance and customer insights
          </DialogDescription>
        </DialogHeader>
        
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <span className="ml-2">Loading sales analytics...</span>
          </div>
        ) : error ? (
          <div className="text-center py-8 text-red-500">
            <p>Error loading sales analytics: {error.message}</p>
          </div>
        ) : analytics ? (
          <div className="space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Sold</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.totalSold}</div>
                  <p className="text-xs text-gray-500">Units sold</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${analytics.totalRevenue.toFixed(2)}</div>
                  <p className="text-xs text-gray-500">All time revenue</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Average Order Value</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${analytics.averageOrderValue.toFixed(2)}</div>
                  <p className="text-xs text-gray-500">Per order</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-600">Sales Trend</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    {getTrendIcon(analytics.salesTrend)}
                    <Badge className={getTrendColor(analytics.salesTrend)}>
                      {analytics.salesTrend.charAt(0).toUpperCase() + analytics.salesTrend.slice(1)}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Last 30 days</p>
                </CardContent>
              </Card>
            </div>

            {/* Top Customers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Top Customers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.topCustomers.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.topCustomers.map((customer: any, index: number) => (
                      <div key={customer.customerId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-semibold">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{customer.customerName}</p>
                            <p className="text-sm text-gray-500">{customer.totalOrders} orders</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${customer.totalSpent.toFixed(2)}</p>
                          <p className="text-sm text-gray-500">Total spent</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No customer data available</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Monthly Sales Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Monthly Sales Trend
                </CardTitle>
              </CardHeader>
              <CardContent>
                {analytics.monthlySales.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.monthlySales.map((month: any) => (
                      <div key={month.month} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="font-medium">{month.month}</p>
                            <p className="text-sm text-gray-500">{month.quantity} units</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">${month.revenue.toFixed(2)}</p>
                          <p className="text-sm text-gray-500">Revenue</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No monthly sales data available</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No sales analytics data available</p>
          </div>
        )}
        
        <div className="flex justify-end pt-4">
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}