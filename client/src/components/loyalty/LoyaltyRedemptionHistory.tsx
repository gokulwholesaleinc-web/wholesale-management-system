import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  History, 
  ShoppingBag, 
  Calendar, 
  DollarSign, 
  TrendingDown, 
  Receipt,
  Eye,
  ArrowRight
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { Link } from "wouter";

interface LoyaltyTransaction {
  id: number;
  orderId: number;
  transactionType: string;
  pointsAmount: number;
  orderTotal: number;
  description: string;
  createdAt: string;
}

export function LoyaltyRedemptionHistory() {
  const { isAuthenticated } = useAuth();
  const [showAllRedemptions, setShowAllRedemptions] = useState(false);

  // Get all loyalty transactions
  const { data: allTransactions, isLoading } = useQuery<LoyaltyTransaction[]>({
    queryKey: ['/api/users/loyalty/transactions'],
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });

  if (!isAuthenticated) {
    return null;
  }

  // Filter only redemption transactions (negative amounts)
  const redemptionTransactions = (allTransactions || [])
    .filter(transaction => transaction.transactionType === 'redeemed')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Calculate total statistics
  const totalPointsRedeemed = redemptionTransactions.reduce(
    (sum, transaction) => sum + Math.abs(transaction.pointsAmount), 
    0
  );
  
  const totalValueSaved = totalPointsRedeemed * 0.01; // 1 point = $0.01
  
  const totalOrdersWithRedemptions = redemptionTransactions.length;
  
  const averageRedemptionPerOrder = totalOrdersWithRedemptions > 0 
    ? totalPointsRedeemed / totalOrdersWithRedemptions 
    : 0;

  // Show limited or all redemptions based on state
  const displayedRedemptions = showAllRedemptions 
    ? redemptionTransactions 
    : redemptionTransactions.slice(0, 5);

  if (isLoading) {
    return (
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900">
            <History className="h-5 w-5" />
            Loyalty Redemption History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (redemptionTransactions.length === 0) {
    return (
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900">
            <History className="h-5 w-5" />
            Loyalty Redemption History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <TrendingDown className="h-12 w-12 text-green-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Redemptions Yet</h3>
            <p className="text-gray-600 mb-4">
              You haven't redeemed any loyalty points yet. Start using your points at checkout to save money on your orders!
            </p>
            <Button variant="outline" asChild>
              <Link href="/products">
                <ShoppingBag className="h-4 w-4 mr-2" />
                Shop Now
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-green-900">
          <History className="h-5 w-5" />
          Loyalty Redemption History
          <Badge variant="secondary" className="bg-green-100 text-green-800 ml-auto">
            {totalOrdersWithRedemptions} orders
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Statistics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-4 shadow-sm border border-green-100">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Total Redeemed</span>
            </div>
            <p className="text-2xl font-bold text-green-700">
              {totalPointsRedeemed.toFixed(0)}
            </p>
            <p className="text-xs text-gray-500">points</p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-green-100">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Value Saved</span>
            </div>
            <p className="text-2xl font-bold text-green-700">
              ${totalValueSaved.toFixed(2)}
            </p>
            <p className="text-xs text-gray-500">total savings</p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-green-100">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Orders</span>
            </div>
            <p className="text-2xl font-bold text-green-700">
              {totalOrdersWithRedemptions}
            </p>
            <p className="text-xs text-gray-500">with redemptions</p>
          </div>

          <div className="bg-white rounded-lg p-4 shadow-sm border border-green-100">
            <div className="flex items-center gap-2 mb-1">
              <Receipt className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-gray-700">Average</span>
            </div>
            <p className="text-2xl font-bold text-green-700">
              {averageRedemptionPerOrder.toFixed(0)}
            </p>
            <p className="text-xs text-gray-500">points per order</p>
          </div>
        </div>

        {/* Redemption History List */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Recent Redemptions
          </h4>
          <div className="space-y-3">
            {displayedRedemptions.map((transaction) => (
              <div 
                key={transaction.id} 
                className="bg-white rounded-lg p-4 shadow-sm border border-green-100 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                      <Receipt className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-gray-900">
                          {transaction.orderId ? `Order #${transaction.orderId}` : 'Manual Adjustment'}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          Redemption
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(transaction.createdAt).toLocaleDateString()}</span>
                        </div>
                        {transaction.orderId && (
                          <div className="flex items-center gap-1">
                            <ShoppingBag className="h-3 w-3" />
                            <span>Order Total: ${transaction.orderTotal?.toFixed(2) || '0.00'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg font-bold text-green-700">
                        -{Math.abs(transaction.pointsAmount).toFixed(0)}
                      </span>
                      <span className="text-sm text-gray-500">points</span>
                    </div>
                    <div className="text-sm text-green-600 font-medium">
                      Saved ${(Math.abs(transaction.pointsAmount) * 0.01).toFixed(2)}
                    </div>
                    {transaction.orderId && (
                      <div className="flex items-center gap-1 mt-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/orders/${transaction.orderId}`}>
                            <Eye className="h-3 w-3 mr-1" />
                            View Order
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Show More/Less Button */}
          {redemptionTransactions.length > 5 && (
            <div className="text-center mt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowAllRedemptions(!showAllRedemptions)}
                className="bg-white border-green-200 text-green-700 hover:bg-green-50"
              >
                {showAllRedemptions ? (
                  <>Show Less</>
                ) : (
                  <>
                    Show All {redemptionTransactions.length} Redemptions
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="text-xs text-gray-500 border-t border-green-100 pt-3">
          <p>
            Your loyalty point redemptions are automatically applied at checkout. 
            Each point is worth $0.01 and can be used to reduce your order total.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}