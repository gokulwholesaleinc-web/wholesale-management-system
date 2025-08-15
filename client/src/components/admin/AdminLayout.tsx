/**
 * Centralized Admin Layout with Navigation
 * Provides consistent admin UI structure across all admin pages
 */

import React from 'react';
import { Link, useLocation } from 'wouter';
import { AppLayout } from '@/layout/AppLayout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BreadcrumbNavigation } from '@/components/BreadcrumbNavigation';
import { 
  Users, 
  ShoppingCart, 
  Package, 
  Tags, 
  Calculator, 
  Star, 
  FileText, 
  Database, 
  UserCheck, 
  Activity, 
  BarChart3,
  Settings,
  Shield
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { normalizeUserRoles, isAdmin } from '../../../shared/roleUtils';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: BarChart3 },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
  { label: 'Products', href: '/admin/products', icon: Package },
  { label: 'Categories', href: '/admin/categories', icon: Tags },
  { label: 'Tax Management', href: '/admin/tax', icon: Calculator },
  { label: 'Loyalty Points', href: '/admin/loyalty', icon: Star },
  { label: 'Account Requests', href: '/admin/account-requests', icon: UserCheck },
  { label: 'Exports', href: '/admin/exports', icon: FileText },
  { label: 'Backups', href: '/admin/backups', icon: Database, adminOnly: true },
  { label: 'System Health', href: '/admin/system-health', icon: Activity, adminOnly: true },
  { label: 'Business Insights', href: '/admin/business-insights', icon: BarChart3, adminOnly: true },
];

export function AdminLayout({ children, title, breadcrumbs = [] }: AdminLayoutProps) {
  const { user } = useAuth();
  const [location] = useLocation();

  if (!user) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Shield className="mx-auto h-12 w-12 text-gray-400" />
            <h2 className="mt-2 text-lg font-medium text-gray-900">Authentication Required</h2>
            <p className="mt-1 text-sm text-gray-600">Please log in to access admin features.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  const normalizedUser = normalizeUserRoles(user);
  
  if (!isAdmin(normalizedUser)) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <Shield className="mx-auto h-12 w-12 text-red-400" />
            <h2 className="mt-2 text-lg font-medium text-gray-900">Admin Access Required</h2>
            <p className="mt-1 text-sm text-gray-600">You don't have permission to access this page.</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // Filter nav items based on user permissions
  const filteredNavItems = navItems.filter(item => 
    !item.adminOnly || normalizedUser.roles.includes('admin')
  );

  return (
    <AppLayout>
      <div className="flex min-h-screen bg-gray-50">
        {/* Sidebar */}
        <div className="hidden md:flex md:w-64 md:flex-col">
          <div className="flex flex-col flex-grow pt-5 bg-white shadow-sm border-r">
            <div className="flex items-center flex-shrink-0 px-4">
              <div className="flex items-center">
                <Settings className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <h1 className="text-xl font-semibold text-gray-900">Admin Panel</h1>
                  <p className="text-sm text-gray-600">
                    Welcome, {normalizedUser.firstName || normalizedUser.username}
                  </p>
                </div>
              </div>
            </div>
            
            {/* User Role Badge */}
            <div className="px-4 mt-4">
              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                Administrator
              </Badge>
            </div>

            {/* Navigation */}
            <nav className="mt-8 flex-1">
              <div className="px-2 space-y-1">
                {filteredNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location === item.href || 
                    (item.href !== '/admin' && location.startsWith(item.href));
                  
                  return (
                    <Link key={item.href} href={item.href}>
                      <a className={`
                        group flex items-center px-2 py-2 text-sm font-medium rounded-md
                        ${isActive 
                          ? 'bg-blue-100 text-blue-900' 
                          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }
                      `}>
                        <Icon className={`
                          mr-3 flex-shrink-0 h-6 w-6
                          ${isActive ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}
                        `} />
                        {item.label}
                        {item.badge && (
                          <Badge variant="secondary" className="ml-auto text-xs">
                            {item.badge}
                          </Badge>
                        )}
                      </a>
                    </Link>
                  );
                })}
              </div>
            </nav>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-col flex-1 overflow-hidden">
          <main className="flex-1 relative overflow-y-auto focus:outline-none">
            <div className="py-6">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                {/* Breadcrumbs */}
                {breadcrumbs.length > 0 && (
                  <div className="mb-6">
                    <BreadcrumbNavigation items={breadcrumbs} />
                  </div>
                )}

                {/* Page header */}
                {title && (
                  <div className="pb-6">
                    <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                  </div>
                )}

                {/* Page content */}
                <div className="space-y-6">
                  {children}
                </div>
              </div>
            </div>
          </main>
        </div>

        {/* Mobile sidebar overlay */}
        <div className="md:hidden">
          {/* Would implement mobile menu here */}
        </div>
      </div>
    </AppLayout>
  );
}