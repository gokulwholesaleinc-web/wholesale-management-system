import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ShoppingCart, Plus, Minus, Trash2, ArrowLeft, ArrowRight, 
  MapPin, CreditCard, CheckCircle, Sparkles, Loader2, Save,
  Heart, BookOpen, Clock, Archive, Star, TrendingUp, Gift, 
  Package, Zap, Coffee, AlertCircle, Bot, Truck, Info as InfoIcon,
  AlertTriangle, Eye, ChevronUp, ChevronDown, Brain
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSimpleCart } from "@/hooks/simpleCart";
import { DeliveryAddressForm } from "@/components/address/DeliveryAddressForm";
import { useUnifiedCart, helperFunctions } from "@shared/function-registry";

type CheckoutStep = 'cart' | 'delivery' | 'review' | 'confirmation';

interface DeliveryAddress {
  id: number;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  isDefault: boolean;
}

interface OrderData {
  deliveryAddressId?: number;
  notes?: string;
  deliveryFee?: number;
  pickupDate?: string;
  pickupTime?: string;
  loyaltyPointsRedeemed?: number;
  loyaltyPointsValue?: number;
}

export function MultiStepCheckoutPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('cart');
  const [orderData, setOrderData] = useState<OrderData>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [completedOrderId, setCompletedOrderId] = useState<number | null>(null);
  const [confirmedCartItems, setConfirmedCartItems] = useState<any[]>([]);
  const [showItemPreview, setShowItemPreview] = useState(false);
  
  // Loyalty points states
  const [loyaltyPointsToRedeem, setLoyaltyPointsToRedeem] = useState(0);
  const [userLoyaltyPoints, setUserLoyaltyPoints] = useState(0);
  
  // Delivery step states
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  
  const { itemCount: totalItems } = useUnifiedCart();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch cart items
  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ['/api/cart'],
    enabled: true,
  });

  // Fetch delivery addresses
  const { data: addresses = [] } = useQuery({
    queryKey: ['/api/delivery-addresses'],
    enabled: isOpen,
  });

  // Fetch order settings for delivery fee calculation
  const { data: orderSettings } = useQuery({
    queryKey: ['/api/order-settings/minimum'],
    enabled: isOpen,
  });

  // Fetch user's loyalty points
  const { data: loyaltyPointsData } = useQuery({
    queryKey: ['/api/users/loyalty/points'],
    enabled: isOpen,
  });
  
  // Update userLoyaltyPoints when data changes
  useEffect(() => {
    if (loyaltyPointsData?.loyaltyPoints !== undefined) {
      setUserLoyaltyPoints(loyaltyPointsData.loyaltyPoints);
    }
  }, [loyaltyPointsData]);

  // AI checkout suggestions based on cart - load immediately when cart opens
  const { data: aiSuggestionsResponse, isLoading: suggestionsLoading } = useQuery({
    queryKey: ['/api/ai-suggestions/checkout'],
    enabled: isOpen, // Start loading as soon as cart opens
    staleTime: 2 * 60 * 1000, // Cache for 2 minutes (shorter for more responsive updates)
    refetchOnWindowFocus: false, // Don't refetch on focus to avoid interrupting user
  });

  // Extract suggestions from response
  const suggestedProducts = (aiSuggestionsResponse as any)?.suggestions || [];



  // Use unified cart functions from registry
  const {
    addToCart,
    updateQuantity,
    removeFromCart,
    createOrderMutation: registryCreateOrderMutation,
    calculations,
    
    // Loading states
    isAddingToCart,
    isUpdatingQuantity,
    isRemovingFromCart
  } = useUnifiedCart();

  // Handle adding product to cart from AI recommendations
  const handleAddToCart = (product: any) => {
    if (!product?.id && !product?.productId) {
      return false;
    }
    const productId = product.id || product.productId;
    addToCart(productId, 1);
    return true;
  };

  // Override the registry createOrderMutation with our specific needs
  const createOrderMutation = {
    ...registryCreateOrderMutation,
    mutate: (orderData: OrderData) => {
      const currentCartItems = Array.isArray(cartItems) ? cartItems as any[] : [];
      const formattedOrderData = helperFunctions.formatOrderData(currentCartItems, orderData);
      
      registryCreateOrderMutation.mutate(formattedOrderData, {
        onSuccess: (response) => {
          // Extract order ID using helper function
          const orderId = helperFunctions.extractOrderId(response);
          setCompletedOrderId(orderId);
          
          // Store cart items for confirmation display before clearing
          setConfirmedCartItems([...currentCartItems]);
          
          setCurrentStep('confirmation');
          setIsProcessing(false);
        },
        onError: () => {
          setIsProcessing(false);
        }
      });
    }
  };

  const steps: Array<{ id: CheckoutStep; title: string; icon: any }> = [
    { id: 'cart', title: 'Review Cart', icon: ShoppingCart },
    { id: 'delivery', title: 'Delivery', icon: MapPin },
    { id: 'review', title: 'Order Review', icon: Sparkles },
    { id: 'confirmation', title: 'Confirmed', icon: CheckCircle },
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);
  const progress = ((currentStepIndex + 1) / steps.length) * 100;

  const goToPreviousStep = () => {
    if (currentStep === 'delivery') setCurrentStep('cart');
    else if (currentStep === 'review') setCurrentStep('delivery');
    else if (currentStep === 'confirmation') setCurrentStep('review');
  };

  const resetCheckout = () => {
    setCurrentStep('cart');
    setOrderData({});
    setCompletedOrderId(null);
    setIsProcessing(false);
    setIsOpen(false);
  };

  // Reset to cart step when dialog opens
  useEffect(() => {
    if (isOpen && currentStep === 'confirmation') {
      setCurrentStep('cart');
      setOrderData({});
      setCompletedOrderId(null);
    }
  }, [isOpen]);

  // Auto-save cart as draft every 30 seconds
  useEffect(() => {
    const interval = setInterval(async () => {
      if (Array.isArray(cartItems) && cartItems.length > 0) {
        try {
          await apiRequest('/api/draft-orders/auto-save', {
            method: 'POST',
            body: {
              items: cartItems.map((item: any) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price
              })),
              notes: 'Auto-saved cart'
            }
          });
        } catch (error) {
          // Silent fail for auto-save
        }
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [cartItems]);

  // Fetch additional data for enhanced features
  const { data: draftOrders = [] } = useQuery({
    queryKey: ['/api/draft-orders'],
    enabled: currentStep === 'cart',
  });

  const { data: wishlist = [] } = useQuery({
    queryKey: ['/api/wishlist'],
    enabled: currentStep === 'cart',
  });

  const { data: orderTemplates = [] } = useQuery({
    queryKey: ['/api/order-templates'],
    enabled: currentStep === 'cart',
  });

  // Fetch flat taxes for calculation (available to all users for checkout)
  const { data: flatTaxes = [] } = useQuery({
    queryKey: ['/api/flat-taxes'],
    enabled: currentStep === 'cart',
  });

  // Fetch current user data for flat tax eligibility
  const { data: currentUser } = useQuery({
    queryKey: ['/api/auth/user'],
    enabled: currentStep === 'cart',
  });

  // Type all query data properly to fix TypeScript issues
  const typedCartItems = Array.isArray(cartItems) ? cartItems as any[] : [];
  const typedDraftOrders = Array.isArray(draftOrders) ? draftOrders as any[] : [];
  const typedWishlist = Array.isArray(wishlist) ? wishlist as any[] : [];
  const typedOrderTemplates = Array.isArray(orderTemplates) ? orderTemplates as any[] : [];

  // Use calculation utilities from registry
  const cartSubtotal = calculations.calculateSubtotal(typedCartItems);
  const isPickup = orderData.deliveryAddressId === -1;
  const freeDeliveryThreshold = orderSettings?.freeDeliveryThreshold || 250.00;
  const baseDeliveryFee = orderSettings?.deliveryFee || 5.00;
  const deliveryFee = calculations.calculateDeliveryFee(cartSubtotal, isPickup, freeDeliveryThreshold, baseDeliveryFee);

  // Calculate flat tax if user is eligible
  const flatTaxAmount = (currentUser?.applyFlatTax && Array.isArray(flatTaxes)) 
    ? calculations.calculateFlatTax(typedCartItems, flatTaxes)
    : 0;

  // Calculate detailed flat tax breakdown
  const flatTaxBreakdown = (currentUser?.applyFlatTax && Array.isArray(flatTaxes)) 
    ? calculations.calculateDetailedFlatTax(typedCartItems, flatTaxes)
    : [];

  console.log('🧮 [Checkout] Flat tax calculation:', {
    userApplyFlatTax: currentUser?.applyFlatTax,
    flatTaxesCount: flatTaxes?.length,
    flatTaxAmount,
    flatTaxBreakdown,
    cartItems: typedCartItems.map(item => ({
      id: item.productId,
      name: item.product?.name,
      isTobacco: item.product?.isTobacco
    }))
  });
  
  // Calculate loyalty points redemption value (1 point = $0.01)
  const loyaltyPointsValue = loyaltyPointsToRedeem * 0.01;
  const subtotalAfterRedemption = Math.max(0, cartSubtotal - loyaltyPointsValue);
  const total = calculations.calculateTotal(subtotalAfterRedemption, deliveryFee, flatTaxAmount);
  const minimumOrder = orderSettings?.minimumOrderAmount || 30.00;
  
  // Check if cart contains tobacco items
  const hasTobaccoItems = Array.isArray(cartItems) && cartItems.some((item: any) => item.product?.isTobacco);
  
  // Update order data with loyalty redemption info
  React.useEffect(() => {
    if (loyaltyPointsToRedeem > 0) {
      setOrderData(prev => ({
        ...prev,
        loyaltyPointsRedeemed: loyaltyPointsToRedeem,
        loyaltyPointsValue: loyaltyPointsValue
      }));
    }
  }, [loyaltyPointsToRedeem, loyaltyPointsValue]);
  
  // Calculate step navigation conditions after all dependencies are defined
  const canProceedFromCart = (cartItems as any[])?.length > 0 && subtotalAfterRedemption >= minimumOrder;
  const canProceedFromDelivery = orderData.deliveryAddressId && 
    (isPickup ? (orderData.pickupDate && orderData.pickupTime) : true);
  const canProceedFromPayment = true; // Payment will be handled by staff when order is completed
  
  // Free delivery calculation using registry functions
  const amountForFreeDelivery = calculations.amountForFreeDelivery(cartSubtotal, freeDeliveryThreshold);
  const qualifiesForFreeDelivery = calculations.qualifiesForFreeDelivery(cartSubtotal, freeDeliveryThreshold);
  
  // Calculate confirmed cart total for order confirmation
  const confirmedSubtotal = calculations.calculateSubtotal(confirmedCartItems);
  const confirmedLoyaltyValue = (orderData.loyaltyPointsRedeemed || 0) * 0.01;
  const confirmedSubtotalAfterRedemption = Math.max(0, confirmedSubtotal - confirmedLoyaltyValue);
  const confirmedTotal = calculations.calculateTotal(confirmedSubtotalAfterRedemption, isPickup ? 0 : deliveryFee);

  // Navigation functions - defined after all dependencies
  const goToNextStep = () => {
    if (currentStep === 'cart' && canProceedFromCart) {
      setCurrentStep('delivery');
    } else if (currentStep === 'delivery' && canProceedFromDelivery) {
      setCurrentStep('review');
    } else if (currentStep === 'review') {
      setIsProcessing(true);
      createOrderMutation.mutate(orderData);
    }
  };

  // Save as draft mutation
  const saveDraftMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/draft-orders', {
        method: 'POST',
        body: {
          items: typedCartItems.map((item: any) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price
          })),
          notes: 'Manually saved draft'
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/draft-orders'] });
      toast({ title: "Cart saved as draft!" });
    },
    onError: () => {
      toast({ title: "Failed to save draft", variant: "destructive" });
    },
  });

  // Add to wishlist mutation
  const addToWishlistMutation = useMutation({
    mutationFn: async (productId: number) => {
      const item = typedCartItems.find((item: any) => item.productId === productId);
      return apiRequest('/api/wishlist', {
        method: 'POST',
        body: {
          productId,
          priceWhenAdded: item?.price || 0
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wishlist'] });
      toast({ title: "Added to wishlist!" });
    },
    onError: () => {
      toast({ title: "Failed to add to wishlist", variant: "destructive" });
    },
  });

  // Load draft order mutation
  const loadDraftMutation = useMutation({
    mutationFn: async (draftId: number) => {
      // Clear current cart first
      const clearResult = await apiRequest('/api/cart/clear', { method: 'DELETE' });
      
      // Check if clear was successful
      if (!clearResult.success) {
        throw new Error('Failed to clear cart before loading draft');
      }
      
      // Get draft order details
      const draft = await apiRequest(`/api/draft-orders/${draftId}`, { method: 'GET' });
      
      // Add draft items to cart
      for (const item of draft.items) {
        await apiRequest('/api/cart/add', {
          method: 'POST',
          body: {
            productId: item.productId,
            quantity: item.quantity
          }
        });
      }
      
      return draft;
    },
    onSuccess: async () => {
      // Force refetch to show updated cart with draft items
      await queryClient.refetchQueries({ queryKey: ['/api/cart'] });
      toast({ title: "Draft loaded into cart!" });
    },
    onError: () => {
      toast({ title: "Failed to load draft", variant: "destructive" });
    },
  });


  // Delete draft mutation
  const deleteDraftMutation = useMutation({
    mutationFn: async (draftId: number) => {
      return apiRequest(`/api/draft-orders/${draftId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/draft-orders'] });
      toast({ title: "Draft deleted" });
    },
    onError: () => {
      toast({ title: "Failed to delete draft", variant: "destructive" });
    },
  });

  // Add wishlist item to cart mutation
  const addWishlistToCartMutation = useMutation({
    mutationFn: async (item: any) => {
      return apiRequest('/api/cart/add', {
        method: 'POST',
        body: {
          productId: item.productId,
          quantity: 1
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({ title: "Added to cart!" });
    },
    onError: () => {
      toast({ title: "Failed to add to cart", variant: "destructive" });
    },
  });

  // Remove from wishlist mutation
  const removeFromWishlistMutation = useMutation({
    mutationFn: async (productId: number) => {
      return apiRequest(`/api/wishlist/${productId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wishlist'] });
      toast({ title: "Removed from wishlist" });
    },
    onError: () => {
      toast({ title: "Failed to remove from wishlist", variant: "destructive" });
    },
  });



  // Use order template mutation
  const useTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      // Clear current cart first
      await apiRequest('/api/cart/clear', { method: 'DELETE' });
      
      // Get template details
      const template = await apiRequest(`/api/order-templates/${templateId}`, { method: 'GET' });
      
      // Add template items to cart
      for (const item of template.items) {
        await apiRequest('/api/cart/add', {
          method: 'POST',
          body: {
            productId: item.productId,
            quantity: item.quantity
          }
        });
      }

      // Increment template usage
      await apiRequest(`/api/order-templates/${templateId}/use`, {
        method: 'POST'
      });
      
      return template;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      queryClient.invalidateQueries({ queryKey: ['/api/order-templates'] });
      toast({ title: "Template loaded into cart!" });
    },
    onError: () => {
      toast({ title: "Failed to use template", variant: "destructive" });
    },
  });



  const renderCartStep = () => (
    <div className="space-y-3">
      <Tabs defaultValue="cart" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-blue-50 to-purple-50 p-0.5 rounded-lg border border-blue-100 shadow-sm h-9">
          <TabsTrigger 
            value="cart" 
            className="flex items-center gap-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200"
          >
            <ShoppingCart className="h-3 w-3" />
            <span className="hidden sm:inline">Cart</span> ({Array.isArray(cartItems) ? cartItems.length : 0})
          </TabsTrigger>
          <TabsTrigger 
            value="drafts" 
            className="flex items-center gap-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200"
          >
            <Save className="h-3 w-3" />
            <span className="hidden sm:inline">Drafts</span> ({(draftOrders || []).length})
          </TabsTrigger>
          <TabsTrigger 
            value="wishlist" 
            className="flex items-center gap-1 data-[state=active]:bg-gradient-to-r data-[state=active]:from-pink-500 data-[state=active]:to-rose-600 data-[state=active]:text-white data-[state=active]:shadow-lg transition-all duration-200"
          >
            <Heart className="h-3 w-3" />
            <span className="hidden sm:inline">Wishlist</span> ({Array.isArray(wishlist) ? wishlist.length : 0})
          </TabsTrigger>

        </TabsList>

        <TabsContent value="cart" className="space-y-3">
          {/* Cart Actions */}
          {Array.isArray(cartItems) && cartItems.length > 0 && (
            <div className="flex items-center justify-between bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-2 border border-blue-100">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => saveDraftMutation.mutate()}
                  disabled={saveDraftMutation.isPending}
                  className="flex items-center gap-1 bg-white shadow-sm hover:shadow-md transition-all"
                >
                  <Save className="h-3 w-3" />
                  Save as Draft
                </Button>
                <Button
                  variant="outline" 
                  size="sm"
                  onClick={async () => {
                    try {
                      const result = await apiRequest('/api/cart/clear', { method: 'DELETE' });
                      
                      // Check if the backend successfully cleared the cart
                      if (result.success) {
                        // Immediately update the cache to show empty cart
                        queryClient.setQueryData(['/api/cart'], []);
                        
                        // Force refetch to confirm the cart is empty
                        await queryClient.refetchQueries({ queryKey: ['/api/cart'] });
                        
                        toast({ title: "Cart cleared successfully!" });
                      } else {
                        throw new Error(result.message || 'Failed to clear cart');
                      }
                    } catch (error) {
                      toast({ title: "Failed to clear cart", variant: "destructive" });
                    }
                  }}
                  className="flex items-center gap-1 bg-white text-red-600 border-red-200 hover:bg-red-50 shadow-sm hover:shadow-md transition-all"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear Cart
                </Button>
              </div>
              <div className="text-xs text-gray-600 flex items-center gap-1 bg-white px-2 py-1 rounded">
                <Clock className="h-3 w-3" />
                Auto-saves every 30s
              </div>
            </div>
          )}

          {/* Cart Items */}
          <div className="max-h-64 overflow-y-auto space-y-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : !Array.isArray(cartItems) || cartItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Your cart is empty</p>
              </div>
            ) : (
              cartItems.map((item: any) => (
                <div key={item.productId} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 ease-in-out">
                  {/* Desktop Layout */}
                  <div className="hidden sm:block p-4">
                    <div className="flex items-center gap-4">
                      {/* Product Image */}
                      <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg flex items-center justify-center border border-blue-100 overflow-hidden">
                        {item.product?.imageUrl ? (
                          <img 
                            src={item.product.imageUrl} 
                            alt={item.product.name || 'Product'} 
                            className="w-full h-full object-cover rounded-lg"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.parentElement!.innerHTML = '<div class="h-6 w-6 text-blue-500"><svg class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg></div>';
                            }}
                          />
                        ) : (
                          <Package className="h-6 w-6 text-blue-500" />
                        )}
                      </div>
                      
                      {/* Product Info */}
                      <div className="flex-1 min-w-0 mr-2">
                        <h4 className="font-semibold text-sm text-gray-900 leading-tight mb-1">
                          {item.product?.name || item.productName || 'Unknown Product'}
                        </h4>
                        <p className="text-xs text-gray-500 mb-1">
                          ${item.price?.toFixed(2)} each
                        </p>
                        <p className="text-xs text-gray-400">
                          Stock: {item.product?.stock || 'N/A'}
                        </p>
                      </div>
                      
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 hover:bg-gray-200 transition-all duration-200 ease-in-out transform hover:scale-105"
                            onClick={() => {
                              if (item.quantity <= 1) {
                                removeFromCart(item.productId);
                              } else {
                                updateQuantity(item.productId, item.quantity - 1);
                              }
                            }}
                            disabled={isUpdatingQuantity}
                          >
                            <Minus className="h-3 w-3" />
                          </Button>
                          
                          <span className="w-8 text-center text-sm font-medium transition-all duration-200">
                            {item.quantity}
                          </span>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 hover:bg-gray-200 transition-all duration-200 ease-in-out transform hover:scale-105"
                            onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                            disabled={isUpdatingQuantity}
                          >
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-pink-600 hover:text-pink-700 hover:bg-pink-50 transition-all duration-300 ease-in-out transform hover:scale-110"
                            onClick={() => addToWishlistMutation.mutate(item.productId)}
                            disabled={addToWishlistMutation.isPending}
                            title="Add to wishlist"
                          >
                            <Heart className="h-3 w-3 transition-transform duration-300" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 transition-all duration-300 ease-in-out transform hover:scale-110"
                            onClick={() => removeFromCart(item.productId)}
                            disabled={isRemovingFromCart}
                            title="Remove from cart"
                          >
                            <Trash2 className="h-3 w-3 transition-transform duration-300" />
                          </Button>
                        </div>
                      </div>
                      
                      {/* Total Price */}
                      <div className="text-right">
                        <p className="font-bold text-lg text-gray-900">
                          ${(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Mobile Layout */}
                  <div className="sm:hidden p-3">
                    <div className="flex gap-3">
                      {/* Larger Product Image for Mobile */}
                      <div className="w-20 h-20 bg-gradient-to-br from-blue-50 to-purple-50 rounded-lg flex items-center justify-center border border-blue-100 overflow-hidden flex-shrink-0">
                        {item.product?.imageUrl ? (
                          <img 
                            src={item.product.imageUrl} 
                            alt={item.product.name || 'Product'} 
                            className="w-full h-full object-cover rounded-lg"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              target.parentElement!.innerHTML = '<div class="h-8 w-8 text-blue-500"><svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg></div>';
                            }}
                          />
                        ) : (
                          <Package className="h-8 w-8 text-blue-500" />
                        )}
                      </div>
                      
                      {/* Product Info - Mobile */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-sm text-gray-900 leading-tight mb-1">
                          {item.product?.name || item.productName || 'Unknown Product'}
                        </h4>
                        <p className="text-xs text-gray-500 mb-1">
                          ${item.price?.toFixed(2)} each
                        </p>
                        <p className="text-xs text-gray-400 mb-2">
                          Stock: {item.product?.stock || 'N/A'}
                        </p>
                        
                        {/* Mobile Quantity and Price Row */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-gray-200"
                              onClick={() => {
                                if (item.quantity <= 1) {
                                  removeFromCart(item.productId);
                                } else {
                                  updateQuantity(item.productId, item.quantity - 1);
                                }
                              }}
                              disabled={isUpdatingQuantity}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            
                            <span className="w-8 text-center text-sm font-medium">
                              {item.quantity}
                            </span>
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 hover:bg-gray-200"
                              onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                              disabled={isUpdatingQuantity}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          
                          <div className="text-right">
                            <p className="font-bold text-lg text-gray-900">
                              ${(item.price * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Mobile Action Buttons */}
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-pink-600 hover:text-pink-700 hover:bg-pink-50 text-xs"
                        onClick={() => addToWishlistMutation.mutate(item.productId)}
                        disabled={addToWishlistMutation.isPending}
                      >
                        <Heart className="h-3 w-3 mr-1" />
                        Save for Later
                      </Button>
                      
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 text-xs"
                        onClick={() => removeFromCart(item.productId)}
                        disabled={isRemovingFromCart}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="drafts" className="space-y-4">
          <div className="max-h-64 overflow-y-auto space-y-3">
            {!draftOrders || draftOrders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Archive className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No draft orders</p>
                <p className="text-sm">Save your cart as a draft for later</p>
              </div>
            ) : (
              (draftOrders || []).map((draft: any) => (
                <Card key={draft.id} className="cursor-pointer hover:bg-gray-50">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-sm">Draft #{draft.id}</p>
                        <p className="text-xs text-muted-foreground">
                          {draft.items?.length || 0} items • ${(() => {
                            if (draft.items && Array.isArray(draft.items)) {
                              return draft.items.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0).toFixed(2);
                            }
                            return draft.total?.toFixed(2) || '0.00';
                          })()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(draft.createdAt || draft.lastModified || draft.updatedAt || Date.now()).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => loadDraftMutation.mutate(draft.id)}
                          disabled={loadDraftMutation.isPending}
                        >
                          Load
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                          onClick={() => deleteDraftMutation.mutate(draft.id)}
                          disabled={deleteDraftMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="wishlist" className="space-y-4">
          <div className="max-h-64 overflow-y-auto space-y-3">
            {!wishlist || wishlist.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Heart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No wishlist items</p>
                <p className="text-sm">Save products you want to buy later</p>
              </div>
            ) : (
              (wishlist || []).map((item: any) => (
                <div key={item.productId} className="flex items-center gap-3 p-3 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{item.productName}</h4>
                    <p className="text-xs text-muted-foreground">
                      Added at ${item.priceWhenAdded} • Current: ${item.currentPrice}
                    </p>
                    {item.currentPrice < item.priceWhenAdded && (
                      <Badge variant="destructive" className="text-xs">
                        Price Drop: ${(item.priceWhenAdded - item.currentPrice).toFixed(2)}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => addWishlistToCartMutation.mutate(item)}
                      disabled={addWishlistToCartMutation.isPending}
                    >
                      Add to Cart
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="text-red-600"
                      onClick={() => removeFromWishlistMutation.mutate(item.productId)}
                      disabled={removeFromWishlistMutation.isPending}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="suggestions" className="space-y-4">
          {suggestionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Analyzing your cart...</span>
            </div>
          ) : (
            <div className="space-y-4">
              {/* AI-powered suggestions */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Sparkles className="h-4 w-4 text-blue-500" />
                    Smart Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 gap-2">
                    {suggestedProducts?.slice(0, 5).map((product: any, index: number) => (
                      <div key={index} className="p-3 bg-blue-50 rounded border-l-2 border-blue-200">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="font-medium text-blue-800 text-sm">{product.name}</p>
                            <p className="text-blue-600 text-xs">{product.brand || 'Popular item'}</p>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="ml-2"
                            onClick={() => handleAddToCart(product)}
                            disabled={isAddingToCart}
                          >
                            {isAddingToCart ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              'Add'
                            )}
                          </Button>
                        </div>
                      </div>
                    )) || (
                      <div className="text-center py-4 text-muted-foreground">
                        <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">Add items to cart for personalized suggestions</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Order Templates */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <BookOpen className="h-4 w-4 text-green-500" />
                    Quick Order Templates
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {(orderTemplates || []).slice(0, 3).map((template: any) => (
                    <div key={template.id} className="flex items-center justify-between p-2 border rounded">
                      <div>
                        <p className="font-medium text-sm">{template.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {template.items?.length || 0} items • Used {template.timesUsed || 0} times
                        </p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => useTemplateMutation.mutate(template.id)}
                        disabled={useTemplateMutation.isPending}
                      >
                        Use Template
                      </Button>
                    </div>
                  ))}
                  {(!orderTemplates || orderTemplates.length === 0) && (
                    <div className="text-center py-4 text-muted-foreground">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No order templates yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>



      {/* Order Summary */}
      {cartItems.length > 0 && (
        <div className="border-t pt-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>${cartSubtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Delivery Fee:</span>
            <span>${deliveryFee.toFixed(2)}</span>
          </div>
          {flatTaxBreakdown.length > 0 && (
            <>
              {flatTaxBreakdown.map((tax, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>{tax.name}:</span>
                  <span>${tax.amount.toFixed(2)}</span>
                </div>
              ))}
            </>
          )}
          <Separator />
          <div className="flex justify-between font-bold">
            <span>Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>
          {cartSubtotal < minimumOrder && (
            <p className="text-sm text-amber-600">
              Minimum order: ${minimumOrder.toFixed(2)} 
              (add ${(minimumOrder - cartSubtotal).toFixed(2)} more)
            </p>
          )}
          
          {/* Free delivery calculation */}
          {!isPickup && !qualifiesForFreeDelivery && amountForFreeDelivery > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
              <p className="text-sm text-green-700 font-medium">
                🚚 Add ${amountForFreeDelivery.toFixed(2)} more for FREE delivery!
              </p>
              <p className="text-xs text-green-600 mt-1">
                Free delivery on orders over ${freeDeliveryThreshold.toFixed(2)}
              </p>
            </div>
          )}
          
          {!isPickup && qualifiesForFreeDelivery && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-2">
              <p className="text-sm text-green-700 font-medium">
                ✅ Congratulations! Your order qualifies for FREE delivery!
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );

  const renderDeliveryStep = () => {
    return (
      <div className="space-y-6">
        <div>
          <Label className="text-xl font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Delivery Options
          </Label>
          <p className="text-sm text-gray-600 mt-2">
            Choose how you'd like to receive your order
          </p>
        </div>

        {/* Pickup vs Delivery Toggle */}
        <div className="grid grid-cols-2 gap-4">
          <Card 
            className={`cursor-pointer transition-all duration-200 ${
              orderData.deliveryAddressId === -1 
                ? 'ring-2 ring-green-500 bg-green-50 shadow-lg' 
                : 'hover:bg-gray-50 hover:shadow-md'
            }`}
            onClick={() => setOrderData({ ...orderData, deliveryAddressId: -1 })}
          >
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Package className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900">Store Pickup</h3>
              <p className="text-sm text-gray-600 mt-1">Pick up at our location</p>
              <p className="text-xs text-green-600 font-medium mt-2">FREE</p>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all duration-200 ${
              orderData.deliveryAddressId && orderData.deliveryAddressId !== -1 
                ? 'ring-2 ring-blue-500 bg-blue-50 shadow-lg' 
                : 'hover:bg-gray-50 hover:shadow-md'
            }`}
            onClick={() => {
              // Force enable delivery mode by setting a non-pickup address ID
              if (Array.isArray(addresses) && addresses.length > 0) {
                setOrderData({ ...orderData, deliveryAddressId: addresses[0].id });
              } else {
                // If no addresses available, set a temporary delivery state that will prompt address creation
                setOrderData({ ...orderData, deliveryAddressId: null });
                setIsAddingAddress(true);
              }
            }}
          >
            <CardContent className="p-4 text-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mx-auto mb-3">
                <MapPin className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900">Delivery</h3>
              <p className="text-sm text-gray-600 mt-1">Delivered to business address</p>
            </CardContent>
          </Card>
        </div>

        {/* Delivery Addresses Section - Only show if delivery is selected */}
        {orderData.deliveryAddressId !== -1 && orderData.deliveryAddressId !== undefined && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Select Delivery Address</Label>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsAddingAddress(true)}
                className="flex items-center gap-1"
              >
                <Plus className="h-3 w-3" />
                Add Address
              </Button>
            </div>

            {/* Add New Address Form */}
            {isAddingAddress && (
              <Card className="bg-blue-50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium">Add New Address</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsAddingAddress(false)}
                    >
                      ✕
                    </Button>
                  </div>
                  
                  <DeliveryAddressForm
                    onSuccess={() => {
                      setIsAddingAddress(false);
                      queryClient.invalidateQueries({ queryKey: ['/api/delivery-addresses'] });
                    }}
                    onCancel={() => setIsAddingAddress(false)}
                  />
                </CardContent>
              </Card>
            )}

            {/* Existing Addresses */}
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {Array.isArray(addresses) && addresses.map((address: DeliveryAddress) => (
                <Card 
                  key={address.id}
                  className={`cursor-pointer transition-all duration-200 ${
                    orderData.deliveryAddressId === address.id 
                      ? 'ring-2 ring-blue-500 bg-blue-50 shadow-lg' 
                      : 'hover:bg-gray-50 hover:shadow-md'
                  }`}
                  onClick={() => setOrderData({ ...orderData, deliveryAddressId: address.id })}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{address.addressLine1}</p>
                        {address.addressLine2 && (
                          <p className="text-sm text-gray-600">{address.addressLine2}</p>
                        )}
                        <p className="text-sm text-gray-600">
                          {address.city}, {address.state} {address.postalCode}
                        </p>
                      </div>
                      {address.isDefault && (
                        <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                          Default
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {(!Array.isArray(addresses) || addresses.length === 0) && !isAddingAddress && (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="font-medium">No delivery addresses found</p>
                  <p className="text-sm">Add a new address to enable delivery</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsAddingAddress(true)}
                    className="mt-3"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Add Your First Address
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Pickup Information & Scheduling */}
        {orderData.deliveryAddressId === -1 && (
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                  <Package className="h-4 w-4 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-green-800">Store Pickup Selected</h4>
                  <p className="text-sm text-green-700 mt-1">
                    Your order will be ready for pickup at our store location.
                  </p>
                  <p className="text-sm text-green-600 mt-2 font-medium">
                    📍 Gokul Wholesale - 1141 W Bryn Mawr Ave, Itasca, IL 60143
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    🕒 Business Hours: Mon-Sat 8:00 AM - 6:00 PM
                  </p>
                </div>
              </div>

              {/* Pickup Date Selection */}
              <div className="space-y-3 border-t border-green-200 pt-4">
                <Label className="font-medium text-green-800">Select Pickup Date & Time</Label>
                
                {/* Date Picker */}
                <div className="space-y-2">
                  <Label className="text-sm text-green-700">Pickup Date</Label>
                  <Input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    max={new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    value={orderData.pickupDate || ''}
                    onChange={(e) => setOrderData({ ...orderData, pickupDate: e.target.value })}
                    className="bg-white border-green-200 focus:border-green-400"
                  />
                </div>

                {/* Time Selection */}
                <div className="space-y-2">
                  <Label className="text-sm text-green-700">Preferred Pickup Time</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'morning', label: 'Morning', time: '8:00 AM - 12:00 PM', icon: '🌅' },
                      { value: 'afternoon', label: 'Afternoon', time: '12:00 PM - 4:00 PM', icon: '☀️' },
                      { value: 'evening', label: 'Evening', time: '4:00 PM - 6:00 PM', icon: '🌆' }
                    ].map((timeSlot) => (
                      <Card
                        key={timeSlot.value}
                        className={`cursor-pointer transition-all duration-200 ${
                          orderData.pickupTime === timeSlot.value
                            ? 'ring-2 ring-green-500 bg-white shadow-md'
                            : 'bg-white/70 hover:bg-white hover:shadow-sm'
                        }`}
                        onClick={() => setOrderData({ ...orderData, pickupTime: timeSlot.value })}
                      >
                        <CardContent className="p-3 text-center">
                          <div className="text-lg mb-1">{timeSlot.icon}</div>
                          <h4 className="font-medium text-xs text-gray-900">{timeSlot.label}</h4>
                          <p className="text-xs text-gray-600 mt-1">{timeSlot.time}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Pickup Instructions */}
                {orderData.pickupDate && orderData.pickupTime && (
                  <div className="bg-white rounded-lg p-3 border border-green-200">
                    <div className="flex items-start gap-2">
                      <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center mt-0.5">
                        <CheckCircle className="h-3 w-3 text-white" />
                      </div>
                      <div className="text-sm">
                        <p className="font-medium text-green-800">
                          Pickup scheduled for {new Date(orderData.pickupDate).toLocaleDateString()} 
                          {orderData.pickupTime === 'morning' && ' (Morning: 8:00 AM - 12:00 PM)'}
                          {orderData.pickupTime === 'afternoon' && ' (Afternoon: 12:00 PM - 4:00 PM)'}
                          {orderData.pickupTime === 'evening' && ' (Evening: 4:00 PM - 6:00 PM)'}
                        </p>
                        <p className="text-green-600 text-xs mt-1">
                          Please bring a valid ID for pickup verification
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  const renderPaymentStep = () => (
    <div className="space-y-4">
      {/* Compact Payment & Compliance Notices */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
          <InfoIcon className="h-3 w-3 text-blue-600 flex-shrink-0" />
          <span className="text-blue-700">Order estimation only - payment in person at pickup/delivery</span>
        </div>
        <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs">
          <AlertTriangle className="h-3 w-3 text-amber-600 flex-shrink-0" />
          <span className="text-amber-700">Tobacco products require FEIN & license - call store to inquire</span>
        </div>
      </div>

      {/* Delivery Fee Encouragement Section */}
      {!isPickup && !qualifiesForFreeDelivery && (
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Truck className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-blue-800 text-sm">Current Delivery Fee: ${deliveryFee.toFixed(2)}</h3>
                <p className="text-blue-700 text-xs mt-1">
                  Add just <span className="font-bold text-blue-900">${amountForFreeDelivery.toFixed(2)}</span> more for FREE delivery!
                </p>
                <p className="text-blue-600 text-xs mt-1">
                  💡 Check our AI suggestions below to reach ${freeDeliveryThreshold} and save on delivery
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Suggestions Section */}
      <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-5 w-5 text-amber-600" />
              AI Recommendations
            </CardTitle>
            <p className="text-sm text-amber-700">
              Based on internet trends and market analysis, here are smart additions for your cart:
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {suggestionsLoading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                <span className="ml-2 text-sm text-amber-600">Finding recommendations...</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3">
                {suggestedProducts?.slice(0, 3).map((product: any, index: number) => (
                  <div key={index} className="p-3 bg-white rounded-lg border border-amber-200 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-amber-800 text-sm">{product.name}</p>
                        <p className="text-amber-600 text-xs mt-1">{product.brand || product.reason || 'Trending item'}</p>
                        <p className="text-green-600 text-xs font-medium mt-1">
                          ${product.price?.toFixed(2)}
                        </p>
                        {product.description && (
                          <p className="text-blue-600 text-xs mt-1 italic">{product.description}</p>
                        )}
                        {product.marketData && (
                          <p className="text-purple-600 text-xs mt-1">📈 {product.marketData}</p>
                        )}
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="ml-2 border-amber-300 text-amber-700 hover:bg-amber-100"
                        onClick={() => {
                          if (product.id) {
                            addToCart(product.id, 1);
                            toast({ title: "Added to cart!", description: product.name });
                          } else {
                            toast({ title: "Product unavailable", description: "This trending item isn't in our current inventory", variant: "destructive" });
                          }
                        }}
                        disabled={isAddingToCart || !product.id}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  </div>
                ))}
                
                {(!suggestedProducts || suggestedProducts.length === 0) && (
                  <div className="text-center py-4 text-amber-600 text-sm">
                    No suggestions available at this time
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div>
          <Label htmlFor="order-notes">Order Notes (Optional)</Label>
          <Textarea
            id="order-notes"
            placeholder="Add any special instructions or notes..."
            value={orderData.notes || ''}
            onChange={(e) => setOrderData({ 
              ...orderData, 
              notes: e.target.value 
            })}
          />
        </div>

        {/* Order Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Order Summary</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Items ({Array.isArray(cartItems) ? cartItems.length : 0}):</span>
            <span>${cartSubtotal.toFixed(2)}</span>
          </div>
          
          {/* Loyalty Points Redemption */}
          {loyaltyPointsToRedeem > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Loyalty Points Applied ({loyaltyPointsToRedeem} pts):</span>
              <span>-${loyaltyPointsValue.toFixed(2)}</span>
            </div>
          )}
          
          {/* Subtotal after redemption */}
          {loyaltyPointsToRedeem > 0 && (
            <div className="flex justify-between text-sm font-medium">
              <span>Subtotal after redemption:</span>
              <span>${subtotalAfterRedemption.toFixed(2)}</span>
            </div>
          )}
          
          {/* Free Shipping Indicator */}
          {!isPickup && (
            <>
              <div className="flex justify-between text-sm">
                <span>Delivery Fee:</span>
                <span className={qualifiesForFreeDelivery ? "line-through text-muted-foreground" : ""}>
                  ${deliveryFee.toFixed(2)}
                </span>
              </div>
              
              {/* Free Shipping Message */}
              {qualifiesForFreeDelivery ? (
                <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-md">
                  <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-sm font-medium text-green-700">
                    🎉 You qualify for FREE delivery!
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <Truck className="h-4 w-4 text-blue-600" />
                  <span className="text-sm text-blue-700">
                    Add <span className="font-semibold">${amountForFreeDelivery.toFixed(2)}</span> more for FREE delivery
                  </span>
                </div>
              )}
            </>
          )}
          
          <Separator />
          <div className="flex justify-between font-bold">
            <span>Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderConfirmationStep = () => (
    <div className="text-center space-y-4">
      <div className="flex justify-center">
        <div className="rounded-full bg-green-100 p-3">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
      </div>
      
      <div>
        <h3 className="text-lg font-semibold text-green-800">Order Placed Successfully!</h3>
        <p className="text-muted-foreground">
          Your order #{completedOrderId || 'Unknown'} has been received and is being processed.
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span>Order Total:</span>
            <span className="font-medium">${confirmedTotal.toFixed(2)}</span>
          </div>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowItemPreview(!showItemPreview)}
            className="w-full text-xs"
          >
            <Eye className="h-3 w-3 mr-1" />
            {showItemPreview ? 'Hide' : 'Show'} Order Items ({confirmedCartItems.length} items)
          </Button>
          
          {/* Expandable Order Items Preview */}
          {showItemPreview && (
            <div className="mt-3 space-y-2 border-t pt-3">
              {confirmedCartItems.length > 0 ? (
                confirmedCartItems.map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg text-left">
                    <div className="flex-1">
                      <h4 className="font-medium text-xs">{item.product?.name || 'Unknown Product'}</h4>
                      {item.product?.brand && (
                        <p className="text-xs text-gray-600">{item.product.brand}</p>
                      )}
                      {item.product?.size && (
                        <p className="text-xs text-gray-500">Size: {item.product.size}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium">Qty: {item.quantity}</p>
                      <p className="text-xs text-gray-600">${(item.price || 0).toFixed(2)} each</p>
                      <p className="text-xs font-semibold text-blue-600">
                        ${((item.price || 0) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-gray-500">
                  <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                  <p className="text-xs">No items found</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button 
          variant="outline" 
          onClick={() => setIsOpen(false)}
          className="flex-1"
        >
          Continue Shopping
        </Button>
        <Button 
          onClick={() => window.location.href = '/orders'}
          className="flex-1"
        >
          View Orders
        </Button>
      </div>
    </div>
  );

  // Fetch AI suggestions for review step
  const { data: aiSuggestions = [], isLoading: aiLoading } = useQuery({
    queryKey: ['/api/ai-suggestions'],
    enabled: currentStep === 'review' && isOpen,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const renderReviewStep = () => (
    <div className="space-y-6">
      {/* Loyalty Points Redemption Section - Always show so users know it exists */}
      <Card className="border-2 border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Gift className="h-5 w-5 text-purple-600" />
            Loyalty Points Redemption
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(loyaltyPointsData?.loyaltyPoints || 0) > 0 ? (
            <>
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-purple-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">Available Points</p>
                  <p className="text-lg font-bold text-purple-600">{loyaltyPointsData?.loyaltyPoints || 0} points</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Value</p>
                  <p className="text-lg font-bold text-green-600">${((loyaltyPointsData?.loyaltyPoints || 0) * 0.01).toFixed(2)}</p>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="loyalty-points">Points to redeem (1 point = $0.01)</Label>
                <div className="flex gap-2">
                  <Input
                    id="loyalty-points"
                    type="number"
                    value={loyaltyPointsToRedeem}
                    onChange={(e) => {
                      const points = Math.max(0, Math.min(loyaltyPointsData?.loyaltyPoints || 0, parseInt(e.target.value) || 0));
                      setLoyaltyPointsToRedeem(points);
                    }}
                    max={loyaltyPointsData?.loyaltyPoints || 0}
                    min={0}
                    placeholder="0"
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={() => setLoyaltyPointsToRedeem(loyaltyPointsData?.loyaltyPoints || 0)}
                    className="px-3"
                  >
                    Max
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setLoyaltyPointsToRedeem(0)}
                    className="px-3"
                  >
                    Clear
                  </Button>
                </div>
              </div>
              
              {loyaltyPointsToRedeem > 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">
                      You'll save ${loyaltyPointsValue.toFixed(2)} with {loyaltyPointsToRedeem} points!
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
              <Gift className="h-8 w-8 mx-auto mb-2 text-gray-400" />
              <p className="text-sm font-medium text-gray-600 mb-1">No Loyalty Points Available</p>
              <p className="text-xs text-gray-500">
                Earn points with every purchase! 1 point = $0.01 value
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tobacco Points Notice */}
      {hasTobaccoItems && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-800">
                <span className="font-medium">Important:</span> Tobacco products do not earn loyalty points. You will only earn points on non-tobacco items in your order.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Order Summary */}
      <div className="bg-white rounded-lg border p-4">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          Order Summary
        </h3>
        
        {/* Delivery/Pickup Information */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          {isPickup ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-green-600 font-medium">
                <Package className="h-4 w-4" />
                Store Pickup Selected
              </div>
              <p className="text-sm text-gray-600">
                📍 Gokul Wholesale - 1141 W Bryn Mawr Ave, Itasca, IL 60143
              </p>
              <p className="text-sm text-gray-600">
                🕒 Business Hours: Mon-Fri 9:00 AM - 6:00 PM, Sat 10:00 AM - 4:00 PM
              </p>
              {orderData.pickupDate && (
                <p className="text-sm font-medium">
                  📅 Pickup Date: {new Date(orderData.pickupDate).toLocaleDateString()}
                </p>
              )}
              {orderData.pickupTime && (
                <p className="text-sm font-medium">
                  ⏰ Pickup Time: {orderData.pickupTime}
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-blue-600 font-medium">
                <Truck className="h-4 w-4" />
                Delivery Selected
              </div>
              {addresses.find((addr: any) => addr.id === orderData.deliveryAddressId) && (
                <p className="text-sm text-gray-600">
                  📍 {(() => {
                    const addr = addresses.find((a: any) => a.id === orderData.deliveryAddressId);
                    return `${addr.addressLine1}, ${addr.city}, ${addr.state} ${addr.postalCode}`;
                  })()}
                </p>
              )}
              <p className="text-sm text-gray-600">
                🚚 Delivery Fee: {deliveryFee > 0 ? `$${deliveryFee.toFixed(2)}` : 'FREE'}
              </p>
            </div>
          )}
        </div>

        {/* Cart Items Preview */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">Items ({typedCartItems.length})</h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowItemPreview(!showItemPreview)}
              className="text-blue-600 hover:text-blue-700"
            >
              {showItemPreview ? 'Hide' : 'Show'} Items
              {showItemPreview ? <ChevronUp className="h-4 w-4 ml-1" /> : <ChevronDown className="h-4 w-4 ml-1" />}
            </Button>
          </div>
          
          {showItemPreview && (
            <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3 bg-gray-50">
              {typedCartItems.map((item: any) => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <span className="flex-1">{item.quantity}x {item.product.name}</span>
                  <span className="font-medium">${(item.quantity * item.price).toFixed(2)}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Order Total */}
        <div className="mt-4 pt-4 border-t space-y-2">
          <div className="flex justify-between text-sm">
            <span>Subtotal:</span>
            <span>${cartSubtotal.toFixed(2)}</span>
          </div>
          {!isPickup && (
            <div className="flex justify-between text-sm">
              <span>Delivery Fee:</span>
              <span>{deliveryFee > 0 ? `$${deliveryFee.toFixed(2)}` : 'FREE'}</span>
            </div>
          )}
          {flatTaxBreakdown.length > 0 && (
            <>
              {flatTaxBreakdown.map((tax, index) => (
                <div key={index} className="flex justify-between text-sm">
                  <span>{tax.name}:</span>
                  <span>${tax.amount.toFixed(2)}</span>
                </div>
              ))}
            </>
          )}
          <div className="flex justify-between font-semibold text-lg border-t pt-2">
            <span>Total:</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* AI Suggestions Section */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-4">
        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2 text-purple-800">
          <Sparkles className="h-5 w-5" />
          AI Recommendations
        </h3>
        
        {suggestionsLoading ? (
          <div className="flex items-center gap-2 text-gray-600">
            <Loader2 className="h-4 w-4 animate-spin" />
            Analyzing trends and finding recommendations...
          </div>
        ) : suggestedProducts.length > 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-purple-700 mb-3">
              Based on current market trends, here are some products you might want to add:
            </p>
            {suggestedProducts.slice(0, 3).map((suggestion: any, index: number) => (
              <div key={index} className="bg-white rounded-lg p-3 border border-purple-100">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="font-medium text-sm">{suggestion.name || suggestion.productName}</h4>
                    <p className="text-xs text-gray-600 mt-1">{suggestion.reason}</p>
                    <p className="text-xs text-purple-600 mt-1 font-medium">
                      {suggestion.description || suggestion.marketData || suggestion.trendContext || 'Trending product based on market analysis'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">${suggestion.price}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-1 text-xs px-2 py-1 h-auto border-purple-200 text-purple-700 hover:bg-purple-50"
                      onClick={() => {
                        if (suggestion.id || suggestion.productId) {
                          addToCart(suggestion.id || suggestion.productId, 1);
                        } else {
                          toast({ 
                            title: "Product unavailable", 
                            description: "This trending item isn't in our current inventory", 
                            variant: "destructive" 
                          });
                        }
                      }}
                      disabled={isAddingToCart || (!suggestion.id && !suggestion.productId)}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-gray-600 text-center py-4">
            <Brain className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            No additional recommendations at this time
          </div>
        )}
      </div>



      {/* Payment Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-800">Payment Information</h4>
            <p className="text-sm text-amber-700 mt-1">
              This is only an order estimation. No payment will be taken through this app. All payments will be made in person at pickup or upon delivery.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 'cart': return renderCartStep();
      case 'delivery': return renderDeliveryStep();
      case 'review': return renderReviewStep();
      case 'confirmation': return renderConfirmationStep();
      default: return renderCartStep();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="relative bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200 hover:from-amber-100 hover:to-orange-100 text-amber-800 shadow-sm hover:shadow-md transition-all duration-200 transform hover:scale-105"
      >
        <ShoppingCart className="h-4 w-4 mr-2" />
        Cart
        {totalItems > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute -top-2 -right-2 h-5 w-5 p-0 text-xs flex items-center justify-center animate-pulse bg-gradient-to-r from-red-500 to-red-600"
          >
            {totalItems}
          </Badge>
        )}
      </Button>

      <DialogContent className="max-w-2xl md:max-w-4xl max-h-[90vh] overflow-hidden bg-gradient-to-br from-white to-gray-50 border-0 shadow-2xl flex flex-col">
        <DialogHeader className="border-b border-gray-100 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <div className="p-1.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg shadow-md">
              <ShoppingCart className="h-4 w-4 text-white" />
            </div>
            <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-bold">
              {currentStep === 'confirmation' ? 'Order Confirmation' : 'Secure Checkout'}
            </span>
          </DialogTitle>
        </DialogHeader>

        {currentStep !== 'confirmation' && (
          <div className="space-y-4 py-2">
            {/* Enhanced Progress Steps */}
            <div className="relative">
              <div className="flex justify-between items-center mb-3">
                {steps.map((step, index) => {
                  const StepIcon = step.icon;
                  const isActive = index === currentStepIndex;
                  const isCompleted = index < currentStepIndex;
                  const isUpcoming = index > currentStepIndex;
                  
                  return (
                    <div 
                      key={step.id}
                      className="flex flex-col items-center relative z-10"
                    >
                      <div className={`
                        w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-500 shadow-md
                        ${isCompleted ? 'bg-gradient-to-r from-green-500 to-emerald-600 border-green-500 text-white' : 
                          isActive ? 'bg-gradient-to-r from-blue-500 to-purple-600 border-blue-500 text-white animate-[gentle-pulse_3s_ease-in-out_infinite]' : 
                          'bg-gray-100 border-gray-300 text-gray-400'}
                      `}>
                        {isCompleted ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          <StepIcon className="h-3 w-3" />
                        )}
                      </div>
                      <span className={`
                        text-xs font-medium mt-1 transition-colors duration-300
                        ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'}
                      `}>
                        {step.title}
                      </span>
                    </div>
                  );
                })}
              </div>
              
              {/* Progress Line */}
              <div className="absolute top-5 left-5 right-5 h-0.5 bg-gray-200 -z-10">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-500 ease-out"
                  style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        {currentStep !== 'confirmation' && (
          <div className="flex justify-between pt-4 border-t">
            <Button
              variant="outline"
              onClick={currentStep === 'cart' ? () => setIsOpen(false) : goToPreviousStep}
              className="flex items-center gap-2"
            >
              {currentStep === 'cart' ? (
                'Continue Shopping'
              ) : (
                <>
                  <ArrowLeft className="h-4 w-4" />
                  Back
                </>
              )}
            </Button>

            <Button
              onClick={goToNextStep}
              disabled={
                (currentStep === 'cart' && !canProceedFromCart) ||
                (currentStep === 'delivery' && !canProceedFromDelivery) ||
                isProcessing
              }
              className="flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : currentStep === 'delivery' ? (
                'Review Order'
              ) : (
                <>
                  Next
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}