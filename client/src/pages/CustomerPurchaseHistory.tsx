import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingBag, TrendingUp, Calendar, Package } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface CustomerPurchaseHistory {
  customerId: string;
  totalPurchases: number;
  totalSpent: number;
  averageOrderValue: number;
  favoriteProducts: Array<{
    productId: number;
    productName: string;
    timesPurchased: number;
    totalSpent: number;
  }>;
  purchaseFrequency: string;
  lastPurchaseDate: string;
  recommendedProducts: Array<{
    id: number;
    name: string;
    reason: string;
  }>;
}

export default function CustomerPurchaseHistory() {
  const { user } = useAuth();
  
  const { data: purchaseHistory, isLoading } = useQuery<CustomerPurchaseHistory>({
    queryKey: ['/api/analytics/customer', user?.id],
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen p-6 bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mt-20" />
      </div>
    );
  }

  if (!purchaseHistory) {
    return (
      <div className="min-h-screen p-6 bg-gray-50">
        <div className="text-center mt-20">
          <h2 className="text-xl font-semibold mb-2">No Purchase History</h2>
          <p className="text-gray-600">Start shopping to see your purchase analytics.</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString();
  };

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Purchase History</h1>
          <p className="text-gray-600">Insights into your shopping patterns and recommendations</p>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
              <ShoppingBag className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{purchaseHistory.totalPurchases}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Lifetime orders
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(purchaseHistory.totalSpent)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Lifetime spending
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Order</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(purchaseHistory.averageOrderValue)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Per order value
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Last Purchase</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatDate(purchaseHistory.lastPurchaseDate)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Most recent order
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Favorite Products */}
          <Card>
            <CardHeader>
              <CardTitle>Your Favorite Products</CardTitle>
              <CardDescription>Products you order most frequently</CardDescription>
            </CardHeader>
            <CardContent>
              {purchaseHistory.favoriteProducts.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No favorite products yet</p>
              ) : (
                <div className="space-y-4">
                  {purchaseHistory.favoriteProducts.slice(0, 5).map((product, index) => (
                    <div key={product.productId} className="flex items-center space-x-4">
                      <Badge variant="outline" className="w-8 h-8 rounded-full flex items-center justify-center">
                        {index + 1}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {product.productName}
                        </p>
                        <p className="text-sm text-gray-500">
                          Ordered {product.timesPurchased} times
                        </p>
                      </div>
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(product.totalSpent)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Shopping Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Shopping Insights</CardTitle>
              <CardDescription>Your shopping patterns and behavior</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Purchase Frequency</h4>
                  <p className="text-lg font-semibold">{purchaseHistory.purchaseFrequency}</p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Customer Level</h4>
                  <Badge variant="secondary">
                    {user?.customerLevel === 5 ? 'Premium' : 
                     user?.customerLevel === 4 ? 'Gold' : 
                     user?.customerLevel === 3 ? 'Silver' : 
                     user?.customerLevel === 2 ? 'Bronze' : 'Standard'}
                  </Badge>
                </div>

                {purchaseHistory.totalSpent > 1000 && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      🎉 You're a valued customer! You've spent over ${purchaseHistory.totalSpent.toFixed(0)} with us.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recommendations */}
        {purchaseHistory.recommendedProducts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Recommended for You</CardTitle>
              <CardDescription>Products we think you'll love based on your purchase history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {purchaseHistory.recommendedProducts.map((product) => (
                  <div key={product.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <h4 className="font-medium text-gray-900 mb-2">{product.name}</h4>
                    <p className="text-sm text-gray-600 mb-3">{product.reason}</p>
                    <Button size="sm" variant="outline" className="w-full">
                      View Product
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}