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
  Camera, 
  Copy, 
  Star, 
  Archive, 
  Trash2,
  BarChart3,
  Clock,
  Package,
  ShoppingCart,
  Tag,
  DollarSign
} from 'lucide-react';

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  sku: string;
  featured?: boolean;
  imageUrl?: string;
  categoryId?: number;
}

interface ProductActionsMenuProps {
  product: Product;
  onEdit: (product: Product) => void;
  onDuplicate: (product: Product) => void;
  onToggleFeatured: (productId: number, featured: boolean) => void;
  onViewPriceHistory: (productId: number) => void;
  onViewSalesAnalytics: (productId: number) => void;
  onAddToCart: (productId: number) => void;
  onArchive?: (productId: number) => void;
  onDelete?: (productId: number) => void;
  currentUserRole?: 'admin' | 'staff' | 'customer';
  canEdit?: boolean;
}

export function ProductActionsMenu({
  product,
  onEdit,
  onViewDetails,
  onUploadImage,
  onDuplicate,
  onToggleFeatured,
  onViewPriceHistory,
  onViewSalesAnalytics,
  onAddToCart,
  onUpdateStock,
  onArchive,
  onDelete,
  currentUserRole = 'admin',
  canEdit = true
}: ProductActionsMenuProps) {
  const isAdmin = currentUserRole === 'admin';
  const isStaff = currentUserRole === 'staff' || isAdmin;
  const isCustomer = currentUserRole === 'customer';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open product menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* Primary Actions */}
        {isStaff && canEdit && (
          <DropdownMenuItem onClick={() => onEdit(product)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Product
          </DropdownMenuItem>
        )}

        <DropdownMenuItem onClick={() => onViewSalesAnalytics(product.id)}>
          <BarChart3 className="mr-2 h-4 w-4" />
          Sales Analytics
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => onViewPriceHistory(product.id)}>
          <Clock className="mr-2 h-4 w-4" />
          Price History
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Feature Actions (Staff/Admin Only) */}
        {isStaff && (
          <DropdownMenuItem onClick={() => onToggleFeatured(product.id, !product.featured)}>
            <Star className={`mr-2 h-4 w-4 ${product.featured ? 'fill-yellow-400 text-yellow-400' : ''}`} />
            {product.featured ? 'Remove from Featured' : 'Add to Featured'}
          </DropdownMenuItem>
        )}

        {/* Utility Actions */}
        {isStaff && (
          <DropdownMenuItem onClick={() => onDuplicate(product)}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate Product
          </DropdownMenuItem>
        )}

        {/* Customer Actions */}
        {(isCustomer || isStaff) && (
          <DropdownMenuItem onClick={() => onAddToCart(product.id)}>
            <ShoppingCart className="mr-2 h-4 w-4" />
            Add to Cart
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Archive Action (Admin Only) */}
        {isAdmin && onArchive && (
          <DropdownMenuItem onClick={() => onArchive(product.id)}>
            <Archive className="mr-2 h-4 w-4" />
            Archive Product
          </DropdownMenuItem>
        )}

        {/* Destructive Actions (Admin Only) */}
        {isAdmin && onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete(product.id)}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Product
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}