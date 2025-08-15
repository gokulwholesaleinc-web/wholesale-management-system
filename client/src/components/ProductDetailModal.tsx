import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Minus, ShoppingCart, Package, Barcode, Tag, Star, Truck } from 'lucide-react';
import { Product } from '@shared/schema';
import { useCart } from '@/hooks/useCart';
import { useToast } from '@/hooks/use-toast';

interface ProductDetailModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ProductDetailModal({ product, isOpen, onClose }: ProductDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCart();
  const { toast } = useToast();

  if (!product) return null;

  const handleAddToCart = async () => {
    try {
      await addToCart(product.id, quantity);
      toast({
        title: "Added to Cart",
        description: `${quantity} ${product.name} added to your cart`,
      });
      onClose();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item to cart",
        variant: "destructive",
      });
    }
  };

  const incrementQuantity = () => setQuantity(prev => prev + 1);
  const decrementQuantity = () => setQuantity(prev => Math.max(1, prev - 1));

  // Calculate pricing based on customer level (default to level 1)
  const getPrice = () => {
    return product.price || 0;
  };

  const currentPrice = getPrice();
  const totalPrice = currentPrice * quantity;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-[90vh] sm:max-h-[90vh] overflow-y-auto flex flex-col m-2 sm:m-8">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-left">
            {product.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {/* Product Image */}
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
            {product.imageUrl ? (
              <img 
                src={product.imageUrl} 
                alt={product.name}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <Package className="w-16 h-16" />
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-4">
            {/* Price */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-green-600">
                  ${currentPrice.toFixed(2)}
                </span>
                {product.basePrice && product.basePrice > currentPrice && (
                  <span className="text-sm text-gray-500 line-through">
                    ${product.basePrice.toFixed(2)}
                  </span>
                )}
              </div>
              
              {/* Stock Status */}
              <div className="flex items-center gap-2">
                {product.stock > 0 ? (
                  <Badge variant="secondary" className="bg-green-100 text-green-800">
                    <Package className="w-3 h-3 mr-1" />
                    {product.stock} in stock
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    Out of Stock
                  </Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Product Information */}
            <div className="space-y-3">
              {product.sku && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Barcode className="w-4 h-4" />
                  <span>SKU: {product.sku}</span>
                </div>
              )}
              
              {product.categoryId && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Tag className="w-4 h-4" />
                  <span>Category ID: {product.categoryId}</span>
                </div>
              )}

              {product.brand && (
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Star className="w-4 h-4" />
                  <span>Brand: {product.brand}</span>
                </div>
              )}

              {product.featured && (
                <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                  <Star className="w-3 h-3 mr-1" />
                  Featured Product
                </Badge>
              )}

              {product.freeShipping && (
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  <Truck className="w-3 h-3 mr-1" />
                  Free Delivery
                </Badge>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div className="space-y-2">
                <Separator />
                <div>
                  <h4 className="font-medium mb-2">Description</h4>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {product.description}
                  </p>
                </div>
              </div>
            )}

            <Separator />

            {/* Quantity Selector and Add to Cart */}
            {product.stock > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Quantity:</span>
                  <div className="flex items-center border rounded-md">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={decrementQuantity}
                      disabled={quantity <= 1}
                      className="h-8 w-8 p-0"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="px-3 py-1 text-sm font-medium min-w-[3rem] text-center">
                      {quantity}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={incrementQuantity}
                      disabled={quantity >= product.stock}
                      className="h-8 w-8 p-0"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Total Price */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total:</span>
                  <span className="text-lg font-bold text-green-600">
                    ${totalPrice.toFixed(2)}
                  </span>
                </div>

                {/* Add to Cart Button */}
                <Button
                  onClick={handleAddToCart}
                  disabled={false}
                  className="w-full"
                  size="lg"
                >
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Add to Cart
                </Button>
              </div>
            )}

            {product.stock === 0 && (
              <Button disabled className="w-full" size="lg">
                Out of Stock
              </Button>
            )}
          </div>
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}