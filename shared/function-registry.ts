/**
 * CENTRALIZED FUNCTION REGISTRY
 * 
 * This file contains all reusable functions, mutations, and API calls
 * to prevent duplicates across components and ensure consistency.
 * 
 * Usage: Import functions from this registry instead of creating duplicates
 */

import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// ========================================
// CART OPERATIONS REGISTRY
// ========================================

export const useCartMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Add to cart - optimized with immediate UI feedback
  const addToCartMutation = useMutation({
    mutationFn: async (params: { productId: number; quantity?: number } | { product: any }) => {
      let productId: number;
      let quantity: number = 1;

      if ('product' in params) {
        // Handle product object from AI recommendations
        productId = params.product.id || params.product.productId;
        quantity = 1;
      } else {
        // Handle direct productId/quantity
        productId = params.productId;
        quantity = params.quantity || 1;
      }

      return apiRequest('/api/cart/add', {
        method: 'POST',
        body: { productId, quantity },
      });
    },
    
    onMutate: async (params) => {
      // Extract productId from params
      let productId: number;
      let quantity: number = 1;
      let product: any = null;

      if ('product' in params) {
        productId = params.product.id || params.product.productId;
        product = params.product;
      } else {
        productId = params.productId;
        quantity = params.quantity || 1;
      }

      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['/api/cart'] });

      // Snapshot the previous value
      const previousCart = queryClient.getQueryData(['/api/cart']);

      // Optimistically update cart
      const currentCart = Array.isArray(previousCart) ? previousCart : (previousCart as any)?.items || [];
      const existingIndex = currentCart.findIndex((item: any) => item.productId === productId);

      let newCart;
      if (existingIndex >= 0) {
        // Update existing item
        newCart = currentCart.map((item: any, index: number) =>
          index === existingIndex ? { ...item, quantity: item.quantity + quantity } : item
        );
      } else if (product) {
        // Add new item if product data is available
        newCart = [...currentCart, {
          id: Date.now(),
          productId,
          quantity,
          product: {
            id: productId,
            name: product.name || 'Loading...',
            price: product.price || 0,
            imageUrl: product.imageUrl,
            stock: product.stock || 100,
          }
        }];
      } else {
        newCart = currentCart;
      }

      // Apply optimistic update
      if (Array.isArray(previousCart)) {
        queryClient.setQueryData(['/api/cart'], newCart);
      } else {
        queryClient.setQueryData(['/api/cart'], { ...previousCart, items: newCart });
      }

      // Show immediate success feedback
      toast({ 
        title: "Added to cart!", 
        description: "Item added successfully",
        duration: 2000 
      });

      return { previousCart };
    },

    onError: (error: any, variables, context) => {
      // Revert optimistic update on error
      if (context?.previousCart !== undefined) {
        queryClient.setQueryData(['/api/cart'], context.previousCart);
      }
      
      console.error('Add to cart error:', error);
      toast({ 
        title: "Failed to add to cart", 
        description: error?.message || "Please try again",
        variant: "destructive" 
      });
    },

    onSettled: () => {
      // Refetch cart data to sync with server (with slight delay for better UX)
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      }, 300);
    },
  });

  // Update cart quantity
  const updateQuantityMutation = useMutation({
    mutationFn: async ({ productId, quantity }: { productId: number; quantity: number }) => {
      return apiRequest(`/api/cart/${productId}`, {
        method: 'PUT',
        body: { quantity },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    },
    onError: () => {
      toast({ title: "Failed to update cart", variant: "destructive" });
    },
  });

  // Remove from cart
  const removeItemMutation = useMutation({
    mutationFn: async (productId: number) => {
      return apiRequest(`/api/cart/${productId}`, {
        method: 'DELETE',
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

  // Clear entire cart
  const clearCartMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/cart/clear', {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({ title: "Cart cleared" });
    },
    onError: () => {
      toast({ title: "Failed to clear cart", variant: "destructive" });
    },
  });

  // Bulk reorder - add multiple items with single toast
  const bulkReorderMutation = useMutation({
    mutationFn: async (items: Array<{ productId: number; quantity: number }>) => {
      const results = [];
      for (const item of items) {
        try {
          const result = await apiRequest('/api/cart/add', {
            method: 'POST',
            body: { productId: item.productId, quantity: item.quantity },
          });
          results.push(result);
        } catch (error) {
          console.error(`Failed to add item ${item.productId}:`, error);
          // Continue with other items even if one fails
        }
      }
      return { successCount: results.length, totalItems: items.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({ 
        title: "Items Added", 
        description: `${data.successCount} items added to cart${data.totalItems > data.successCount ? ` (${data.totalItems - data.successCount} failed)` : ''}` 
      });
    },
    onError: () => {
      toast({ title: "Failed to reorder items", variant: "destructive" });
    },
  });

  return {
    addToCartMutation,
    updateQuantityMutation,
    removeItemMutation,
    clearCartMutation,
    bulkReorderMutation,
  };
};

// ========================================
// ORDER OPERATIONS REGISTRY
// ========================================

export const useOrderMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Create order
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return apiRequest('/api/orders', {
        method: 'POST',
        body: orderData,
      });
    },
    onSuccess: (response) => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({ title: "Order created successfully!" });
      return response;
    },
    onError: (error) => {
      console.error('Order creation failed:', error);
      toast({ title: "Failed to create order", variant: "destructive" });
    },
  });

  return {
    createOrderMutation,
  };
};

