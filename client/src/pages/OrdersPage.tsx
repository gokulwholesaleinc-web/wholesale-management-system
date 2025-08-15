import React from 'react';
import { AppLayout } from '@/layout/AppLayout';
import { UnifiedOrderList } from '@/components/shared/UnifiedOrderList';

export default function OrdersPage() {
  return (
    <AppLayout title="My Orders">
      <div className="container mx-auto py-6">
        <UnifiedOrderList 
          title="My Orders"
          emptyMessage="No orders yet"
          emptyDescription="Start shopping to see your orders here"
          baseUrl="/orders"
        />
      </div>
    </AppLayout>
  );
}