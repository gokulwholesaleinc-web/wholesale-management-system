import * as React from "react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { Edit, DollarSign, Package, History, Image, Trash2, Eye } from "lucide-react"

interface Product {
  id: number
  name: string
  price: number
  stock: number
  [key: string]: any
}

interface ProductContextMenuProps {
  product: Product
  children: React.ReactNode
  onEdit?: (product: Product) => void
  onPriceUpdate?: (product: Product) => void
  onStockUpdate?: (product: Product) => void
  onPriceHistory?: (product: Product) => void
  onImageUpload?: (product: Product) => void
  onDelete?: (product: Product) => void
  onView?: (product: Product) => void
}

export function ProductContextMenu({
  product,
  children,
  onEdit,
  onPriceUpdate,
  onStockUpdate,
  onPriceHistory,
  onImageUpload,
  onDelete,
  onView
}: ProductContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        {onView && (
          <ContextMenuItem onClick={() => onView(product)}>
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </ContextMenuItem>
        )}
        
        {onEdit && (
          <ContextMenuItem onClick={() => onEdit(product)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Product
          </ContextMenuItem>
        )}
        
        {onPriceUpdate && (
          <ContextMenuItem onClick={() => onPriceUpdate(product)}>
            <DollarSign className="mr-2 h-4 w-4" />
            Update Price
          </ContextMenuItem>
        )}
        
        {onStockUpdate && (
          <ContextMenuItem onClick={() => onStockUpdate(product)}>
            <Package className="mr-2 h-4 w-4" />
            Update Stock
          </ContextMenuItem>
        )}
        
        <ContextMenuSeparator />
        
        {onPriceHistory && (
          <ContextMenuItem onClick={() => onPriceHistory(product)}>
            <History className="mr-2 h-4 w-4" />
            Price History
          </ContextMenuItem>
        )}
        
        {onImageUpload && (
          <ContextMenuItem onClick={() => onImageUpload(product)}>
            <Image className="mr-2 h-4 w-4" />
            Upload Image
          </ContextMenuItem>
        )}
        
        <ContextMenuSeparator />
        
        {onDelete && (
          <ContextMenuItem 
            onClick={() => onDelete(product)}
            className="text-red-600 focus:text-red-600"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Product
          </ContextMenuItem>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}