// ========================================
// WISHLIST OPERATIONS REGISTRY
// ========================================

export const useWishlistMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Add to wishlist
  const addToWishlistMutation = useMutation({
    mutationFn: async (productId: number) => {
      return apiRequest('/api/wishlist', {
        method: 'POST',
        body: { productId },
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

  // Remove from wishlist
  const removeFromWishlistMutation = useMutation({
    mutationFn: async (productId: number) => {
      return apiRequest(`/api/wishlist/${productId}`, {
        method: 'DELETE',
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

  return {
    addToWishlistMutation,
    removeFromWishlistMutation,
  };
};

// ========================================
// DRAFT ORDER OPERATIONS REGISTRY
// ========================================

export const useDraftOrderMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Save cart as draft
  const saveDraftMutation = useMutation({
    mutationFn: async (draftData: any) => {
      return apiRequest('/api/draft-orders', {
        method: 'POST',
        body: draftData,
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

  // Auto-save cart (silent)
  const autoSaveDraftMutation = useMutation({
    mutationFn: async (draftData: any) => {
      return apiRequest('/api/draft-orders/auto-save', {
        method: 'POST',
        body: draftData,
      });
    },
    onSuccess: () => {
      // Silent success - no toast
    },
    onError: () => {
      // Silent fail for auto-save
    },
  });

  return {
    saveDraftMutation,
    autoSaveDraftMutation,
  };
};

// ========================================
// ORDER TEMPLATE OPERATIONS REGISTRY
// ========================================

export const useOrderTemplateMutations = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Use order template
  const useTemplateMutation = useMutation({
    mutationFn: async (templateId: number) => {
      return apiRequest(`/api/order-templates/${templateId}/use`, {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      queryClient.invalidateQueries({ queryKey: ['/api/order-templates'] });
      toast({ title: "Template applied to cart!" });
    },
    onError: () => {
      toast({ title: "Failed to apply template", variant: "destructive" });
    },
  });

  return {
    useTemplateMutation,
  };
};

// ========================================
// CALCULATION UTILITIES REGISTRY
// ========================================

export const cartCalculations = {
  // Calculate cart subtotal
  calculateSubtotal: (cartItems: any[]): number => {
    return Array.isArray(cartItems) 
      ? cartItems.reduce((sum: number, item: any) => sum + (item.price * item.quantity), 0)
      : 0;
  },

  // Calculate delivery fee
  calculateDeliveryFee: (subtotal: number, isPickup: boolean, freeThreshold: number = 500, baseFee: number = 25): number => {
    if (isPickup) return 0;
    return subtotal >= freeThreshold ? 0 : baseFee;
  },

  // Calculate flat tax amount for items
  calculateFlatTax: (cartItems: any[], flatTaxes: any[]): number => {
    if (!Array.isArray(cartItems) || !Array.isArray(flatTaxes)) return 0;
    
    let totalFlatTax = 0;
    
    for (const item of cartItems) {
      // Get the flat tax IDs assigned to this specific product
      const productFlatTaxIds = item.product?.flatTaxIds || [];
      
      if (Array.isArray(productFlatTaxIds) && productFlatTaxIds.length > 0) {
        // Only apply flat taxes that are specifically assigned to this product
        for (const taxId of productFlatTaxIds) {
          const tax = flatTaxes.find(t => t.id === taxId && t.isActive);
          
          if (tax) {
            if (tax.taxType === 'per_unit') {
              totalFlatTax += tax.taxAmount * item.quantity;
            } else if (tax.taxType === 'percentage') {
              totalFlatTax += (item.price * item.quantity) * (tax.taxAmount / 100);
            } else {
              // Fixed amount per order
              totalFlatTax += tax.taxAmount;
            }
          }
        }
      }
    }
    
    return Math.round(totalFlatTax * 100) / 100;
  },

  // Calculate detailed flat tax breakdown for items
  calculateDetailedFlatTax: (cartItems: any[], flatTaxes: any[]): Array<{name: string, amount: number}> => {
    if (!Array.isArray(cartItems) || !Array.isArray(flatTaxes)) return [];
    
    const taxBreakdown: Array<{name: string, amount: number}> = [];
    const taxTotals: {[key: string]: number} = {};
    
    for (const item of cartItems) {
      // Get the flat tax IDs assigned to this specific product
      const productFlatTaxIds = item.product?.flatTaxIds || [];
      
      if (Array.isArray(productFlatTaxIds) && productFlatTaxIds.length > 0) {
        // Only apply flat taxes that are specifically assigned to this product
        for (const taxId of productFlatTaxIds) {
          const tax = flatTaxes.find(t => t.id === taxId && t.isActive);
          
          if (tax) {
            let taxAmount = 0;
            
            if (tax.taxType === 'per_unit') {
              taxAmount = tax.taxAmount * item.quantity;
            } else if (tax.taxType === 'percentage') {
              taxAmount = (item.price * item.quantity) * (tax.taxAmount / 100);
            } else {
              // Fixed amount per order
              taxAmount = tax.taxAmount;
            }
            
            // Accumulate tax amounts by tax name
            if (taxTotals[tax.name]) {
              taxTotals[tax.name] += taxAmount;
            } else {
              taxTotals[tax.name] = taxAmount;
            }
          }
        }
      }
    }
    
    // Convert totals to breakdown array
    for (const [name, amount] of Object.entries(taxTotals)) {
      if (amount > 0) {
        taxBreakdown.push({
          name,
          amount: Math.round(amount * 100) / 100
        });
      }
    }
    
    return taxBreakdown;
  },

  // Calculate total including flat taxes
  calculateTotal: (subtotal: number, deliveryFee: number, flatTax: number = 0): number => {
    return subtotal + deliveryFee + flatTax;
  },

  // Check if qualifies for free delivery
  qualifiesForFreeDelivery: (subtotal: number, freeThreshold: number = 500): boolean => {
    return subtotal >= freeThreshold;
  },

  // Amount needed for free delivery
  amountForFreeDelivery: (subtotal: number, freeThreshold: number = 500): number => {
    return Math.max(0, freeThreshold - subtotal);
  },
};

// ========================================
// UNIFIED CART HOOK (Single Source of Truth)
// ========================================

export const useUnifiedCart = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Cart data query with optimized caching
  const { 
    data: cartItems = [], 
    isLoading, 
    refetch: refetchCart 
  } = useQuery({
    queryKey: ['/api/cart'],
    queryFn: async () => {
      console.log('[Unified Cart Registry] Fetching cart items...');
      const response = await apiRequest('/api/cart', { method: 'GET' });
      const items = Array.isArray(response) ? response : [];
      
      if (items.length > 0) {
        console.log('[Unified Cart Registry] Cart contains:', items.map(item => `${item.product?.name} (qty: ${item.quantity})`).join(', '));
      }
      
      return items;
    },
    staleTime: 30_000, // 30 seconds - reduce unnecessary refetches
    gcTime: 5 * 60 * 1000, // 5 minutes cache
    refetchOnWindowFocus: false, // Prevent refetch on window focus for better performance
  });

  // Cart calculations
  const cartTotal = cartItems.reduce((sum: number, item: any) => 
    sum + (item.price * item.quantity), 0
  );
  
  const itemCount = cartItems.reduce((count: number, item: any) => 
    count + item.quantity, 0
  );

  const cartSubtotal = cartTotal;
  const deliveryFee = cartSubtotal >= 500 ? 0 : 25;
  const grandTotal = cartSubtotal + deliveryFee;

  // Get all mutations from registry
  const cartMutations = useCartMutations();
  const orderMutations = useOrderMutations();
  const wishlistMutations = useWishlistMutations();
  const draftOrderMutations = useDraftOrderMutations();
  const templateMutations = useOrderTemplateMutations();

  return {
    // Cart data
    cartItems,
    cartTotal,
    cartSubtotal,
    itemCount,
    deliveryFee,
    grandTotal,
    isLoading,

    // Simplified API from mutations with product parameter support
    addToCart: (productId: number, quantity: number = 1, product?: any) => {
      cartMutations.addToCartMutation.mutate(product ? { product } : { productId, quantity });
    },
    
    bulkReorder: (items: Array<{ productId: number; quantity: number }>) => {
      cartMutations.bulkReorderMutation.mutate(items);
    },
    
    updateQuantity: (productId: number, quantity: number) => {
      cartMutations.updateQuantityMutation.mutate({ productId, quantity });
    },
    
    removeFromCart: (productId: number) => {
      cartMutations.removeItemMutation.mutate(productId);
    },
    
    clearCart: () => {
      cartMutations.clearCartMutation.mutate();
    },

    // Loading states
    isAddingToCart: cartMutations.addToCartMutation.isPending,
    isBulkReordering: cartMutations.bulkReorderMutation.isPending,
    isUpdatingQuantity: cartMutations.updateQuantityMutation.isPending,
    isRemovingFromCart: cartMutations.removeItemMutation.isPending,
    isClearingCart: cartMutations.clearCartMutation.isPending,

    // All other registry functions
    ...orderMutations,
    ...wishlistMutations,
    ...draftOrderMutations,
    ...templateMutations,
    calculations: cartCalculations,
    
    // Utilities
    refetchCart,
  };
};

// ========================================
// HELPER FUNCTIONS REGISTRY
// ========================================

export const helperFunctions = {
  // Handle AI recommendation add to cart
  handleAIRecommendationAdd: (product: any, addToCartMutation: any) => {
    if (!product?.id && !product?.productId) {
      return false;
    }
    addToCartMutation.mutate({ product });
    return true;
  },

  // Format order data for API
  formatOrderData: (cartItems: any[], orderData: any) => {
    const subtotal = cartCalculations.calculateSubtotal(cartItems);
    const isPickup = orderData.deliveryAddressId === -1;
    const deliveryFee = cartCalculations.calculateDeliveryFee(subtotal, isPickup);
    
    // Determine order type based on delivery address selection
    const orderType = isPickup ? 'pickup' : 'delivery';

    console.log('[formatOrderData] Processing order data:', {
      isPickup,
      orderType,
      deliveryAddressId: orderData.deliveryAddressId,
      pickupDate: orderData.pickupDate,
      pickupTime: orderData.pickupTime,
      notes: orderData.notes
    });

    return {
      items: cartItems.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: item.price
      })),
      orderType: orderType,
      deliveryAddressId: orderData.deliveryAddressId,
      notes: orderData.notes,
      deliveryFee,
      pickupDate: orderData.pickupDate,
      pickupTime: orderData.pickupTime,
      deliveryNote: orderData.notes // Legacy support
    };
  },

  // Extract order ID from response (handles multiple formats)
  extractOrderId: (response: any): string | number => {
    return response.id || response.orderId || response.order_id || 'Unknown';
  },
};