import React from 'react';
import { useLocation } from 'wouter';
import { AppLayout } from '@/layout/AppLayout';
import { UnifiedOrderDetail } from '@/components/shared/UnifiedOrderDetail';
import { useAuth } from '@/hooks/useAuth';

export default function OrderDetailPage() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  console.log('📄 OrderDetailPage Debug:', {
    location,
    userInfo: user ? { id: user.id, isAdmin: user.isAdmin, isEmployee: user.isEmployee } : 'No user',
    pathname: window.location.pathname
  });
  
  // Determine role-based features and back URL
  const isAdminRoute = location.startsWith('/admin/');
  const isStaffRoute = location.startsWith('/staff/');
  const showAdminFeatures = isAdminRoute || isStaffRoute || user?.isAdmin || user?.isEmployee;
  
  let backUrl = '/orders';
  let title = 'Order Details';
  
  if (isAdminRoute) {
    backUrl = '/admin/orders';
    title = 'Admin - Order Details';
  } else if (isStaffRoute) {
    backUrl = '/staff/orders';
    title = 'Staff - Order Details';
  }

  return (
    <AppLayout title={title}>
      <div className="container mx-auto py-6">
        <UnifiedOrderDetail 
          backUrl={backUrl}
          showAdminFeatures={showAdminFeatures}
        />
      </div>
    </AppLayout>
  );
}