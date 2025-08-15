import React, { useState, useEffect } from "react";
import { X, ShoppingBag, AlertTriangle, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CartItem } from "./CartItem";
import { CheckoutOptions } from "./CheckoutOptions";
import { CartNotice } from "./CartNotice";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

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

export function CartSidebar() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const { isAuthenticated, isLoading: isAuthLoading, user } = useAuth();
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [pickupDate, setPickupDate] = useState<string | null>(null);
  const [pickupTime, setPickupTime] = useState<string | null>(null);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [showTobaccoNotice, setShowTobaccoNotice] = useState(true);
  const [showPaymentNotice, setShowPaymentNotice] = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const queryClient = useQueryClient();
  
  // Function to refresh cart data
  const refreshCart = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    console.log('Cart refreshed');
  };
  
  // Expose the refreshCart function globally
  useEffect(() => {
    // Add the refreshCart function to the window object
    (window as any).refreshCart = refreshCart;
    
    // Remove the function when component unmounts
    return () => {
      delete (window as any).refreshCart;
    };
  }, [refreshCart]);

  // Function to toggle the cart sidebar
  const toggleCart = () => {
    setIsCartOpen(prev => !prev);
  };
  
  // Expose the toggleCart function globally
  useEffect(() => {
    // Add the toggleCart function to the window object
    (window as any).toggleCart = toggleCart;
    
    // Remove the function when component unmounts
    return () => {
      delete (window as any).toggleCart;
    };
  }, []);

  // Event listener for custom toggleCart event
  useEffect(() => {
    const toggleCartEvent = (event: CustomEvent) => {
      toggleCart();
    };

    window.addEventListener('toggleCart', toggleCartEvent as EventListener);

    return () => {
      window.removeEventListener('toggleCart', toggleCartEvent as EventListener);
    };
  }, []);

  // Get cart items from API
  const { data: cartItems = [], isLoading, isError, error } = useQuery({
    queryKey: ['/api/cart'],
    queryFn: async () => {
      if (!isAuthenticated || !user?.id) return [];
      const response = await fetch(`/api/simple-get-cart/${user.id}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch cart items');
      }
      
      return response.json();
    },
    enabled: !!isAuthenticated && !!user?.id
  });

  // Fetch minimum order settings
  const { data: orderSettings } = useQuery({
    queryKey: ["/api/order-settings/minimum"],
    queryFn: async () => {
      const response = await fetch("/api/order-settings/minimum");
      if (!response.ok) throw new Error("Failed to fetch order settings");
      return response.json();
    },
  });

  // Calculate cart totals with null/undefined checks
  const cartTotal = Array.isArray(cartItems) 
    ? cartItems.reduce((total: number, item: CartItemType) => 
        total + (item.product?.price || 0) * (item.quantity || 0), 0)
    : 0;
    
  const itemCount = Array.isArray(cartItems) 
    ? cartItems.reduce((count: number, item: CartItemType) => 
        count + (item.quantity || 0), 0)
    : 0;

  // Check if cart meets minimum order requirement
  const minimumOrderAmount = orderSettings?.minimumOrderAmount || 0;
  const meetsMinimumOrder = cartTotal >= minimumOrderAmount;
  
  // Calculate delivery fee for display
  const freeDeliveryThreshold = orderSettings?.freeDeliveryThreshold || 500;
  const baseDeliveryFee = orderSettings?.deliveryFee || 25;
  const deliveryFee = orderType === 'delivery' ? (cartTotal >= freeDeliveryThreshold ? 0 : baseDeliveryFee) : 0;
  const totalWithDeliveryFee = cartTotal + deliveryFee;
    
  // TOTAL RESET APPROACH - burn it all down and start fresh
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
      // Get user ID with fallback to admin-user
      const userId = user?.id || 'admin-user';
      console.log("RESETTING CART for user:", userId);
      
      // Local storage reset
      if (window.localStorage) {
        console.log("Clearing localStorage cart data");
        localStorage.removeItem('adminCart');
        localStorage.setItem('adminCart', JSON.stringify([]));
      }
      
      // Nuclear option - use all strategies with timestamp to avoid caching
      try {
        console.log("Using nuclear cart reset option for", userId);
        
        // Get authentication token
        const token = 
          sessionStorage.getItem('authToken') || 
          sessionStorage.getItem('gokul_auth_token') ||
          JSON.parse(sessionStorage.getItem('gokul_auth_data') || '{}')?.token;
        
        const headers: Record<string, string> = {};
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
          headers['x-auth-token'] = token;
        }

        const response = await fetch('/api/cart', {
          method: 'DELETE',
          headers
        });
        
        if (response.ok) {
          console.log("Cart cleared successfully");
        } else {
          console.error("Cart clear failed:", response.status);
        }
      } catch (nuclearError) {
        console.error("Nuclear reset failed:", nuclearError);
      }
      
      // Force hard client reset
      console.log("Complete cart data purge");
      queryClient.invalidateQueries();  // Invalidate ALL queries 
      queryClient.refetchQueries({ queryKey: ['/api/cart'] });
      
      // Force page refresh if needed
      setTimeout(() => {
        console.log("Forced page reload");
        window.location.reload();
      }, 500);
      
      toast({
        title: "Cart reset complete",
        description: "Your cart has been completely reset"
      });
    } catch (error) {
      console.error('Critical failure in cart reset:', error);
      toast({
        variant: "destructive",
        title: "Cart Reset Failed",
        description: "Please try refreshing the page"
      });
      
      // Last resort
      window.location.reload();
    }
  };
  
  // Handle order placement
  const handlePlaceOrder = async () => {
    // Validate authentication
    if (!isAuthenticated) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please log in to place an order"
      });
      return;
    }
    
    // Validate cart has items
    if (cartItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Empty cart",
        description: "Please add items to your cart before placing an order"
      });
      return;
    }

    // Validate pickup date if pickup is selected
    if (orderType === 'pickup' && !pickupDate) {
      toast({
        variant: "destructive",
        title: "Pickup date required",
        description: "Please select a pickup date"
      });
      return;
    }

    setIsPlacingOrder(true);
    
    try {
      const orderData = {
        userId: user?.id,
        orderType,
        items: cartItems,
        status: 'pending',
        total: cartTotal,
        pickupDate: pickupDate || undefined,
        pickupTime: pickupTime || undefined,
        deliveryNote: deliveryNote || undefined
      };
      
      // Use apiRequest for proper authentication handling
      const newOrder = await apiRequest('POST', '/api/orders', orderData);
      console.log('Order created successfully:', newOrder);
      
      // Clear cart after successful order
      await clearCart();
      
      // Set success message
      toast({
        title: "Order placed successfully",
        description: `Your order #${newOrder.id} has been received. We'll contact you soon.`
      });
      
      // Close cart and redirect to orders page
      setIsCartOpen(false);
      setLocation('/orders');
    } catch (error) {
      console.error('Failed to place order:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to place your order. Please try again."
      });
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Render cart UI
  return (
    <>
      
      {/* Cart sidebar overlay */}
      <div
        className={`fixed inset-0 bg-black/50 z-50 transition-opacity duration-300 md:hidden ${
          isCartOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={toggleCart}
      />
      
      {/* Cart sidebar panel */}
      <div
        className={`fixed top-0 right-0 w-full sm:w-96 h-full bg-background z-50 transform transition-transform duration-300 flex flex-col shadow-xl md:right-4 md:top-20 md:h-[calc(100vh-8rem)] md:rounded-lg ${
          isCartOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Cart header */}
        <div className="p-4 border-b flex justify-between items-center bg-muted/50">
          <h2 className="text-xl font-semibold flex items-center">
            <ShoppingBag className="mr-2 h-5 w-5" />
            Your Cart
            {itemCount > 0 && <span className="ml-2 text-sm">({itemCount} items)</span>}
          </h2>
          <button
            onClick={toggleCart}
            className="p-1 rounded-md hover:bg-muted"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isAuthLoading || isLoading ? (
            // Loading skeleton for cart items
            <>
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex items-center py-4 border-b border-slate-200">
                  <Skeleton className="w-16 h-16 rounded-md" />
                  <div className="ml-4 flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                    <div className="flex justify-between">
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : cartItems && cartItems.length > 0 ? (
            // Render actual cart items first to ensure they're always visible
            <>
              {/* Cart items always shown first */}
              <div className="space-y-4 mb-4">
                {cartItems.map((item: any) => (
                  <CartItem key={item.productId} item={item} />
                ))}
              </div>
              
              {/* Notices shown after cart items */}
              <div className="mt-4 border-t pt-3">
                {showPaymentNotice && (
                  <div className="mb-2">
                    <CartNotice 
                      type="payment" 
                      onClose={() => {
                        console.log("Closing payment notice");
                        setShowPaymentNotice(false);
                      }} 
                    />
                  </div>
                )}
                
                {showTobaccoNotice && (
                  <div className="mb-2">
                    <CartNotice 
                      type="tobacco" 
                      onClose={() => {
                        console.log("Closing tobacco notice");
                        setShowTobaccoNotice(false);
                      }}
                    />
                  </div>
                )}
              </div>
            </>
          ) : (
            // Empty cart state
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="rounded-full bg-slate-100 p-3 mb-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-6 h-6 text-slate-400"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-1">Your cart is empty</h3>
              <p className="text-sm text-slate-500 mb-4">Browse our products and add items to your cart.</p>
              <Button variant="outline" size="sm" onClick={() => {
                toggleCart();
                setLocation('/products');
              }}>
                Continue Shopping
              </Button>
            </div>
          )}
        </div>

        {/* Cart footer with checkout options */}
        {cartItems && cartItems.length > 0 && (
          <div className="border-t p-4 space-y-4">
            {/* Cart summary */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Subtotal</span>
                <span className="font-medium">${cartTotal.toFixed(2)}</span>
              </div>
              
              {/* Delivery fee display */}
              {orderType === 'delivery' && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">
                    Delivery Fee
                    {deliveryFee === 0 && (
                      <span className="text-green-600 ml-1">(Free over ${freeDeliveryThreshold})</span>
                    )}
                  </span>
                  <span className={deliveryFee === 0 ? "text-green-600 font-medium" : ""}>
                    {deliveryFee === 0 ? "FREE" : `$${deliveryFee.toFixed(2)}`}
                  </span>
                </div>
              )}
              
              {/* Total with delivery fee */}
              <div className="flex justify-between items-center font-bold text-base border-t pt-2">
                <span>Total</span>
                <span>${totalWithDeliveryFee.toFixed(2)}</span>
              </div>
              
              {/* Free delivery incentive */}
              {orderType === 'delivery' && deliveryFee > 0 && (
                <div className="p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-xs text-blue-700">
                    💡 Add ${(freeDeliveryThreshold - cartTotal).toFixed(2)} more to qualify for free delivery!
                  </p>
                </div>
              )}
            </div>

            {/* Minimum order validation */}
            {minimumOrderAmount > 0 && (
              <div className={`p-3 rounded-lg text-sm ${
                meetsMinimumOrder 
                  ? 'bg-green-50 text-green-700 border border-green-200' 
                  : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
              }`}>
                {meetsMinimumOrder ? (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Minimum order requirement met (${minimumOrderAmount})</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600" />
                    <span>
                      Add ${(minimumOrderAmount - cartTotal).toFixed(2)} more to reach minimum order (${minimumOrderAmount})
                    </span>
                  </div>
                )}
              </div>
            )}
            
            {/* Clear cart button */}
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full flex items-center justify-center gap-1 text-destructive border-destructive/20 hover:bg-destructive/10"
              onClick={clearCart}
            >
              <Trash2 className="h-4 w-4" />
              Clear Cart
            </Button>

            {/* Checkout options */}
            <CheckoutOptions
              orderType={orderType}
              setOrderType={setOrderType}
              pickupDate={pickupDate}
              setPickupDate={setPickupDate}
              pickupTime={pickupTime}
              setPickupTime={setPickupTime}
              deliveryNote={deliveryNote}
              setDeliveryNote={setDeliveryNote}
            />
            
            {/* Place order button */}
            <div className="grid grid-cols-2 gap-2">
              <Button 
                type="button"
                variant="outline" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleCart();
                  setLocation('/products');
                }}
              >
                Continue Shopping
              </Button>
              <Button 
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handlePlaceOrder();
                }} 
                disabled={isPlacingOrder || !meetsMinimumOrder}
                style={{ WebkitAppearance: 'none', appearance: 'none' }}
                className={!meetsMinimumOrder ? 'opacity-50 cursor-not-allowed' : ''}
              >
                {isPlacingOrder ? "Processing..." : !meetsMinimumOrder ? "Minimum Order Required" : "Confirm Order"}
              </Button>
            </div>
            <Button
              variant="secondary"
              className="w-full"
              disabled={isPlacingOrder}
              onClick={() => {
                toggleCart();
                setLocation('/cart');
              }}
            >
              View Full Cart
            </Button>
          </div>
        )}
      </div>
    </>
  );
}