import { useLocation } from 'wouter';
import { Home, ChevronRight, Users, Package, ShoppingCart, Settings, BarChart3, FileText, User, Store, CreditCard, Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface BreadcrumbItem {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  isDropdown?: boolean;
  dropdownItems?: Array<{ label: string; href: string; icon?: React.ReactNode; }>;
}

export function BreadcrumbNavigation() {
  const [location] = useLocation();
  const { user } = useAuth();
  
  // Max items to show before collapsing
  const MAX_ITEMS = 4;

  // Generate breadcrumb items based on current path
  const generateBreadcrumbs = (path: string): BreadcrumbItem[] => {
    const segments = path.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      { label: 'Home', href: '/', icon: <Home className="h-4 w-4" /> }
    ];

    let currentPath = '';
    
    for (let i = 0; i < segments.length; i++) {
      currentPath += `/${segments[i]}`;
      const segment = segments[i];
      
      let label = formatSegmentLabel(segment, segments, i);
      let href = i === segments.length - 1 ? undefined : currentPath; // Last item has no href
      
      // Special handling for specific routes
      if (segment === 'admin') {
        // For admin panel
        breadcrumbs.push({ 
          label: 'Admin Panel', 
          href: '/admin',
          icon: <Settings className="h-4 w-4" />
        });
        // Continue to next segment if exists
        continue;
      } else if (segment === 'orders' && segments[i + 1]) {
        // For order detail pages like /orders/123 or /admin/orders/123
        if (!isNaN(Number(segments[i + 1]))) {
          // Check if this is within admin context by looking at previous segments
          const isAdminContext = segments.slice(0, i).includes('admin');
          const ordersPath = isAdminContext ? '/admin/orders' : '/orders';
          breadcrumbs.push({ label: 'Orders', href: ordersPath });
          breadcrumbs.push({ label: `Order #${segments[i + 1]}` });
          break;
        }
      } else if (segment === 'products' && segments[i + 1]) {
        // For product detail pages like /products/123
        if (!isNaN(Number(segments[i + 1]))) {
          breadcrumbs.push({ label: 'Products', href: currentPath });
          breadcrumbs.push({ label: `Product #${segments[i + 1]}` });
          break;
        }
      } else if (segment === 'staff') {
        // For staff dashboard
        breadcrumbs.push({ 
          label: 'Staff Dashboard', 
          href: '/staff',
          icon: <Users className="h-4 w-4" />
        });
        // Continue to next segment if exists
        continue;
      }
      
      // Add the current segment
      breadcrumbs.push({ 
        label, 
        href,
        icon: getSegmentIcon(segment, segments, i)
      });
    }

    return breadcrumbs;
  };

  // Enhanced icon mapping with role-based icons
  const getSegmentIcon = (segment: string, allSegments: string[], index: number) => {
    const iconMap: Record<string, React.ReactNode> = {
      'dashboard': <BarChart3 className="h-4 w-4" />,
      'products': <Package className="h-4 w-4" />,
      'orders': <FileText className="h-4 w-4" />,
      'account': <User className="h-4 w-4" />,
      'cart': <ShoppingCart className="h-4 w-4" />,
      'checkout': <CreditCard className="h-4 w-4" />,
      'admin': <Settings className="h-4 w-4" />,
      'staff': <Users className="h-4 w-4" />,
      'customers': <Users className="h-4 w-4" />,
      'settings': <Settings className="h-4 w-4" />,
      'notifications': <Bell className="h-4 w-4" />,
      'management': <Store className="h-4 w-4" />,
    };
    return iconMap[segment];
  };

  const formatSegmentLabel = (segment: string, allSegments: string[], index: number): string => {
    // Handle special cases with better naming
    const specialCases: Record<string, string> = {
      'dashboard': user?.isAdmin ? 'Admin Dashboard' : user?.isEmployee ? 'Staff Dashboard' : 'Dashboard',
      'products': 'Products',
      'orders': 'Orders',
      'account': 'My Account',
      'cart': 'Shopping Cart',
      'checkout': 'Checkout',
      'admin': 'Admin Panel',
      'staff': 'Staff Panel',
      'activity': 'Activity Logs',
      'manage-staff': 'Staff Management',
      'create-order': 'Create Order',
      'add-product': 'Add Product',
      'pricing': 'Pricing Management',
      'management': 'Management',
      'image-manager': 'Image Manager',
      'purchase-orders': 'Purchase Orders',
      'categories': 'Categories',
      'customers': 'Customers',
      'statistics': 'Statistics',
      'settings': 'Settings',
      'backup': 'Backup & Restore',
      'notifications': 'Notifications',
      'ai-invoice-processor': 'AI Invoice Processor',
      'activity-logs': 'Activity Logs',
    };

    if (specialCases[segment]) {
      return specialCases[segment];
    }

    // Handle IDs (numeric segments) with better context
    if (!isNaN(Number(segment))) {
      const prevSegment = allSegments[index - 1];
      if (prevSegment === 'orders') return `Order #${segment}`;
      if (prevSegment === 'products') return `Product #${segment}`;
      if (prevSegment === 'customers') return `Customer #${segment}`;
      if (prevSegment === 'purchase-orders') return `PO #${segment}`;
      return `#${segment}`;
    }

    // Default: capitalize first letter and replace hyphens with spaces
    return segment
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const breadcrumbs = generateBreadcrumbs(location);

  // Don't show breadcrumbs for home page or login
  if (location === '/' || location === '/login') {
    return null;
  }

  // Handle long breadcrumb chains with ellipsis
  const displayBreadcrumbs = breadcrumbs.length > MAX_ITEMS 
    ? [
        breadcrumbs[0], // Always show home
        { label: '...', isEllipsis: true },
        ...breadcrumbs.slice(-2) // Show last 2 items
      ]
    : breadcrumbs;

  return (
    <div className="mb-4">
      <Breadcrumb>
        <BreadcrumbList>
          {displayBreadcrumbs.map((item: any, index) => (
            <div key={index} className="flex items-center">
              <BreadcrumbItem>
                {item.isEllipsis ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-auto p-0">
                        <BreadcrumbEllipsis />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="center">
                      {breadcrumbs.slice(1, -2).map((hiddenItem, hiddenIndex) => (
                        <DropdownMenuItem key={hiddenIndex} asChild>
                          <a href={hiddenItem.href} className="flex items-center gap-2">
                            {hiddenItem.icon}
                            {hiddenItem.label}
                          </a>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : item.href ? (
                  <BreadcrumbLink href={item.href} className="flex items-center gap-2 hover:text-primary transition-colors">
                    {item.icon}
                    {item.label}
                  </BreadcrumbLink>
                ) : (
                  <BreadcrumbPage className="flex items-center gap-2 font-medium">
                    {item.icon}
                    {item.label}
                  </BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {index < displayBreadcrumbs.length - 1 && <BreadcrumbSeparator />}
            </div>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}