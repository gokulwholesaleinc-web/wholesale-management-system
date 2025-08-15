import { Link } from "wouter";
import { Home, ChevronRight } from "lucide-react";
import { useLocation } from "wouter";

export function BreadcrumbNavigation() {
  const [location] = useLocation();
  
  const pathSegments = location.split('/').filter(Boolean);
  
  const getBreadcrumbs = () => {
    const breadcrumbs = [
      { name: 'Home', href: '/', icon: Home }
    ];
    
    let currentPath = '';
    
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      
      // Format segment names
      let name = segment;
      if (segment === 'admin') {
        name = 'Admin';
      } else if (segment === 'bulk-operations') {
        name = 'Bulk Operations';
      } else if (segment === 'ai-analytics') {
        name = 'AI Analytics';
      } else if (segment === 'ai-recommendations') {
        name = 'AI Recommendations';
      } else if (segment === 'purchase-orders') {
        name = 'Purchase Orders';
      } else if (segment === 'categories') {
        name = 'Categories';
      } else if (segment === 'products') {
        name = 'Products';
      } else if (segment === 'orders') {
        name = 'Orders';
      } else {
        // Capitalize and replace hyphens with spaces
        name = segment.replace(/-/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }
      
      breadcrumbs.push({
        name,
        href: currentPath,
        icon: null
      });
    });
    
    return breadcrumbs;
  };
  
  const breadcrumbs = getBreadcrumbs();
  
  if (breadcrumbs.length <= 1) {
    return null;
  }
  
  return (
    <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-4">
      {breadcrumbs.map((breadcrumb, index) => (
        <div key={breadcrumb.href} className="flex items-center">
          {index > 0 && <ChevronRight className="h-4 w-4 mx-2 text-gray-400" />}
          
          {index === breadcrumbs.length - 1 ? (
            <span className="text-gray-900 font-medium flex items-center">
              {breadcrumb.icon && <breadcrumb.icon className="h-4 w-4 mr-1" />}
              {breadcrumb.name}
            </span>
          ) : (
            <Link href={breadcrumb.href}>
              <span className="hover:text-blue-600 transition-colors flex items-center cursor-pointer">
                {breadcrumb.icon && <breadcrumb.icon className="h-4 w-4 mr-1" />}
                {breadcrumb.name}
              </span>
            </Link>
          )}
        </div>
      ))}
    </nav>
  );
}