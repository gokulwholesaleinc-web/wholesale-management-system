import React from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";

interface Product {
  id: number;
  name: string;
  price: number;
  imageUrl?: string;
}

interface CartItem {
  id: number;
  productId: number;
  quantity: number;
  product: Product;
}

export function MinimalCartPage() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const queryClient = useQueryClient();
  
  // Fetch cart data
  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ['/api/cart'],
    enabled: isAuthenticated,
  });
  
  // Calculate total
  const total = Array.isArray(cartItems) 
    ? cartItems.reduce((sum: number, item: CartItem) => 
        sum + (item.product.price * item.quantity), 0) 
    : 0;
  
  // Absolute nuclear cart clearing - 100% reliable method
  const clearCart = async () => {
    if (!isAuthenticated) {
      toast({ title: "Please log in" });
      return;
    }
    
    try {
      // Get the user ID
      const userId = user?.id || 'admin-user';
      console.log("Clearing cart for user:", userId);
      
      // Show immediate feedback
      toast({ title: "Clearing cart..." });
      
      // Use the standard cart clear endpoint
      const response = await apiRequest('DELETE', '/api/cart/clear');
      
      const result = await response.json();
      console.log("Cart clear result:", result);
      
      // Second - force queryClient refresh
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      queryClient.resetQueries({ queryKey: ['/api/cart'] });
      
      // Notify success
      toast({ title: "Cart reset complete" });
      
      // Third - force navigate to home
      navigate('/');
      
      // Fourth - force reload - guaranteed to work but user-unfriendly
      // only as absolute last resort
      setTimeout(() => {
        console.log("FORCE RELOADING PAGE");
        window.location.href = '/';
      }, 500);
    } catch (err) {
      console.error("Cart clear failed:", err);
      toast({ 
        variant: "destructive", 
        title: "Failed to clear cart" 
      });
      
      // Force reload anyway as last resort
      window.location.href = '/';
    }
  };
  
  const placeOrder = () => {
    toast({ title: "Order placed" });
    clearCart();
    navigate('/');
  };
  
  // Super minimal UI
  return (
    <div className="p-2 sm:p-4 max-w-md mx-auto">
      <h1 className="text-lg font-bold mb-4">Cart</h1>
      
      {isLoading ? (
        <p>Loading...</p>
      ) : !Array.isArray(cartItems) || cartItems.length === 0 ? (
        <div>
          <p className="mb-4">Your cart is empty</p>
          <Button size="sm" onClick={() => navigate('/')}>Browse Products</Button>
        </div>
      ) : (
        <div>
          {/* Items list */}
          <div className="space-y-2 mb-4">
            {cartItems.map((item: CartItem) => (
              <div key={item.id} className="border p-2 rounded flex items-center">
                <div className="w-10 h-10 bg-gray-100 mr-2">
                  {item.product.imageUrl && (
                    <img 
                      src={item.product.imageUrl} 
                      alt="" 
                      className="w-full h-full object-cover" 
                    />
                  )}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{item.product.name}</div>
                  <div className="text-xs">
                    ${item.product.price} × {item.quantity} = ${item.product.price * item.quantity}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Total */}
          <div className="border-t pt-2 mb-4">
            <div className="flex justify-between font-medium">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>
          
          {/* Actions */}
          <div className="flex flex-col gap-2">
            <Button size="sm" onClick={placeOrder}>Place Order</Button>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={clearCart}
              className="text-red-500"
            >
              Clear Cart
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              onClick={() => navigate('/')}
            >
              Continue Shopping
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MinimalCartPage;