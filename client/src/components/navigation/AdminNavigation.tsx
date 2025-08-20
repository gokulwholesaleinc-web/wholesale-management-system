import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Button } from "@/components/ui/button";
import {
  Users,
  Package,
  ShoppingCart,
  BarChart,
  Settings,
  CreditCard,
  Receipt,
  Folder,
  Activity,
  FileText,
  TrendingUp,
  DollarSign,
} from "lucide-react";

export default function AdminNavigation() {
  const [location] = useLocation();

  const navItems = [
    {
      title: "Dashboard",
      href: "/admin",
      icon: BarChart,
    },
    {
      title: "Products & Inventory",
      icon: Package,
      items: [
        { title: "Product Management", href: "/admin/products", icon: Package },
        { title: "Add Products", href: "/admin/products/add", icon: Package },
        { title: "Categories", href: "/admin/categories", icon: Folder },
        { title: "Purchase Orders", href: "/admin/purchase-orders", icon: ShoppingCart },
        { title: "Bulk Operations", href: "/admin/bulk-operations", icon: Activity },
      ],
    },
    {
      title: "Orders & Sales",
      icon: ShoppingCart,
      items: [
        { title: "Order Management", href: "/admin/orders", icon: ShoppingCart },
        { title: "Order Settings", href: "/admin/order-settings", icon: Settings },
        { title: "Invoices", href: "/admin/invoices", icon: Receipt },
        { title: "Invoice Management", href: "/admin/invoice-management", icon: FileText },
      ],
    },
    {
      title: "Customers & Credit",
      icon: Users,
      items: [
        { title: "User Management", href: "/admin/users", icon: Users },
        { title: "Credit Management", href: "/admin/credit-management", icon: CreditCard },
        { title: "Accounts Receivable", href: "/admin/accounts-receivable", icon: DollarSign },
        { title: "Staff Management", href: "/admin/staff", icon: Users },
      ],
    },
    {
      title: "Analytics & Reports",
      icon: TrendingUp,
      items: [
        { title: "Business Intelligence", href: "/business-intelligence", icon: TrendingUp },
        { title: "AI Recommendations", href: "/admin/ai-recommendations", icon: BarChart },
        { title: "Excel Exports", href: "/admin/excel-exports", icon: FileText },
        { title: "Activity Logs", href: "/admin/activity-logs", icon: Activity },
      ],
    },
    {
      title: "System & Tools",
      icon: Settings,
      items: [
        { title: "Tax Management", href: "/admin/tax-management", icon: Receipt },
        { title: "AI Invoice Processor", href: "/admin/ai-invoice-processor", icon: FileText },
        { title: "Receipt Queue", href: "/admin/receipt-queue", icon: Receipt },
        { title: "Backup Management", href: "/admin/backup", icon: Settings },
      ],
    },
  ];

  const isActive = (href: string) => {
    if (href === "/admin") {
      return location === "/admin";
    }
    return location.startsWith(href);
  };

  return (
    <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <NavigationMenu>
          <NavigationMenuList className="flex flex-wrap">
            {navItems.map((item) => (
              <NavigationMenuItem key={item.title}>
                {item.items ? (
                  <>
                    <NavigationMenuTrigger className="bg-transparent">
                      <item.icon className="mr-2 h-4 w-4" />
                      {item.title}
                    </NavigationMenuTrigger>
                    <NavigationMenuContent>
                      <div className="grid w-[400px] gap-3 p-4 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                        {item.items.map((subItem) => (
                          <Link key={subItem.href} href={subItem.href}>
                            <NavigationMenuLink asChild>
                              <div
                                className={cn(
                                  "block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                                  isActive(subItem.href) && "bg-accent text-accent-foreground"
                                )}
                              >
                                <div className="flex items-center space-x-2">
                                  <subItem.icon className="h-4 w-4" />
                                  <div className="text-sm font-medium leading-none">
                                    {subItem.title}
                                  </div>
                                </div>
                              </div>
                            </NavigationMenuLink>
                          </Link>
                        ))}
                      </div>
                    </NavigationMenuContent>
                  </>
                ) : (
                  <Link href={item.href}>
                    <NavigationMenuLink asChild>
                      <Button
                        variant={isActive(item.href) ? "default" : "ghost"}
                        className="justify-start"
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.title}
                      </Button>
                    </NavigationMenuLink>
                  </Link>
                )}
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </div>
  );
}