import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Plus, Minus, Trash2, Sparkles, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useSimpleCart } from "@/hooks/simpleCart";

export function EnhancedCartPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const { totalItems } = useSimpleCart();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch cart items
  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ['/api/cart'],
    enabled: true,
  });



  // Update quantity mutation
  const updateQuantityMutation = useMutation({
    mutationFn: async ({ productId, quantity }: { productId: number; quantity: number }) => {
      return apiRequest(`/api/cart/update`, {
        method: 'POST',
        body: JSON.stringify({ productId, quantity }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({ title: "Cart updated" });
    },
    onError: () => {
      toast({ title: "Failed to update cart", variant: "destructive" });
    },
  });

  // Remove item mutation
  const removeItemMutation = useMutation({
    mutationFn: async (productId: number) => {
      return apiRequest(`/api/cart/remove`, {
        method: 'POST',
        body: JSON.stringify({ productId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({ title: "Item removed from cart" });
    },
    onError: () => {
      toast({ title: "Failed to remove item", variant: "destructive" });
    },
  });

  const cartSubtotal = Array.isArray(cartItems) ? 
    cartItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0) : 0;

  // AI Suggestions for checkout
  const { data: aiSuggestions, isLoading: suggestionsLoading } = useQuery({
    queryKey: ['/api/ai-suggestions/checkout', cartItems],
    enabled: isOpen && Array.isArray(cartItems) && cartItems.length > 0,
    queryFn: async () => {
      return await apiRequest('/api/ai-suggestions/checkout', {
        method: 'POST',
        body: { cartItems }
      });
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          className="w-full flex items-center p-2 rounded-lg text-slate-800 bg-amber-100 hover:bg-amber-200 relative shadow-md border-2 border-amber-300"
        >
          <ShoppingCart className="mr-3 h-5 w-5 text-amber-700" />
          <span className="font-semibold text-slate-800">Cart</span>
          {totalItems > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center font-bold"
            >
              {totalItems > 99 ? '99+' : totalItems}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-4xl h-[90vh] sm:max-h-[90vh] overflow-y-auto flex flex-col m-2 sm:m-8">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Shopping Cart
            {totalItems > 0 && (
              <Badge variant="secondary">{totalItems} item{totalItems !== 1 ? 's' : ''}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-6">
          {/* Cart Items */}
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-8">Loading cart...</div>
            ) : cartItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Your cart is empty
              </div>
            ) : (
              (cartItems as any[]).map((item: any) => (
                <div key={item.id} className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 border rounded-lg">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium truncate">{item.product?.name || 'Product'}</h3>
                    <p className="text-sm text-muted-foreground">
                      ${item.price.toFixed(2)} each
                    </p>
                  </div>
                  
                  <div className="flex items-center justify-between sm:gap-2">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantityMutation.mutate({ 
                          productId: item.productId, 
                          quantity: item.quantity - 1 
                        })}
                        disabled={item.quantity <= 1 || updateQuantityMutation.isPending}
                        className="h-8 w-8 p-0"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantityMutation.mutate({ 
                          productId: item.productId, 
                          quantity: item.quantity + 1 
                        })}
                        disabled={updateQuantityMutation.isPending}
                        className="h-8 w-8 p-0"
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => removeItemMutation.mutate(item.productId)}
                        disabled={removeItemMutation.isPending}
                        className="h-8 w-8 p-0 ml-2"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                    
                    <div className="text-right">
                      <p className="font-medium text-sm sm:text-base">
                        ${(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* AI Checkout Suggestions */}
          {Array.isArray(cartItems) && cartItems.length > 0 && (aiSuggestions?.suggestions?.length > 0 || suggestionsLoading) && (
            <div className="border-t pt-4">
              <Card className="mb-4">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    AI Checkout Suggestions
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {suggestionsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing your cart...
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {aiSuggestions?.suggestions?.slice(0, 3).map((suggestion: any, index: number) => (
                        <div key={index} className="text-sm p-2 bg-blue-50 rounded border-l-2 border-blue-200">
                          <p className="font-medium text-blue-800">{suggestion.title}</p>
                          <p className="text-blue-600 text-xs">{suggestion.description}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* Cart Summary */}
          {Array.isArray(cartItems) && cartItems.length > 0 && (
            <div className="border-t pt-4">
              <div className="flex justify-between items-center mb-4">
                <span className="text-lg font-medium">Subtotal:</span>
                <span className="text-lg font-bold">${cartSubtotal.toFixed(2)}</span>
              </div>
              
              <div className="flex gap-3">
                <Button 
                  onClick={() => setIsOpen(false)}
                  variant="outline" 
                  className="flex-1"
                >
                  Continue Shopping
                </Button>
                <Button 
                  onClick={() => {
                    setIsOpen(false);
                    window.location.href = '/checkout';
                  }}
                  className="flex-1"
                >
                  Proceed to Checkout
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}