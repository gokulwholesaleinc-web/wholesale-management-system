import * as React from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { 
  MoreVertical, 
  Plus, 
  ShoppingCart, 
  Package, 
  Users, 
  FileText, 
  Download,
  BarChart3,
  Settings,
  Database,
  History
} from "lucide-react"
import { useLocation } from "wouter"

interface AdminQuickActionsProps {
  variant?: "dashboard" | "page"
  size?: "sm" | "default" | "lg"
}

export function AdminQuickActions({ 
  variant = "dashboard", 
  size = "default" 
}: AdminQuickActionsProps) {
  const [, setLocation] = useLocation()

  const navigate = (path: string) => {
    setLocation(path)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size={size}>
          <MoreVertical className="h-4 w-4" />
          {variant === "dashboard" && <span className="ml-2">Quick Actions</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => navigate("/admin/products")}>
            <Plus className="mr-2 h-4 w-4" />
            Add New Product
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/pos")}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Create Customer Order
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/admin/purchase-orders")}>
            <FileText className="mr-2 h-4 w-4" />
            New Purchase Order
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/admin/invoices")}>
            <FileText className="mr-2 h-4 w-4" />
            Preview Invoices & Receipts
          </DropdownMenuItem>
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>Management</DropdownMenuLabel>
        
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => navigate("/admin/products")}>
            <Package className="mr-2 h-4 w-4" />
            Manage Products
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/admin/orders")}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Manage Orders
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/admin/customers")}>
            <Users className="mr-2 h-4 w-4" />
            Manage Customers
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/admin/users?tab=settings")}>
            <Settings className="mr-2 h-4 w-4" />
            Order & Delivery Settings
          </DropdownMenuItem>
        </DropdownMenuGroup>
        
        <DropdownMenuSeparator />
        <DropdownMenuLabel>System</DropdownMenuLabel>
        
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => navigate("/admin/backup")}>
            <Database className="mr-2 h-4 w-4" />
            Backup & Restore
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/admin/activity-logs")}>
            <History className="mr-2 h-4 w-4" />
            Activity Logs
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/admin/bulk-operations")}>
            <Download className="mr-2 h-4 w-4" />
            Bulk Operations
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}