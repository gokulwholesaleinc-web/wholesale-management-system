import React from 'react';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { 
  MoreHorizontal, 
  Edit, 
  Eye, 
  ShoppingCart, 
  FileText, 
  MessageSquare,
  CreditCard,
  MapPin,
  Archive,
  Trash2,
  UserCheck,
  Ban,
  Crown,
  TrendingUp,
  Clock,
  Phone,
  Mail
} from 'lucide-react';

interface Customer {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  company?: string;
  customerLevel?: number;
  isActive?: boolean;
  totalOrders?: number;
  totalSpent?: number;
}

interface CustomerActionsMenuProps {
  customer: Customer;
  onViewDetails: (customerId: string) => void;
  onEditCustomer: (customerId: string) => void;
  onViewOrders: (customerId: string) => void;
  onCreateOrder: (customerId: string) => void;
  onViewInvoices: (customerId: string) => void;
  onViewAddresses: (customerId: string) => void;
  onViewAnalytics: (customerId: string) => void;
  onSendMessage: (customerId: string) => void;
  onCallCustomer?: (customerId: string) => void;
  onEmailCustomer?: (customerId: string) => void;
  onToggleStatus?: (customerId: string, active: boolean) => void;
  onUpgradeLevel?: (customerId: string) => void;
  onDowngradeLevel?: (customerId: string) => void;
  onArchive?: (customerId: string) => void;
  onDelete?: (customerId: string) => void;
  currentUserRole?: 'admin' | 'staff' | 'customer';
  canEdit?: boolean;
}

export function CustomerActionsMenu({
  customer,
  onViewDetails,
  onEditCustomer,
  onViewOrders,
  onCreateOrder,
  onViewInvoices,
  onViewAddresses,
  onViewAnalytics,
  onSendMessage,
  onCallCustomer,
  onEmailCustomer,
  onToggleStatus,
  onUpgradeLevel,
  onDowngradeLevel,
  onArchive,
  onDelete,
  currentUserRole = 'admin',
  canEdit = true
}: CustomerActionsMenuProps) {
  const isAdmin = currentUserRole === 'admin';
  const isStaff = currentUserRole === 'staff' || isAdmin;
  const isCustomer = currentUserRole === 'customer';

  const canUpgrade = customer.customerLevel && customer.customerLevel < 5;
  const canDowngrade = customer.customerLevel && customer.customerLevel > 1;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open customer menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* View Actions */}
        <DropdownMenuItem onClick={() => onViewDetails(customer.id)}>
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => onViewOrders(customer.id)}>
          <ShoppingCart className="mr-2 h-4 w-4" />
          View Orders ({customer.totalOrders || 0})
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => onViewInvoices(customer.id)}>
          <FileText className="mr-2 h-4 w-4" />
          View Invoices
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => onViewAddresses(customer.id)}>
          <MapPin className="mr-2 h-4 w-4" />
          View Addresses
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => onViewAnalytics(customer.id)}>
          <TrendingUp className="mr-2 h-4 w-4" />
          View Analytics
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Management Actions (Staff/Admin Only) */}
        {isStaff && canEdit && (
          <DropdownMenuItem onClick={() => onEditCustomer(customer.id)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Customer
          </DropdownMenuItem>
        )}

        {isStaff && (
          <DropdownMenuItem onClick={() => onCreateOrder(customer.id)}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Create Order
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Communication Actions */}
        <DropdownMenuItem onClick={() => onSendMessage(customer.id)}>
          <MessageSquare className="mr-2 h-4 w-4" />
          Send Message
        </DropdownMenuItem>

        {onCallCustomer && customer.phone && (
          <DropdownMenuItem onClick={() => onCallCustomer(customer.id)}>
            <Phone className="mr-2 h-4 w-4" />
            Call Customer
          </DropdownMenuItem>
        )}

        {onEmailCustomer && customer.email && (
          <DropdownMenuItem onClick={() => onEmailCustomer(customer.id)}>
            <Mail className="mr-2 h-4 w-4" />
            Email Customer
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Level Management (Admin Only) */}
        {isAdmin && canUpgrade && onUpgradeLevel && (
          <DropdownMenuItem onClick={() => onUpgradeLevel(customer.id)}>
            <Crown className="mr-2 h-4 w-4" />
            Upgrade Level (Level {customer.customerLevel} → {customer.customerLevel + 1})
          </DropdownMenuItem>
        )}

        {isAdmin && canDowngrade && onDowngradeLevel && (
          <DropdownMenuItem onClick={() => onDowngradeLevel(customer.id)}>
            <TrendingUp className="mr-2 h-4 w-4 rotate-180" />
            Downgrade Level (Level {customer.customerLevel} → {customer.customerLevel - 1})
          </DropdownMenuItem>
        )}

        {/* Status Management (Admin Only) */}
        {isAdmin && onToggleStatus && (
          <DropdownMenuItem 
            onClick={() => onToggleStatus(customer.id, !customer.isActive)}
            className={customer.isActive ? "text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50" : "text-green-600 hover:text-green-700 hover:bg-green-50"}
          >
            {customer.isActive ? (
              <>
                <Ban className="mr-2 h-4 w-4" />
                Deactivate Customer
              </>
            ) : (
              <>
                <UserCheck className="mr-2 h-4 w-4" />
                Activate Customer
              </>
            )}
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Archive Action (Admin Only) */}
        {isAdmin && onArchive && (
          <DropdownMenuItem onClick={() => onArchive(customer.id)}>
            <Archive className="mr-2 h-4 w-4" />
            Archive Customer
          </DropdownMenuItem>
        )}

        {/* Destructive Actions (Admin Only) */}
        {isAdmin && onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete(customer.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Customer
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}