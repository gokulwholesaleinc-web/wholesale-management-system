import { useAuth } from "@/hooks/useAuth";
import { StatsCard } from "./StatsCard";
import { Skeleton } from "@/components/ui/skeleton";
import { ShoppingBag, Truck, Tag } from "lucide-react";
import { useUnifiedOrders } from "@/lib/unified-api-registry";

export function WelcomeSection() {
  const { user } = useAuth();
  
  // Use unified orders hook instead of duplicate query
  const { orders, isOrdersLoading: ordersLoading } = useUnifiedOrders();
  
  // Calculate real-time statistics
  const stats = {
    totalOrders: orders?.length || 0,
    pendingDeliveries: orders?.filter(order => 
      order.orderType === 'delivery' && (
        order.status === 'pending' || 
        order.status === 'processing' || 
        order.status === 'ready'
      )
    )?.length || 0
  };
  
  const isLoading = ordersLoading;

  // Get user's first name
  const firstName = user?.firstName || user?.email?.split('@')[0] || 'there';
  
  return (
    <section className="mb-8 bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 md:p-8">
        <h1 className="text-2xl md:text-3xl font-bold font-heading mb-2">
          Welcome back, {isLoading ? <Skeleton className="inline-block h-8 w-24" /> : firstName}!
        </h1>
        <p className="text-slate-600 mb-4">
          Browse our latest inventory and place your orders with ease.
        </p>
        
        <div className="flex flex-wrap gap-4 mt-6">
          {isLoading ? (
            <>
              <Skeleton className="h-20 w-32" />
              <Skeleton className="h-20 w-32" />
            </>
          ) : (
            <>
              <StatsCard 
                icon={<ShoppingBag />}
                label="Total orders"
                value={stats?.totalOrders || 0}
                color="blue"
              />
              <StatsCard 
                icon={<Truck />}
                label="Pending delivery"
                value={stats?.pendingDeliveries || 0}
                color="emerald"
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
