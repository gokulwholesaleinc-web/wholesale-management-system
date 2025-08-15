import React from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/layout/AppLayout';
import { EmployeeManagement } from '@/components/admin/EmployeeManagement';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { BreadcrumbNavigation } from "@/components/navigation/BreadcrumbNavigation";

export default function AdminStaffManagement() {
  const { user, isLoading } = useAuth();
  
  // Only admins can access this page (employees cannot)
  if (!isLoading && (!user || !user.isAdmin)) {
    return (
      <AppLayout title="Unauthorized">
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-center mb-2">Admin Access Required</h1>
          <p className="text-gray-600 text-center mb-6">Staff management requires administrator privileges.</p>
          <Button asChild>
            <Link href="/">Return to Dashboard</Link>
          </Button>
        </div>
      </AppLayout>
    );
  }
  
  return (
    <AppLayout title="Staff Management">
      <div className="container py-6 mx-auto space-y-6">
        <BreadcrumbNavigation />
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Staff Management</h1>
          <Button asChild variant="outline">
            <Link href="/admin">Back to Admin Dashboard</Link>
          </Button>
        </div>
        
        <p className="text-gray-600">
          Create and manage accounts for employees and administrators. Employee accounts can manage products and orders
          but cannot access user management or create other staff accounts.
        </p>
        
        <EmployeeManagement />
      </div>
    </AppLayout>
  );
}