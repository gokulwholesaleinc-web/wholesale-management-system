import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/layout/AppLayout';
import BusinessIntelligenceDashboard from '@/components/admin/BusinessIntelligenceDashboard';
import { Button } from '@/components/ui/button';
import { ArrowLeft, TrendingUp } from 'lucide-react';
import { Link } from 'wouter';
import { AlertTriangle } from 'lucide-react';

export default function BusinessIntelligencePage() {
  const { user } = useAuth();

  if (!user?.isAdmin) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
            <p className="text-gray-600">You need admin privileges to access Business Intelligence.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto p-4 max-w-7xl">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/admin">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <TrendingUp className="h-8 w-8" />
                Business Intelligence
              </h1>
              <p className="text-muted-foreground">Advanced analytics and insights for data-driven decision making</p>
            </div>
          </div>
        </div>

        <BusinessIntelligenceDashboard />
      </div>
    </AppLayout>
  );
}