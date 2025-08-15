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
  Package,
  Archive, 
  Trash2,
  BarChart3,
  Merge,
  Copy,
  Tag,
  Plus
} from 'lucide-react';

interface Category {
  id: number;
  name: string;
  description?: string;
  productCount?: number;
  isActive?: boolean;
}

interface CategoryActionsMenuProps {
  category: Category;
  onEdit: (category: Category) => void;
  onViewProducts: (categoryId: number) => void;
  onViewAnalytics: (categoryId: number) => void;
  onAddProduct: (categoryId: number) => void;
  onDuplicate: (category: Category) => void;
  onMergeCategory?: (categoryId: number) => void;
  onArchive?: (categoryId: number) => void;
  onDelete?: (categoryId: number) => void;
  currentUserRole?: 'admin' | 'staff' | 'customer';
  canEdit?: boolean;
}

export function CategoryActionsMenu({
  category,
  onEdit,
  onViewProducts,
  onViewAnalytics,
  onAddProduct,
  onDuplicate,
  onMergeCategory,
  onArchive,
  onDelete,
  currentUserRole = 'admin',
  canEdit = true
}: CategoryActionsMenuProps) {
  const isAdmin = currentUserRole === 'admin';
  const isStaff = currentUserRole === 'staff' || isAdmin;
  const isCustomer = currentUserRole === 'customer';

  const hasProducts = category.productCount && category.productCount > 0;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open category menu</span>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {/* View Actions */}
        <DropdownMenuItem onClick={() => onViewProducts(category.id)}>
          <Package className="mr-2 h-4 w-4" />
          View Products ({category.productCount || 0})
        </DropdownMenuItem>

        <DropdownMenuItem onClick={() => onViewAnalytics(category.id)}>
          <BarChart3 className="mr-2 h-4 w-4" />
          View Analytics
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Management Actions (Staff/Admin Only) */}
        {isStaff && canEdit && (
          <DropdownMenuItem onClick={() => onEdit(category)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Category
          </DropdownMenuItem>
        )}

        {isStaff && (
          <DropdownMenuItem onClick={() => onAddProduct(category.id)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product to Category
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Utility Actions (Staff/Admin Only) */}
        {isStaff && (
          <DropdownMenuItem onClick={() => onDuplicate(category)}>
            <Copy className="mr-2 h-4 w-4" />
            Duplicate Category
          </DropdownMenuItem>
        )}

        {/* Merge Action (Admin Only) */}
        {isAdmin && onMergeCategory && hasProducts && (
          <DropdownMenuItem onClick={() => onMergeCategory(category.id)}>
            <Merge className="mr-2 h-4 w-4" />
            Merge with Another Category
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Archive Action (Admin Only) */}
        {isAdmin && onArchive && (
          <DropdownMenuItem onClick={() => onArchive(category.id)}>
            <Archive className="mr-2 h-4 w-4" />
            Archive Category
          </DropdownMenuItem>
        )}

        {/* Destructive Actions (Admin Only) */}
        {isAdmin && onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={() => onDelete(category.id)}
              className={hasProducts ? "text-gray-400 cursor-not-allowed" : "text-red-600 hover:text-red-700 hover:bg-red-50"}
              disabled={hasProducts}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {hasProducts ? "Cannot Delete (Has Products)" : "Delete Category"}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}