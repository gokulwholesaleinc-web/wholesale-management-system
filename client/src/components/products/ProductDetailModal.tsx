import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Package, ShoppingCart, Plus, Minus, Check, Star, Barcode, Info, DollarSign } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface ProductDetailModalProps {
  product: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductDetailModal({ product, open, onOpenChange }: ProductDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const addToCartMutation = useMutation({
    mutationFn: async ({ productId, quantity }: { productId: number; quantity: number }) => {
      return apiRequest('/api/cart/add', {
        method: 'POST',
        body: JSON.stringify({ productId, quantity })
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({
        title: "Success",
        description: `Added ${quantity} ${product?.name || 'item'}(s) to cart`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add item to cart",
        variant: "destructive",
      });
    },
  });

  const handleAddToCart = () => {
    if (!product?.id) {
      toast({
        title: "Error",
        description: "Product not found",
        variant: "destructive",
      });
      return;
    }

    addToCartMutation.mutate({ productId: product.id, quantity });
  };

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity < 1) return;
    if (product?.stock && newQuantity > product.stock) {
      toast({
        title: "Stock Limit",
        description: `Only ${product.stock} items available`,
        variant: "destructive",
      });
      return;
    }
    setQuantity(newQuantity);
  };

  // Get customer pricing based on level
  const getCustomerPrice = (product: any) => {
    if (!product || !user) return product?.price || 0;
    
    const customerLevel = user.customerLevel || 1;
    switch (customerLevel) {
      case 1:
        return product.priceLevel1 || product.price1 || product.price || 0;
      case 2:
        return product.priceLevel2 || product.price2 || product.price || 0;
      case 3:
        return product.priceLevel3 || product.price3 || product.price || 0;
      case 4:
        return product.priceLevel4 || product.price4 || product.price || 0;
      case 5:
        return product.priceLevel5 || product.price5 || product.price || 0;
      default:
        return product.price || 0;
    }
  };

  const customerPrice = getCustomerPrice(product);
  const basePrice = product?.basePrice || product?.price || 0;
  const discount = basePrice > customerPrice ? ((basePrice - customerPrice) / basePrice * 100) : 0;

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {product.name || 'Product Details'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Image and Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
                {product.imageUrl ? (
                  <img 
                    src={product.imageUrl} 
                    alt={product.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                      const parent = target.parentElement;
                      if (parent) {
                        parent.innerHTML = `
                          <div class="w-full h-full flex items-center justify-center">
                            <svg class="h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
                            </svg>
                          </div>
                        `;
                      }
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="h-16 w-16 text-gray-400" />
                  </div>
                )}
              </div>

              {/* Product Badges */}
              <div className="flex flex-wrap gap-2">
                {product.featured && (
                  <Badge className="bg-yellow-100 text-yellow-800">
                    <Star className="h-3 w-3 mr-1" />
                    Featured
                  </Badge>
                )}
                {product.stock > 0 ? (
                  <Badge className="bg-green-100 text-green-800">
                    <Check className="h-3 w-3 mr-1" />
                    In Stock ({product.stock})
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    Out of Stock
                  </Badge>
                )}
                {discount > 0 && (
                  <Badge className="bg-red-100 text-red-800">
                    {discount.toFixed(0)}% Off
                  </Badge>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {/* Pricing */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-bold text-green-600">
                    ${customerPrice.toFixed(2)}
                  </span>
                  {discount > 0 && (
                    <span className="text-lg text-gray-500 line-through">
                      ${basePrice.toFixed(2)}
                    </span>
                  )}
                </div>
                {user?.customerLevel && (
                  <p className="text-sm text-gray-600">
                    Level {user.customerLevel} Customer Price
                  </p>
                )}
              </div>

              {/* Description */}
              {product.description && (
                <div>
                  <h3 className="font-semibold mb-2">Description</h3>
                  <p className="text-gray-600 text-sm">{product.description}</p>
                </div>
              )}

              {/* Quantity Selector */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Quantity</label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuantityChange(quantity - 1)}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-16 text-center font-medium">{quantity}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuantityChange(quantity + 1)}
                    disabled={product.stock && quantity >= product.stock}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  Total: ${(customerPrice * quantity).toFixed(2)}
                </p>
              </div>

              {/* Add to Cart Button */}
              <Button
                onClick={handleAddToCart}
                disabled={addToCartMutation.isPending || product.stock === 0}
                className="w-full"
                size="lg"
              >
                <ShoppingCart className="h-4 w-4 mr-2" />
                {addToCartMutation.isPending ? 'Adding...' : 'Add to Cart'}
              </Button>
            </div>
          </div>

          {/* Product Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Info className="h-4 w-4" />
                  Product Information
                </h3>
                <div className="space-y-2 text-sm">
                  {product.sku && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">SKU:</span>
                      <span className="font-medium">{product.sku}</span>
                    </div>
                  )}
                  {product.brand && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Brand:</span>
                      <span className="font-medium">{product.brand}</span>
                    </div>
                  )}
                  {product.size && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Size:</span>
                      <span className="font-medium">{product.size}</span>
                    </div>
                  )}
                  {product.weight && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Weight:</span>
                      <span className="font-medium">{product.weight}</span>
                    </div>
                  )}
                  {product.upcCode && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">UPC:</span>
                      <span className="font-medium flex items-center gap-1">
                        <Barcode className="h-3 w-3" />
                        {product.upcCode}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Pricing Tiers
                </h3>
                <div className="space-y-2 text-sm">
                  {[1, 2, 3, 4, 5].map(level => {
                    const price = level === 1 ? (product.priceLevel1 || product.price1 || product.price) :
                                  level === 2 ? (product.priceLevel2 || product.price2) :
                                  level === 3 ? (product.priceLevel3 || product.price3) :
                                  level === 4 ? (product.priceLevel4 || product.price4) :
                                  (product.priceLevel5 || product.price5);
                    
                    if (price && price > 0) {
                      return (
                        <div key={level} className={`flex justify-between ${user?.customerLevel === level ? 'font-bold text-green-600' : ''}`}>
                          <span className="text-gray-600">Level {level}:</span>
                          <span>${price.toFixed(2)}</span>
                        </div>
                      );
                    }
                    return null;
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}