import React, { useState } from "react";
import { ShoppingBag, Trash2, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { AdminCartController } from "@/components/AdminCartController";
import { fmtUSD } from '@/lib/money';

// Define cart item type
interface CartItemType {
  id: number;
  productId: number;
  quantity: number;
  product: {
    id: number;
    name: string;
    price: number;
    imageUrl?: string;
    stock: number;
  };
}

import { fmtUSD } from '@/lib/money';
import { fetchCart, CART_KEY } from '@/lib/cartApi';
import { updateQuantity } from '@/lib/cartApi';

export function SimpleCartPage() {
  // State management
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [pickupDate, setPickupDate] = useState<string>('');
  const [pickupTime, setPickupTime] = useState<string>('');
  const [deliveryNote, setDeliveryNote] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  
  // Fetch cart data with consistent key
  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: CART_KEY,
    queryFn: fetchCart,
    enabled: isAuthenticated,
  });

  // Calculate cart total and item count
  const cartTotal = Array.isArray(cartItems) 
    ? cartItems.reduce((total: number, item: CartItemType) => 
        total + (item.product.price * item.quantity), 0)
    : 0;
  
  const itemCount = Array.isArray(cartItems) 
    ? cartItems.reduce((count: number, item: CartItemType) => 
        count + item.quantity, 0)
    : 0;

  // Fetch order settings
  const { data: orderSettings } = useQuery({
    queryKey: ['/api/admin/order-settings'],
    enabled: isAuthenticated,
  });

  // Safe defaults while you wire real settings
  const FREE_DELIVERY_THRESHOLD = 500;
  const BASE_DELIVERY_FEE = 25;
  
  const deliveryFee = orderType === 'delivery'
    ? (cartTotal >= FREE_DELIVERY_THRESHOLD ? 0 : BASE_DELIVERY_FEE)
    : 0;
  
  const totalWithDeliveryFee = cartTotal + deliveryFee;

  // Quantity update mutation that removes at zero  
  const updateQuantityMutation = useMutation({
    mutationFn: ({ productId, quantity }: { productId: number; quantity: number }) =>
      updateQuantity(productId, quantity), // API helper will remove if <= 0
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['/api/cart'] }),
  });
  
  // Safe, targeted cart clearing
  const clearCart = async () => {
    if (!isAuthenticated) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please log in to manage your cart"
      });
      return;
    }

    try {
      // Server-side clear based on authenticated session
      const response = await fetch("/api/cart", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to clear cart");
      }

      // Only invalidate the cart query
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });

      toast({
        title: "Cart reset complete",
        description: "Your cart has been cleared"
      });
    } catch (error) {
      console.error("Cart reset failed:", error);
      toast({
        variant: "destructive",
        title: "Cart Reset Failed",
        description: "Please try again"
      });
    }
  };
  
  // Handle order placement
  const handlePlaceOrder = async () => {
    if (!isAuthenticated) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please log in to place an order"
      });
      return;
    }
    
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Empty cart",
        description: "Please add items to your cart before ordering"
      });
      return;
    }
    
    setIsPlacingOrder(true);
    
    try {
      const orderData = {
        userId: user?.id || 'admin-user',
        items: cartItems.map((item: CartItemType) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.product.price
        })),
        orderType,
        deliveryNote,
        pickupDate: pickupDate || null,
        pickupTime,
        status: 'pending',
        total: cartTotal
      };
      
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });
      
      if (!response.ok) {
        throw new Error('Failed to place order');
      }
      
      const newOrder = await response.json();
      
      // Clear cart after successful order
      await clearCart();
      
      // Set success message
      toast({
        title: "Order placed successfully",
        description: `Your order #${newOrder.id} has been received.`
      });
      
      // Redirect to orders page
      setLocation('/orders');
    } catch (error) {
      console.error('Failed to place order:', error);
      toast({
        variant: "destructive",
        title: "Order failed",
        description: "Could not place your order. Please try again."
      });
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Render the cart page - ULTRA COMPACT
  return (
    <div className="container mx-auto max-w-lg py-4 px-3">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold flex items-center">
          <ShoppingBag className="mr-1 h-4 w-4" />
          Your Cart
          {itemCount > 0 && <span className="ml-1 text-sm">({itemCount})</span>}
        </h1>
        
        <Button 
          variant="ghost" 
          onClick={() => setLocation('/')}
          className="text-xs h-8 px-2"
          size="sm"
        >
          Continue Shopping
        </Button>
      </div>
      
      {isAuthLoading || isLoading ? (
        // Loading state - COMPACT
        <div className="space-y-2">
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex items-center p-2 border rounded-md">
              <Skeleton className="w-12 h-12 rounded-md" />
              <div className="ml-2 flex-1 space-y-1">
                <Skeleton className="h-3 w-2/3" />
                <div className="flex justify-between">
                  <Skeleton className="h-2 w-16" />
                  <Skeleton className="h-2 w-12" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : Array.isArray(cartItems) && cartItems.length > 0 ? (
        <div className="flex flex-col gap-4">
          {/* Cart items */}
          <div className="space-y-4">
            {/* Cart items - VERY COMPACT */}
            {cartItems.map((item: CartItemType) => (
              <div key={item.productId} className="flex border rounded-md p-2 relative items-center">
                <div className="w-12 h-12 rounded-md overflow-hidden flex-shrink-0">
                  {item.product.imageUrl ? (
                    <img 
                      src={item.product.imageUrl} 
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                      <ShoppingBag size={16} className="text-slate-400" />
                    </div>
                  )}
                </div>
                
                <div className="ml-2 flex-1">
                  <h3 className="font-medium text-sm">{item.product.name}</h3>
                  <div className="flex justify-between items-center">
                    <div className="text-xs text-muted-foreground flex items-center">
                      <Button
                        size="sm"
                        variant="outline" 
                        onClick={() => updateQuantityMutation.mutate({
                          productId: item.productId,
                          quantity: item.quantity - 1, // API helper will remove if <= 0
                        })}
                        disabled={updateQuantityMutation.isPending}
                        className="h-6 w-6 p-0 mr-2"
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span>{fmtUSD(item.product.price)} × {item.quantity}</span>
                    </div>
                    <span className="font-medium text-sm">
                      {fmtUSD(item.product.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            
            {/* Clear cart button - special handling for admin */}
            <div>
              {user?.id === 'admin-user' ? (
                <AdminCartController />
              ) : (
                <Button 
                  variant="outline" 
                  onClick={clearCart}
                  size="sm"
                  className="w-full text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 text-xs h-8"
                >
                  <Trash2 className="mr-1 h-3 w-3" />
                  Clear Cart
                </Button>
              )}
            </div>
          </div>
          
          {/* Order summary and options */}
          <div className="mt-6 space-y-4">
            {/* Order summary - COMPACT */}
            <div className="border rounded-lg p-3">
              <h2 className="font-medium text-sm mb-2">Order Summary</h2>
              
              <div>
                <div className="flex justify-between text-sm">
                  <span>Subtotal</span>
                  <span>{fmtUSD(cartTotal)}</span>
                </div>
                
                {/* Delivery fee display */}
                {orderType === 'delivery' && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Delivery Fee
                      {deliveryFee === 0 && (
                        <span className="text-green-600 ml-1">(Free over {fmtUSD(freeDeliveryThreshold)})</span>
                      )}
                    </span>
                    <span className={deliveryFee === 0 ? "text-green-600" : ""}>
                      {deliveryFee === 0 ? "FREE" : fmtUSD(deliveryFee)}
                    </span>
                  </div>
                )}
                
                <div className="flex justify-between font-medium text-sm pt-2 border-t mt-1">
                  <span>Total</span>
                  <span>{fmtUSD(totalWithDeliveryFee)}</span>
                </div>
                
                {/* Free delivery incentive */}
                {orderType === 'delivery' && deliveryFee > 0 && (
                  <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200 mt-2">
                    💡 Add {fmtUSD(freeDeliveryThreshold - cartTotal)} more to qualify for free delivery!
                  </div>
                )}
              </div>
            </div>
            
            {/* Important notices - VERY COMPACT */}
            <div className="border rounded-lg p-3 bg-amber-50 border-amber-200">
              <h3 className="font-medium text-amber-800 text-xs">NOTICES</h3>
              <ul className="text-xs text-amber-700 list-disc pl-4 mt-1">
                <li>All payments in person or upon delivery</li>
                <li>FEIN & Tobacco License required for tobacco</li>
              </ul>
            </div>
            
            {/* Delivery/Pickup options - COMPACT */}
            <div className="border rounded-lg p-3">
              <h2 className="font-medium text-sm mb-2">Delivery Options</h2>
              
              <RadioGroup 
                value={orderType} 
                onValueChange={(value) => setOrderType(value as 'delivery' | 'pickup')}
                className="space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="delivery" id="delivery" />
                  <Label htmlFor="delivery" className="cursor-pointer">Delivery (within 7 days)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pickup" id="pickup" />
                  <Label htmlFor="pickup" className="cursor-pointer">Store Pickup (choose date)</Label>
                </div>
              </RadioGroup>
              
              {orderType === 'pickup' && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <Label htmlFor="pickup-date" className="text-xs mb-1 block">Pickup Date</Label>
                    <Input
                      id="pickup-date"
                      type="date"
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                      className="h-8 text-sm"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="pickup-time" className="text-xs mb-1 block">Preferred Time</Label>
                    <select
                      id="pickup-time"
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="h-8 text-sm w-full rounded-md border border-input px-2"
                    >
                      <option value="">Select time</option>
                      <option value="morning">Morning (9-12)</option>
                      <option value="afternoon">Afternoon (12-5)</option>
                      <option value="evening">Evening (5-8)</option>
                    </select>
                  </div>
                </div>
              )}
              
              {orderType === 'delivery' && (
                <div className="mt-2">
                  <Label htmlFor="delivery-note" className="text-xs mb-1 block">Delivery Notes</Label>
                  <Textarea
                    id="delivery-note"
                    placeholder="Special delivery instructions"
                    className="h-16 text-sm"
                    value={deliveryNote}
                    onChange={(e) => setDeliveryNote(e.target.value)}
                  />
                </div>
              )}
            </div>
            
            {/* Place order button - COMPACT */}
            <Button 
              type="button"
              className="w-full h-9 text-sm" 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePlaceOrder();
              }}
              disabled={isPlacingOrder}
              style={{ WebkitAppearance: 'none', appearance: 'none' }}
            >
              {isPlacingOrder ? "Processing..." : "Place Order"}
            </Button>
          </div>
        </div>
      ) : (
        // Empty cart state - COMPACT
        <div className="text-center py-6 border rounded-lg">
          <ShoppingBag className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <h2 className="text-base font-medium mb-1">Your cart is empty</h2>
          <p className="text-xs text-muted-foreground mb-3">Add items to your cart</p>
          <Button 
            onClick={() => setLocation('/')}
            size="sm"
            className="h-8 px-3 py-1 text-xs"
          >
            Browse Products
          </Button>
        </div>
      )}
    </div>
  );
}

export default SimpleCartPage;
            Browse Products
          </Button>
        </div>
      )}
    </div>
  );
}

export default SimpleCartPage;