import { AppLayout } from "@/layout/AppLayout";
import { LoyaltyRedemptionHistory } from "@/components/loyalty/LoyaltyRedemptionHistory";
import { Button } from "@/components/ui/button";
import { ArrowLeft, History } from "lucide-react";
import { Link } from "wouter";

export default function LoyaltyRedemptionHistoryPage() {
  return (
    <AppLayout title="Loyalty Redemption History" description="View your loyalty points redemption history and savings">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header with Back Navigation */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <History className="h-6 w-6 text-green-600" />
              Loyalty Redemption History
            </h1>
            <p className="text-gray-600">
              Track your loyalty points usage and total savings
            </p>
          </div>
        </div>

        {/* Loyalty Redemption History Component */}
        <LoyaltyRedemptionHistory />
      </div>
    </AppLayout>
  );
}