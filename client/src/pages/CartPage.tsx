import React, { useState } from "react";
import { ShoppingBag, Trash2, ArrowRight, AlertCircle, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { fmtUSD } from "@/lib/money";
import { fetchCart, CART_KEY } from '@/lib/cartApi';
import { updateQuantity } from '@/lib/cartApi';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";


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

export function CartPage() {
  // State management
  const [orderType, setOrderType] = useState<"delivery" | "pickup">("delivery");
  const [pickupDate, setPickupDate] = useState<string>("");
  const [pickupTime, setPickupTime] = useState<string>("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();

  // Fetch cart data with consistent key
  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ['/api/cart'],
    queryFn: fetchCart,
    enabled: isAuthenticated,
  });

  // Type-safe cartItems
  const safeCartItems: CartItemType[] = Array.isArray(cartItems) ? cartItems : [];

  // Calculate cart total
  const cartTotal = safeCartItems.reduce(
    (total: number, item: CartItemType) =>
      total + item.product.price * item.quantity,
    0,
  );

  const itemCount = safeCartItems.reduce(
    (count: number, item: CartItemType) => count + item.quantity,
    0,
  );

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
        description: "Please log in to manage your cart",
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
        description: "Your cart has been cleared",
      });
    } catch (error) {
      console.error("Cart reset failed:", error);
      toast({
        variant: "destructive",
        title: "Cart Reset Failed",
        description: "Please try again",
      });
    }
  };

  // Handle order placement
  const handlePlaceOrder = async () => {
    if (!isAuthenticated) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please log in to place an order",
      });
      return;
    }

    if (safeCartItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Empty cart",
        description: "Please add items to your cart before ordering",
      });
      return;
    }

    setIsPlacingOrder(true);

    try {
      const orderData = {
        userId: user.id,
        items: safeCartItems.map((item: CartItemType) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.product.price,
        })),
        orderType,
        deliveryNote,
        pickupDate: pickupDate || null,
        pickupTime,
        status: "pending",
        total: cartTotal,
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error("Failed to place order");
      }

      const newOrder = await response.json();

      // Clear cart after successful order
      await clearCart();

      // Set success message
      toast({
        title: "Order placed successfully",
        description: `Your order #${newOrder.id} has been received.`,
      });

      // Redirect to orders page
      setLocation("/orders");
    } catch (error) {
      console.error("Failed to place order:", error);
      toast({
        variant: "destructive",
        title: "Order failed",
        description: "Could not place your order. Please try again.",
      });
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Render the cart page
  return (
    <div className="container mx-auto max-w-4xl py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center">
          <ShoppingBag className="mr-2 h-6 w-6" />
          Your Cart
          {itemCount > 0 && <span className="ml-2">({itemCount} items)</span>}
        </h1>

        <Button
          variant="ghost"
          onClick={() => setLocation("/")}
          className="text-sm"
        >
          Continue Shopping
        </Button>
      </div>

      {isAuthLoading || isLoading ? (
        // Loading state
        <div className="space-y-4">
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex items-center p-4 border rounded-lg">
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
        </div>
      ) : safeCartItems.length > 0 ? (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Left side: Cart items */}
          <div className="md:col-span-2 space-y-4">
            {/* Cart items */}
            {safeCartItems.map((item: CartItemType) => (
              <div
                key={item.productId}
                className="flex border rounded-lg p-4 relative"
              >
                <div className="w-20 h-20 rounded-md overflow-hidden flex-shrink-0">
                  {item.product.imageUrl ? (
                    <img
                      src={item.product.imageUrl}
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-slate-200 flex items-center justify-center">
                      <ShoppingBag size={24} className="text-slate-400" />
                    </div>
                  )}
                </div>

                <div className="ml-4 flex-1">
                  <h3 className="font-medium">{item.product.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {fmtUSD(item.product.price)} each
                  </p>

                  <div className="flex justify-between items-end mt-2">
                    <div className="flex items-center">
                      <Button
                        size="sm"
                        variant="outline" 
                        onClick={() => updateQuantityMutation.mutate({
                          productId: item.productId,
                          quantity: item.quantity - 1, // API helper will remove if <= 0
                        })}
                        disabled={updateQuantityMutation.isPending}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="px-2">Qty: {item.quantity}</span>
                    </div>
                    <span className="font-medium">
                      {fmtUSD(item.product.price * item.quantity)}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Clear cart button */}
            <div className="pt-2">
              <Button
                variant="outline"
                onClick={clearCart}
                className="w-full text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Cart
              </Button>
            </div>
          </div>

          {/* Right side: Order summary and options */}
          <div className="space-y-4">
            {/* Order summary */}
            <div className="border rounded-lg p-4">
              <h2 className="font-medium mb-4">Order Summary</h2>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>{fmtUSD(cartTotal)}</span>
                </div>
                {orderType === 'delivery' && (
                  <div className="flex justify-between">
                    <span>Delivery Fee
                      {deliveryFee === 0 && (
                        <span className="text-green-600 ml-1">(Free over {fmtUSD(freeDeliveryThreshold)})</span>
                      )}
                    </span>
                    <span className={deliveryFee === 0 ? "text-green-600" : ""}>
                      {deliveryFee === 0 ? "FREE" : fmtUSD(deliveryFee)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
                  <span>Total</span>
                  <span>{fmtUSD(totalWithDeliveryFee)}</span>
                </div>
              </div>
            </div>

            {/* Important notices */}
            <div className="border rounded-lg p-4 bg-amber-50 border-amber-200 space-y-2">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-amber-600 mr-2 mt-0.5" />
                <div>
                  <h3 className="font-medium text-amber-800">
                    Payment Information
                  </h3>
                  <p className="text-sm text-amber-700">
                    This is only for order estimation. All payments will be made
                    in person or upon delivery.
                  </p>
                </div>
              </div>

              <div className="flex items-start pt-2 border-t border-amber-200">
                <AlertCircle className="h-5 w-5 text-amber-600 mr-2 mt-0.5" />
                <div>
                  <h3 className="font-medium text-amber-800">
                    Tobacco Products
                  </h3>
                  <p className="text-sm text-amber-700">
                    Valid FEIN and Tobacco License required for tobacco
                    products.
                  </p>
                </div>
              </div>
            </div>

            {/* Delivery/Pickup options */}
            <div className="border rounded-lg p-4">
              <h2 className="font-medium mb-3">Delivery Options</h2>

              <RadioGroup
                value={orderType}
                onValueChange={(value) =>
                  setOrderType(value as "delivery" | "pickup")
                }
                className="space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="delivery" id="delivery" />
                  <Label htmlFor="delivery" className="cursor-pointer">
                    Delivery (within 7 days)
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="pickup" id="pickup" />
                  <Label htmlFor="pickup" className="cursor-pointer">
                    Store Pickup (choose date)
                  </Label>
                </div>
              </RadioGroup>

              {orderType === "pickup" && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="pickup-date">Pickup Date</Label>
                    <Input
                      id="pickup-date"
                      type="date"
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                      className="mt-1"
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>
                  <div>
                    <Label htmlFor="pickup-time">Preferred Time</Label>
                    <select
                      id="pickup-time"
                      value={pickupTime || ""}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="w-full mt-1 rounded-md border border-input px-3 py-2"
                    >
                      <option value="">Select time</option>
                      <option value="morning">Morning (9AM - 12PM)</option>
                      <option value="afternoon">Afternoon (12PM - 5PM)</option>
                      <option value="evening">Evening (5PM - 8PM)</option>
                    </select>
                  </div>
                </div>
              )}

              {orderType === "delivery" && (
                <div className="mt-3">
                  <Label htmlFor="delivery-note">Delivery Notes</Label>
                  <Textarea
                    id="delivery-note"
                    placeholder="Add any special delivery instructions"
                    className="mt-1"
                    value={deliveryNote}
                    onChange={(e) => setDeliveryNote(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Place order button */}
            <Button
              type="button"
              className="w-full"
              size="lg"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePlaceOrder();
              }}
              disabled={isPlacingOrder || safeCartItems.length === 0}
              style={{ WebkitAppearance: "none", appearance: "none" }}
            >
              {isPlacingOrder ? (
                <>Processing...</>
              ) : (
                <>
                  Place Order
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        // Empty cart state
        <div className="text-center py-12 border rounded-lg">
          <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-medium mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-4">
            Browse our products and add items to your cart
          </p>
          <Button onClick={() => setLocation("/")}>Browse Products</Button>
        </div>
      )}
    </div>
  );
}

export default CartPage;
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {pickupDate ? (
                            format(pickupDate, "PPP")
                          ) : (
                            <span>Select date</span>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={pickupDate}
                          onSelect={setPickupDate}
                          initialFocus
                          disabled={(date) => date < new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label htmlFor="pickup-time">Preferred Time</Label>
                    <select
                      id="pickup-time"
                      value={pickupTime || ""}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="w-full mt-1 rounded-md border border-input px-3 py-2"
                    >
                      <option value="">Select time</option>
                      <option value="morning">Morning (9AM - 12PM)</option>
                      <option value="afternoon">Afternoon (12PM - 5PM)</option>
                      <option value="evening">Evening (5PM - 8PM)</option>
                    </select>
                  </div>
                </div>
              )}

              {orderType === "delivery" && (
                <div className="mt-3">
                  <Label htmlFor="delivery-note">Delivery Notes</Label>
                  <Textarea
                    id="delivery-note"
                    placeholder="Add any special delivery instructions"
                    className="mt-1"
                    value={deliveryNote}
                    onChange={(e) => setDeliveryNote(e.target.value)}
                  />
                </div>
              )}
            </div>

            {/* Place order button */}
            <Button
              type="button"
              className="w-full"
              size="lg"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handlePlaceOrder();
              }}
              disabled={isPlacingOrder || safeCartItems.length === 0}
              style={{ WebkitAppearance: "none", appearance: "none" }}
            >
              {isPlacingOrder ? (
                <>Processing...</>
              ) : (
                <>
                  Place Order
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      ) : (
        // Empty cart state
        <div className="text-center py-12 border rounded-lg">
          <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-medium mb-2">Your cart is empty</h2>
          <p className="text-muted-foreground mb-4">
            Browse our products and add items to your cart
          </p>
          <Button onClick={() => setLocation("/")}>Browse Products</Button>
        </div>
      )}
    </div>
  );
}

export default CartPage;
