import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  ShoppingBag, 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  Package, 
  Clock,
  Star,
  Award
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface CustomerStats {
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate: string | null;
  favoriteProducts: Array<{
    name: string;
    orderCount: number;
  }>;
  monthlySpending: Array<{
    month: string;
    amount: number;
  }>;
  pendingOrders: number;
  completedOrders: number;
  customerSince: string | null;
  loyaltyLevel: string;
  recentOrders: Array<{
    id: number;
    total: number;
    status: string;
    createdAt: string;
  }>;
  customerLevel: number;
}

function StatCard({ 
  icon, 
  title, 
  value, 
  subtitle, 
  color = "blue" 
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle?: string;
  color?: "blue" | "green" | "purple" | "orange";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-600 border-blue-200",
    green: "bg-green-50 text-green-600 border-green-200",
    purple: "bg-purple-50 text-purple-600 border-purple-200",
    orange: "bg-orange-50 text-orange-600 border-orange-200",
  };

  return (
    <Card className="h-full">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className={`p-2 rounded-lg ${colorClasses[color]} flex-shrink-0`}>
            {icon}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-600 truncate">{title}</p>
          <div className="min-h-[2rem] flex items-center">
            <p className="text-xl font-bold text-gray-900 leading-tight">{value}</p>
          </div>
          {subtitle && (
            <p className="text-xs text-gray-500 truncate">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function CustomerStatistics() {
  const { data: stats, isLoading, error } = useQuery<CustomerStats>({
    queryKey: ["/api/customer/statistics"],
    queryFn: () => apiRequest('/api/customer/statistics', { method: 'GET' }),
    retry: 1,
  });

  // If no stats available, show default/loading state
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="h-full">
            <CardContent className="p-3 md:p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-6 bg-gray-200 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Show stats or default values with proper array safety
  const displayStats = {
    totalOrders: stats?.totalOrders || 0,
    totalSpent: stats?.totalSpent || 0,
    averageOrderValue: stats?.averageOrderValue || 0,
    lastOrderDate: stats?.lastOrderDate || null,
    favoriteProducts: Array.isArray(stats?.favoriteProducts) ? stats.favoriteProducts : [],
    recentOrders: Array.isArray(stats?.recentOrders) ? stats.recentOrders : [],
    pendingOrders: stats?.pendingOrders || 0,
    completedOrders: stats?.completedOrders || 0,
    customerLevel: stats?.customerLevel || 1
  };

  // Debug logging to identify the issue with last order date
  console.log('CustomerStatistics Debug:', {
    rawStats: stats,
    lastOrderDateRaw: stats?.lastOrderDate,
    lastOrderDateType: typeof stats?.lastOrderDate,
    displayStatsLastOrderDate: displayStats.lastOrderDate,
    totalOrders: displayStats.totalOrders
  });

  const formatCurrency = (amount: number) => `$${amount.toFixed(2)}`;
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No previous orders';
    
    // Enhanced date handling with better validation
    try {
      const date = new Date(dateString);
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        console.warn('Invalid date string:', dateString);
        return 'Invalid date';
      }
      
      // Return shorter date format to prevent overflow
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } catch (error) {
      console.error('Date formatting error:', error, 'Input:', dateString);
      return 'Date error';
    }
  };

  if (isLoading) {
    return (
      <section className="mb-8">
        <div className="mb-4">
          <h2 className="text-xl font-semibold">Your Account Overview</h2>
          <p className="text-gray-600 text-sm">Track your ordering patterns and account status</p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="h-full">
              <CardContent className="p-3 md:p-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-6 bg-gray-200 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    );
  }

  if (!stats) {
    return (
      <section className="mb-8">
        <Card>
          <CardContent className="p-6 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Order History Yet</h3>
            <p className="text-gray-600">Start placing orders to see your account statistics and insights.</p>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="mb-8">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Your Account Overview</h2>
        <p className="text-gray-600 text-sm">Track your ordering patterns and account status</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<ShoppingBag className="h-4 w-4" />}
          title="Total Orders"
          value={displayStats.totalOrders}
          subtitle="All completed"
          color="blue"
        />
        
        <StatCard
          icon={<DollarSign className="h-4 w-4" />}
          title="Total Spent"
          value={formatCurrency(displayStats.totalSpent)}
          subtitle={`Avg: ${formatCurrency(displayStats.averageOrderValue)}`}
          color="green"
        />
        
        <StatCard
          icon={<Calendar className="h-4 w-4" />}
          title="Last Order"
          value={displayStats.lastOrderDate ? formatDate(displayStats.lastOrderDate) : 'No previous orders'}
          subtitle={`${displayStats.pendingOrders} pending`}
          color="purple"
        />
        
        <StatCard
          icon={<Package className="h-4 w-4" />}
          title="Completed Orders"
          value={displayStats.completedOrders}
          subtitle="Successfully delivered"
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-yellow-500" />
              Your Favorites
            </CardTitle>
          </CardHeader>
          <CardContent>
            {displayStats.favoriteProducts.length > 0 ? (
              <div className="space-y-2">
                {displayStats.favoriteProducts.slice(0, 3).map((product, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">{product.name}</span>
                    <span className="text-xs text-gray-500">{product.orderCount} orders</span>
                  </div>
                ))}
                {displayStats.favoriteProducts.length > 3 && (
                  <p className="text-xs text-gray-500 pt-1">
                    +{displayStats.favoriteProducts.length - 3} more products
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                No frequent orders yet. Start ordering to build your favorites list!
              </p>
            )}
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              Recent Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {displayStats.recentOrders.length > 0 ? (
              <div className="space-y-2">
                {displayStats.recentOrders.slice(0, 3).map((order, index) => (
                  <div key={index} className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-900">Order #{order.id}</span>
                    <div className="text-right">
                      <div className="text-sm font-medium">${order.total.toFixed(2)}</div>
                      <div className="text-xs text-gray-500 capitalize">{order.status}</div>
                    </div>
                  </div>
                ))}
                {displayStats.recentOrders.length > 3 && (
                  <p className="text-xs text-gray-500 pt-1">
                    +{displayStats.recentOrders.length - 3} more orders
                  </p>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-600">
                No recent orders. Place your first order to get started!
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}