import { WelcomeSection } from "@/components/dashboard/WelcomeSection";
import { ProductGrid } from "@/components/products/ProductGrid";
import { RecentOrders } from "@/components/dashboard/RecentOrders";
import { RecommendationCarousel } from "@/components/recommendations/RecommendationCarousel";
import { CustomerStatistics } from "@/components/dashboard/CustomerStatistics";
import { LoyaltyPointsCard } from "@/components/loyalty/LoyaltyPointsCard";
import { AppLayout } from "@/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { LogIn, ShoppingCart, Clock, TrendingUp, Zap, Package, Search, Plus, Eye, DollarSign, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
// OrderDetailModal removed - using UnifiedOrderDetail component
import { useUnifiedCart } from "@shared/function-registry";
import { useUnifiedOrders } from "@/lib/unified-api-registry";

export default function Dashboard() {
  const { isAuthenticated, user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { bulkReorder } = useUnifiedCart();
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
  // Modal state removed - using navigation to order detail page

  // Use unified orders hook instead of duplicate query
  const { orders: recentOrders } = useUnifiedOrders();

  // Get trending products (actual best-selling products)
  const { data: trendingProducts, error: trendingError } = useQuery({
    queryKey: ['/api/analytics/trending-products'],
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 10,
    retry: false,
  });

  // Mutation to add items to cart
  const addToCartMutation = useMutation({
    mutationFn: async ({ productId, quantity }: { productId: number; quantity: number }) => {
      return apiRequest('POST', '/api/cart/add', { productId, quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({
        title: "Success",
        description: "Items added to cart successfully!",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add items to cart",
        variant: "destructive",
      });
    },
  });

  // Navigation to unified order detail page - removed modal functionality

  // Function to reorder all items from an order using bulk operation
  const handleReorderItems = async (order: any) => {
    if (!order.items || order.items.length === 0) {
      toast({
        title: "No Items",
        description: "This order has no items to reorder",
        variant: "destructive",
      });
      return;
    }

    try {
      // Prepare items for bulk reorder
      const itemsToAdd = order.items
        .filter((item: any) => item.productId && item.quantity)
        .map((item: any) => ({
          productId: Number(item.productId),
          quantity: Number(item.quantity)
        }));

      if (itemsToAdd.length === 0) {
        toast({
          title: "Error",
          description: "No valid items found to reorder",
          variant: "destructive",
        });
        return;
      }

      // Use bulk reorder function from unified registry
      bulkReorder(itemsToAdd);
    } catch (error) {
      console.error('Error reordering items:', error);
      toast({
        title: "Error",
        description: "Failed to reorder items. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return (
      <AppLayout title="Welcome to Gokul Wholesale" description="Log in to view our wholesale products and place orders">
        <div className="container mx-auto px-3 sm:px-4 py-6 sm:py-12 text-center">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl sm:text-3xl font-bold mb-4 sm:mb-6 text-blue-700">Gokul Wholesale</h1>
            <div className="bg-white p-4 sm:p-8 rounded-lg shadow-md mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4">Customer Login Required</h2>
              <p className="text-gray-600 mb-6">
                Welcome to our wholesale ordering system. This application is exclusively 
                for our registered customers. Please log in to browse our products, check pricing,
                and place orders.
              </p>
              <a 
                href="/login" 
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
              >
                <LogIn className="mr-2 h-5 w-5" />
                Login Now
              </a>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold mb-3">Not a customer yet?</h3>
              <p className="text-gray-600 mb-4">
                If you're interested in becoming a wholesale customer, please contact us 
                directly to set up an account.
              </p>
            </div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard" description="Your wholesale business dashboard with quick actions, inventory, and personalized recommendations">
      <div className="space-y-6">
        {/* Welcome Section */}
        <WelcomeSection />

        {/* Quick Actions Bar */}
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center text-blue-800">
              <Zap className="mr-2 h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Button variant="outline" className="h-20 flex-col space-y-2 hover:bg-blue-50" asChild>
                <Link href="/products">
                  <Search className="h-6 w-6 text-blue-600" />
                  <span className="text-sm font-medium">Browse Products</span>
                </Link>
              </Button>

              <Button variant="outline" className="h-20 flex-col space-y-2 hover:bg-green-50" asChild>
                <Link href="/account/balance">
                  <DollarSign className="h-6 w-6 text-green-600" />
                  <span className="text-sm font-medium">View Balance</span>
                </Link>
              </Button>

              <Button variant="outline" className="h-20 flex-col space-y-2 hover:bg-orange-50" asChild>
                <Link href="/orders">
                  <Clock className="h-6 w-6 text-orange-600" />
                  <span className="text-sm font-medium">Order History</span>
                </Link>
              </Button>
              <Button variant="outline" className="h-20 flex-col space-y-2 hover:bg-green-50" asChild>
                <Link href="/loyalty/history">
                  <History className="h-6 w-6 text-green-600" />
                  <span className="text-sm font-medium">Loyalty History</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>



        {/* Customer Statistics and Loyalty Points */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CustomerStatistics />
          </div>
          <div className="lg:col-span-1">
            <LoyaltyPointsCard />
          </div>
        </div>


        {/* Quick Reorder Section */}
        {recentOrders && Array.isArray(recentOrders) && recentOrders.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="mr-2 h-5 w-5 text-blue-600" />
                Quick Reorder
                <Badge variant="secondary" className="ml-2">
                  From Recent Orders
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {recentOrders.slice(0, 3).map((order: any) => (
                  <div key={order.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-medium">Order #{order.id}</h4>
                        <p className="text-sm text-gray-500">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={order.status === 'delivered' ? 'default' : 'secondary'}>
                        {order.status}
                      </Badge>
                    </div>
                    
                    {/* Order Items Preview */}
                    <div className="mb-3">
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-sm text-gray-600">
                          {order.items?.length || 0} items • ${order.total?.toFixed(2) || '0.00'}
                        </p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                          className="h-6 px-2"
                        >
                          <Eye className="h-3 w-3" />
                        </Button>
                      </div>
                      
                      {/* Expanded Order Items */}
                      {expandedOrder === order.id && order.items && order.items.length > 0 && (
                        <div className="mt-2 p-2 bg-gray-50 rounded text-xs space-y-2 max-h-40 overflow-y-auto">
                          {order.items.map((item: any, index: number) => (
                            <div key={index} className="flex items-center gap-2 p-1 bg-white rounded">
                              {/* Product Image */}
                              <div className="w-8 h-8 bg-gray-200 rounded overflow-hidden flex-shrink-0">
                                {(item.product?.imageUrl || item.imageUrl) ? (
                                  <img 
                                    src={item.product?.imageUrl || item.imageUrl} 
                                    alt={item.product?.name || item.productName || 'Product'}
                                    className="w-full h-full object-cover"
                                    onError={(e) => {
                                      const target = e.target as HTMLImageElement;
                                      target.style.display = 'none';
                                      const parent = target.parentElement;
                                      if (parent) {
                                        parent.innerHTML = `
                                          <div class="w-full h-full flex items-center justify-center bg-gray-300">
                                            <svg class="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                                            </svg>
                                          </div>
                                        `;
                                      }
                                    }}
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gray-300">
                                    <Package className="w-4 h-4 text-gray-500" />
                                  </div>
                                )}
                              </div>
                              
                              {/* Product Details */}
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-gray-900 truncate">
                                  {item.product?.name || item.productName || item.name || 'Unknown Item'}
                                </div>
                                {item.product?.sku && (
                                  <div className="text-gray-500 text-xs">
                                    SKU: {item.product.sku}
                                  </div>
                                )}
                              </div>
                              
                              {/* Quantity */}
                              <div className="text-gray-500 text-xs flex-shrink-0">
                                Qty: {item.quantity || 1}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Quick preview of first few items */}
                      {expandedOrder !== order.id && order.items && order.items.length > 0 && (
                        <div className="text-xs text-gray-500 mt-1">
                          {order.items.slice(0, 2).map((item: any, index: number) => 
                            item.product?.name || item.productName || item.name || 'Item'
                          ).join(', ')}
                          {order.items.length > 2 && ` +${order.items.length - 2} more`}
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleReorderItems(order)}
                        disabled={addToCartMutation.isPending}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {addToCartMutation.isPending ? 'Adding...' : 'Reorder All'}
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleViewOrderDetails(order.id)}
                      >
                        <Eye className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}



        {/* Trending This Week */}
        {!trendingError && trendingProducts && (trendingProducts.products || trendingProducts).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="mr-2 h-5 w-5 text-green-600" />
                Best Selling Products
                <Badge variant="secondary" className="ml-2">
                  {(trendingProducts.products || trendingProducts).length} items
                </Badge>
              </CardTitle>
              <p className="text-sm text-gray-600">
                Most popular items from the last {trendingProducts.metadata?.periodDays || 30} days
                {trendingProducts.metadata?.lastUpdated && (
                  <span className="block text-xs text-gray-500 mt-1">
                    Updated: {new Date(trendingProducts.metadata.lastUpdated).toLocaleDateString()}
                  </span>
                )}
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {(trendingProducts.products || trendingProducts).slice(0, 6).map((product: any) => (
                  <div key={product.id || Math.random()} className="text-center">
                    <div className="w-full h-24 bg-gray-100 rounded-lg mb-2 overflow-hidden">
                      {product.imageUrl ? (
                        <img 
                          src={product.imageUrl} 
                          alt={product.name || 'Product'}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `
                                <div class="w-full h-full flex items-center justify-center">
                                  <svg class="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                                  </svg>
                                </div>
                              `;
                            }
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <h4 className="text-sm font-medium truncate" title={product.name || 'Unknown Product'}>
                      {product.name || 'Unknown Product'}
                    </h4>
                    <p className="text-xs text-gray-500">
                      ${product.price ? Number(product.price).toFixed(2) : '0.00'}
                    </p>
                    {product.totalSold && (
                      <p className="text-xs text-green-600 font-medium">
                        {product.totalSold} sold
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        

        {/* Recent Orders */}
        <RecentOrders />
      </div>

      {/* Order Detail Modal replaced with navigation to unified order detail page */}
    </AppLayout>
  );
}