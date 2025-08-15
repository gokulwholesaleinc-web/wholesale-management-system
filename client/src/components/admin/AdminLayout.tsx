import React, { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  Users, 
  Settings, 
  LogOut, 
  UserCog,
  Activity,
  FolderOpen,
  Archive,
  FileText,
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Home,
  BarChart3,
  Database,
  CreditCard,
  Brain,
  Calculator,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";


interface AdminLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<string[]>(['core']);

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionId) 
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const menuSections = [
    {
      id: 'core',
      title: 'Core Management',
      items: [
        {
          name: "Dashboard",
          path: "/admin",
          icon: <LayoutDashboard className="h-5 w-5" />,
          badge: null,
        },
        {
          name: "Orders",
          path: "/admin/orders",
          icon: <ShoppingCart className="h-5 w-5" />,
          badge: "6",
        },
        {
          name: "Products",
          path: "/admin/products",
          icon: <Package className="h-5 w-5" />,
          badge: "222",
        },
      ]
    },
    {
      id: 'inventory',
      title: 'Inventory & Data',
      items: [
        {
          name: "Categories",
          path: "/admin/categories",
          icon: <FolderOpen className="h-5 w-5" />,
          badge: "18",
        },
        {
          name: "Purchase Orders",
          path: "/admin/purchase-orders",
          icon: <FileText className="h-5 w-5" />,
          badge: "34",
        },
        {
          name: "Backup System",
          path: "/admin/backup",
          icon: <Archive className="h-5 w-5" />,
          badge: null,
        },
      ]
    },
    {
      id: 'users',
      title: 'User Management',
      items: [
        {
          name: "Customers",
          path: "/admin/users",
          icon: <Users className="h-5 w-5" />,
          badge: "3",
        },
        {
          name: "Credit Management",
          path: "/admin/credit-management",
          icon: <CreditCard className="h-5 w-5" />,
          badge: null,
        },
        {
          name: "Staff",
          path: "/admin/staff",
          icon: <UserCog className="h-5 w-5" />,
          badge: "6",
        },
      ]
    },
    {
      id: 'system',
      title: 'System & Reports',
      items: [
        {
          name: "Activity Logs",
          path: "/admin/activity-logs",
          icon: <Activity className="h-5 w-5" />,
          badge: "100",
        },
        {
          name: "Tax Management",
          path: "/admin/tax-management",
          icon: <Calculator className="h-5 w-5" />,
          badge: null,
        },
        {
          name: "AI Analytics",
          path: "/admin/ai-analytics",
          icon: <BarChart3 className="h-5 w-5" />,
          badge: null,
        },
        {
          name: "AI Recommendations",
          path: "/admin/ai-recommendations",
          icon: <Brain className="h-5 w-5" />,
          badge: null,
        },
      ]
    }
  ];

  const NavigationSection = ({ section, isMobile = false }: { section: typeof menuSections[0], isMobile?: boolean }) => {
    const isExpanded = expandedSections.includes(section.id);
    
    return (
      <div className="mb-4">
        <button
          onClick={() => toggleSection(section.id)}
          className={`w-full flex items-center justify-between px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-lg transition-colors ${isMobile ? 'text-xs' : ''}`}
        >
          <span className="flex items-center">
            <Database className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'} mr-2`} />
            {section.title}
          </span>
          {isExpanded ? 
            <ChevronDown className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} /> : 
            <ChevronRight className={`${isMobile ? 'h-3 w-3' : 'h-4 w-4'}`} />
          }
        </button>
        
        {isExpanded && (
          <div className={`mt-2 space-y-1 ${isMobile ? 'ml-2' : 'ml-6'}`}>
            {section.items.map((item) => (
              <Link key={item.path} href={item.path}>
                <div
                  onClick={() => isMobile && setMobileMenuOpen(false)}
                  className={`flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-blue-50 transition-colors cursor-pointer ${
                    location === item.path
                      ? "bg-blue-100 text-blue-900 font-medium"
                      : "text-gray-700 hover:text-gray-900"
                  } ${isMobile ? 'text-xs py-1.5' : ''}`}
                >
                  <div className="flex items-center">
                    {item.icon}
                    <span className={`${isMobile ? 'ml-2' : 'ml-3'}`}>{item.name}</span>
                  </div>
                  {item.badge && (
                    <Badge variant="secondary" className={`${isMobile ? 'text-xs px-1' : 'text-xs'}`}>
                      {item.badge}
                    </Badge>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex min-h-screen bg-gray-50 w-full overflow-x-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-72 flex-col bg-white border-r border-gray-200 shadow-sm">
        <div className="p-6 border-b">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Settings className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Admin Panel</h1>
              <p className="text-xs text-gray-500">Gokul Wholesale</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {menuSections.map((section) => (
            <NavigationSection key={section.id} section={section} />
          ))}
        </nav>
        
        <div className="p-4 border-t bg-gray-50">
          <Button variant="outline" className="w-full justify-start hover:bg-red-50 hover:text-red-700 hover:border-red-200" asChild>
            <Link href="/api/logout">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Link>
          </Button>
        </div>
      </aside>

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="fixed top-3 left-3 z-50 lg:hidden bg-white shadow-lg border-gray-300 hover:bg-gray-50"
            >
              <Menu className="h-4 w-4" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0">
            <div className="flex flex-col h-full">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
                      <Settings className="h-3 w-3 text-white" />
                    </div>
                    <div>
                      <h1 className="text-lg font-bold text-gray-900">Admin Panel</h1>
                      <p className="text-xs text-gray-500">Gokul Wholesale</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <nav className="flex-1 px-3 py-4 space-y-2 overflow-y-auto">
                {menuSections.map((section) => (
                  <NavigationSection key={section.id} section={section} isMobile={true} />
                ))}
              </nav>
              
              <div className="p-4 border-t bg-gray-50">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full justify-start hover:bg-red-50 hover:text-red-700" 
                  asChild
                >
                  <Link href="/api/logout">
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </Link>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Main content wrapper */}
      <div className="flex flex-col flex-1 min-w-0 w-full">
        {/* Header with breadcrumbs */}
        <header className="bg-white border-b shadow-sm">
          <div className="px-4 py-3 lg:px-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <div className="lg:hidden">
                  {/* Space for mobile menu button */}
                  <div className="w-12"></div>
                </div>
                <div className="flex-1">
                  {/* NOTE: Do not add BreadcrumbNavigation here - individual pages handle their own breadcrumbs */}
                  {title && (
                    <h1 className="text-lg font-semibold text-gray-900 mt-1">{title}</h1>
                  )}
                </div>
              </div>
              
              {/* Quick actions */}
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" asChild className="hidden sm:flex">
                  <Link href="/admin">
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Dashboard
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </header>

        {/* Main content */}
        <main className="flex-1 w-full overflow-x-hidden max-w-full bg-gray-50">
          <div className="w-full max-w-full overflow-x-hidden">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}