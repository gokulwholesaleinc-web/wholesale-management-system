import React from 'react';
import { AppLayout } from '@/layout/AppLayout';
import { UnifiedOrderList } from '@/components/shared/UnifiedOrderList';

export default function AdminOrdersPage() {
  return (
    <AppLayout title="Admin - All Orders">
      <div className="container mx-auto py-6">
        <UnifiedOrderList 
          showCustomerInfo={true}
          title="All Orders"
          emptyMessage="No orders found"
          emptyDescription="Orders from customers will appear here"
          baseUrl="/admin/orders"
        />
      </div>
    </AppLayout>
  );
}