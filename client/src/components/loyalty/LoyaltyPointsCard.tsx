import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Gift, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface LoyaltyTransaction {
  id: number;
  orderId: number;
  transactionType: string;
  pointsAmount: number;
  orderTotal: number;
  description: string;
  createdAt: string;
}

export function LoyaltyPointsCard() {
  const { isAuthenticated } = useAuth();

  // Get current user's loyalty points
  const { data: loyaltyData } = useQuery({
    queryKey: ['/api/users/loyalty/points'],
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  });

  // Get recent loyalty transactions
  const { data: transactions } = useQuery<LoyaltyTransaction[]>({
    queryKey: ['/api/users/loyalty/transactions'],
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 5,
  });

  // Get order settings to show current loyalty rate
  const { data: orderSettings } = useQuery({
    queryKey: ['/api/admin/order-settings'],
    enabled: isAuthenticated,
    staleTime: 1000 * 60 * 10, // Cache for 10 minutes
  });

  if (!isAuthenticated) {
    return null;
  }

  const loyaltyPoints = (loyaltyData as any)?.loyaltyPoints || 0;
  const recentTransactions = transactions?.slice(0, 3) || [];
  const loyaltyRate = (((orderSettings as any)?.loyaltyPointsRate || 0.02) * 100).toFixed(1);

  return (
    <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-blue-900 text-sm">
          <Star className="h-4 w-4 text-yellow-500" />
          Loyalty Points
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 ml-auto text-xs">
            {Math.round(loyaltyPoints)} points
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Gift className="h-3 w-3 text-green-600" />
            <span className="text-xs text-gray-600">Earn {loyaltyRate}% on every order</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-blue-600">
            <TrendingUp className="h-3 w-3" />
            <span>Active</span>
          </div>
        </div>

        {recentTransactions.length > 0 && (
          <div>
            <h4 className="text-xs font-medium text-gray-900 mb-1">Recent Activity</h4>
            <div className="space-y-1">
              {recentTransactions.slice(0, 2).map((transaction) => (
                <div key={transaction.id} className="flex justify-between items-center text-xs">
                  <div>
                    <span className="text-gray-600">Order #{transaction.orderId}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-green-600 font-medium">
                      +{Math.round(transaction.pointsAmount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 border-t pt-2">
          Points awarded when orders are completed with payment.
        </div>
      </CardContent>
    </Card>
  );
}