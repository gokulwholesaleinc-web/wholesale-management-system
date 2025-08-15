import { memo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Star, Plus, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useOptimizedCart } from "@/hooks/useOptimizedCart";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  imageUrl?: string;
  stock: number;
  category?: string;
  rating?: number;
}

interface ProductCardProps {
  product: Product;
  showCategory?: boolean;
  compact?: boolean;
}

export const OptimizedProductCard = memo(function OptimizedProductCard({ 
  product, 
  showCategory = false, 
  compact = false 
}: ProductCardProps) {
  const { addToCart, isAddingToCart, cartItems } = useOptimizedCart();

  // Check if product is already in cart
  const isInCart = cartItems.some(item => item.productId === product.id);
  const cartQuantity = cartItems.find(item => item.productId === product.id)?.quantity || 0;

  const handleAddToCart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (product.stock <= 0) return;
    
    // Pass product data for optimistic updates
    addToCart(product.id, 1, product);
  }, [product, addToCart]);

  const formatPrice = (price: number) => 
    new Intl.NumberFormat('en-US', { 
      style: 'currency', 
      currency: 'USD' 
    }).format(price);

  const isOutOfStock = product.stock <= 0;
  const isLowStock = product.stock > 0 && product.stock <= 10;

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 border rounded-lg hover:shadow-md transition-shadow">
        {product.imageUrl && (
          <img 
            src={product.imageUrl} 
            alt={product.name}
            className="w-12 h-12 object-cover rounded"
            loading="lazy"
          />
        )}
        
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm truncate">{product.name}</h3>
          <p className="text-lg font-semibold text-blue-600">{formatPrice(product.price)}</p>
        </div>

        <Button
          onClick={handleAddToCart}
          disabled={isAddingToCart || isOutOfStock}
          size="sm"
          className="shrink-0"
          aria-label={`Add ${product.name} to cart`}
        >
          {isInCart ? (
            <>
              <Check className="h-3 w-3 mr-1" />
              {cartQuantity}
            </>
          ) : isAddingToCart ? (
            <div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full" />
          ) : (
            <Plus className="h-3 w-3" />
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="group bg-white rounded-lg border shadow-sm hover:shadow-lg transition-all duration-200 overflow-hidden">
      {/* Product Image */}
      <div className="relative aspect-square bg-gray-100">
        {product.imageUrl ? (
          <img 
            src={product.imageUrl} 
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <ShoppingCart className="h-12 w-12" />
          </div>
        )}

        {/* Stock Status Badge */}
        {isOutOfStock && (
          <Badge variant="destructive" className="absolute top-2 right-2">
            Out of Stock
          </Badge>
        )}
        {isLowStock && (
          <Badge variant="secondary" className="absolute top-2 right-2">
            Low Stock
          </Badge>
        )}

        {/* Category Badge */}
        {showCategory && product.category && (
          <Badge variant="outline" className="absolute top-2 left-2 bg-white/90">
            {product.category}
          </Badge>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4">
        <div className="mb-2">
          <h3 className="font-semibold text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
            {product.name}
          </h3>
          
          {product.description && (
            <p className="text-sm text-gray-600 mt-1 line-clamp-2">
              {product.description}
            </p>
          )}
        </div>

        {/* Rating */}
        {product.rating && (
          <div className="flex items-center gap-1 mb-2">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm text-gray-600">{product.rating}</span>
          </div>
        )}

        {/* Price and Stock */}
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-xl font-bold text-blue-600">
              {formatPrice(product.price)}
            </p>
            <p className="text-xs text-gray-500">
              Stock: {product.stock}
            </p>
          </div>
        </div>

        {/* Add to Cart Button */}
        <Button
          onClick={handleAddToCart}
          disabled={isAddingToCart || isOutOfStock}
          className="w-full"
          size="sm"
          aria-label={`Add ${product.name} to cart`}
        >
          {isInCart ? (
            <>
              <Check className="h-4 w-4 mr-2" />
              In Cart ({cartQuantity})
            </>
          ) : isAddingToCart ? (
            <>
              <div className="animate-spin h-4 w-4 mr-2 border-2 border-white border-t-transparent rounded-full" />
              Adding...
            </>
          ) : isOutOfStock ? (
            "Out of Stock"
          ) : (
            <>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Add to Cart
            </>
          )}
        </Button>

        {/* Quick Actions */}
        {isInCart && (
          <p className="text-xs text-center text-green-600 mt-2 font-medium">
            ✓ Added to cart
          </p>
        )}
      </div>
    </div>
  );
});

export default OptimizedProductCard;