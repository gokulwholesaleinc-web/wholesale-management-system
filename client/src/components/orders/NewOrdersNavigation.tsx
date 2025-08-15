import React from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Clock, CheckCircle, Truck, ShoppingCart } from 'lucide-react';

export function NewOrdersNavigation() {
  const [location] = useLocation();
  
  const navItems = [
    { path: '/admin/orders', label: 'Legacy Orders', icon: ShoppingCart },
    { path: '/admin/new-orders', label: 'New Orders (IL Compliance)', icon: Package, badge: 'NEW' },
  ];

  return (
    <div className="flex gap-2 mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
      <div className="flex items-center gap-2 text-blue-800 font-medium">
        <Package className="h-4 w-4" />
        Order Management:
      </div>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = location === item.path;
        
        return (
          <Link key={item.path} href={item.path}>
            <Button 
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              className="flex items-center gap-2"
            >
              <Icon className="h-4 w-4" />
              {item.label}
              {item.badge && (
                <Badge variant="secondary" className="ml-1 text-xs">
                  {item.badge}
                </Badge>
              )}
            </Button>
          </Link>
        );
      })}
    </div>
  );
}