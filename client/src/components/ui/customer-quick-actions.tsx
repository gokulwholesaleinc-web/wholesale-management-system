import * as React from "react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { 
  MoreHorizontal, 
  History, 
  Edit, 
  CreditCard, 
  MapPin, 
  Eye,
  DollarSign
} from "lucide-react"

interface Customer {
  id: string
  username: string
  firstName?: string
  lastName?: string
  company?: string
  customerLevel: number
  creditLimit?: number
  [key: string]: any
}

interface CustomerQuickActionsProps {
  customer: Customer
  onViewHistory?: (customer: Customer) => void
  onEditInfo?: (customer: Customer) => void
  onManageCredit?: (customer: Customer) => void
  onAddAddress?: (customer: Customer) => void

  onViewPriceMemory?: (customer: Customer) => void
}

export function CustomerQuickActions({
  customer,
  onViewHistory,
  onEditInfo,
  onManageCredit,
  onAddAddress,

  onViewPriceMemory
}: CustomerQuickActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {onViewHistory && (
          <DropdownMenuItem onClick={() => onViewHistory(customer)}>
            <History className="mr-2 h-4 w-4" />
            View Order History
          </DropdownMenuItem>
        )}
        
        {onEditInfo && (
          <DropdownMenuItem onClick={() => onEditInfo(customer)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Customer Info
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        {onManageCredit && (
          <DropdownMenuItem onClick={() => onManageCredit(customer)}>
            <CreditCard className="mr-2 h-4 w-4" />
            Manage Credit Limit
          </DropdownMenuItem>
        )}
        
        {onAddAddress && (
          <DropdownMenuItem onClick={() => onAddAddress(customer)}>
            <MapPin className="mr-2 h-4 w-4" />
            Add Delivery Address
          </DropdownMenuItem>
        )}
        
        <DropdownMenuSeparator />
        
        {onViewPriceMemory && (
          <DropdownMenuItem onClick={() => onViewPriceMemory(customer)}>
            <DollarSign className="mr-2 h-4 w-4" />
            View Price Memory
          </DropdownMenuItem>
        )}
        

      </DropdownMenuContent>
    </DropdownMenu>
  )
}