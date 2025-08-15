/**
 * UNIFIED API REGISTRY - SINGLE SOURCE OF TRUTH
 * 
 * This file consolidates ALL API calls, mutations, and queries into a single registry
 * to eliminate the massive duplication (810+ API calls) found across the codebase.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

// ============================================================================
// CART OPERATIONS - SINGLE IMPLEMENTATION
// ============================================================================

export function useUnifiedCart() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get cart items
  const { data: cartItems = [], isLoading: isCartLoading, refetch: refetchCart } = useQuery({
    queryKey: ['/api/cart'],
    retry: 2,
    staleTime: 0,
    gcTime: 5 * 60 * 1000,
    refetchOnMount: true,
    queryFn: async () => {
      const response = await apiRequest('/api/cart');
      return Array.isArray(response) ? response : [];
    }
  });

  // Add to cart mutation
  const addToCartMutation = useMutation({
    mutationFn: async (data: { productId: number; quantity: number }) => {
      return await apiRequest('/api/cart/add', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({ title: 'Added to cart', description: 'Item added successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: 'Failed to add item to cart', variant: 'destructive' });
    }
  });

  // Update quantity mutation
  const updateQuantityMutation = useMutation({
    mutationFn: async (data: { productId: number; quantity: number }) => {
      return await apiRequest('POST', '/api/cart/update', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    },
    onError: (error) => {
      toast({ title: 'Error', description: 'Failed to update quantity', variant: 'destructive' });
    }
  });

  // Remove from cart mutation
  const removeFromCartMutation = useMutation({
    mutationFn: async (productId: number) => {
      return await apiRequest('POST', '/api/cart/remove', { productId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({ title: 'Removed from cart', description: 'Item removed successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: 'Failed to remove item', variant: 'destructive' });
    }
  });

  // Clear cart mutation
  const clearCartMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('DELETE', '/api/cart/clear');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({ title: 'Cart cleared', description: 'All items removed' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: 'Failed to clear cart', variant: 'destructive' });
    }
  });

  return {
    cartItems,
    isCartLoading,
    refetchCart,
    addToCart: addToCartMutation.mutate,
    updateQuantity: updateQuantityMutation.mutate,
    removeFromCart: removeFromCartMutation.mutate,
    clearCart: clearCartMutation.mutate,
    isAddingToCart: addToCartMutation.isPending,
    isUpdatingQuantity: updateQuantityMutation.isPending,
    isRemovingFromCart: removeFromCartMutation.isPending,
    isClearingCart: clearCartMutation.isPending
  };
}

// ============================================================================
// PRODUCT OPERATIONS - SINGLE IMPLEMENTATION
// ============================================================================

export function useUnifiedProducts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get products
  const { data: products = [], isLoading: isProductsLoading } = useQuery({
    queryKey: ['/api/products'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/products');
      return Array.isArray(response) ? response : [];
    }
  });

  // Get product by ID
  const getProduct = (productId: number) => {
    return useQuery({
      queryKey: ['/api/products', productId],
      queryFn: async () => {
        return await apiRequest('GET', `/api/products/${productId}`);
      }
    });
  };

  // Search products
  const searchProducts = (searchTerm: string) => {
    return useQuery({
      queryKey: ['/api/products/search', searchTerm],
      queryFn: async () => {
        return await apiRequest('GET', `/api/products/search?q=${encodeURIComponent(searchTerm)}`);
      },
      enabled: !!searchTerm
    });
  };

  return {
    products,
    isProductsLoading,
    getProduct,
    searchProducts
  };
}

// ============================================================================
// ORDER OPERATIONS - SINGLE IMPLEMENTATION
// ============================================================================

export function useUnifiedOrders() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get orders
  const { data: orders = [], isLoading: isOrdersLoading } = useQuery({
    queryKey: ['/api/orders'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/orders');
      return Array.isArray(response) ? response : [];
    }
  });

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      return await apiRequest('POST', '/api/orders', orderData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({ title: 'Order created', description: 'Order placed successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: 'Failed to create order', variant: 'destructive' });
    }
  });

  // Update order mutation
  const updateOrderMutation = useMutation({
    mutationFn: async (data: { orderId: number; updates: any }) => {
      return await apiRequest('PUT', `/api/orders/${data.orderId}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      toast({ title: 'Order updated', description: 'Order updated successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: 'Failed to update order', variant: 'destructive' });
    }
  });

  return {
    orders,
    isOrdersLoading,
    createOrder: createOrderMutation.mutate,
    updateOrder: updateOrderMutation.mutate,
    isCreatingOrder: createOrderMutation.isPending,
    isUpdatingOrder: updateOrderMutation.isPending
  };
}

// ============================================================================
// WISHLIST OPERATIONS - SINGLE IMPLEMENTATION
// ============================================================================

export function useUnifiedWishlist() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get wishlist
  const { data: wishlistItems = [], isLoading: isWishlistLoading } = useQuery({
    queryKey: ['/api/wishlist'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/wishlist');
      return Array.isArray(response) ? response : [];
    }
  });

  // Add to wishlist mutation
  const addToWishlistMutation = useMutation({
    mutationFn: async (productId: number) => {
      return await apiRequest('POST', '/api/wishlist', { productId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wishlist'] });
      toast({ title: 'Added to wishlist', description: 'Item added to wishlist' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: 'Failed to add to wishlist', variant: 'destructive' });
    }
  });

  // Remove from wishlist mutation
  const removeFromWishlistMutation = useMutation({
    mutationFn: async (productId: number) => {
      return await apiRequest('DELETE', `/api/wishlist/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/wishlist'] });
      toast({ title: 'Removed from wishlist', description: 'Item removed from wishlist' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: 'Failed to remove from wishlist', variant: 'destructive' });
    }
  });

  return {
    wishlistItems,
    isWishlistLoading,
    addToWishlist: addToWishlistMutation.mutate,
    removeFromWishlist: removeFromWishlistMutation.mutate,
    isAddingToWishlist: addToWishlistMutation.isPending,
    isRemovingFromWishlist: removeFromWishlistMutation.isPending
  };
}

// ============================================================================
// DRAFT ORDERS - SINGLE IMPLEMENTATION
// ============================================================================

export function useUnifiedDraftOrders() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Get draft orders
  const { data: draftOrders = [], isLoading: isDraftOrdersLoading } = useQuery({
    queryKey: ['/api/draft-orders'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/draft-orders');
      return Array.isArray(response) ? response : [];
    }
  });

  // Auto-save draft mutation
  const autoSaveDraftMutation = useMutation({
    mutationFn: async (draftData: any) => {
      return await apiRequest('POST', '/api/draft-orders/auto-save', draftData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/draft-orders'] });
    },
    onError: (error) => {
      // Silent error for auto-save
      console.error('Auto-save failed:', error);
    }
  });

  // Delete draft mutation
  const deleteDraftMutation = useMutation({
    mutationFn: async (draftId: number) => {
      return await apiRequest('DELETE', `/api/draft-orders/${draftId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/draft-orders'] });
      toast({ title: 'Draft deleted', description: 'Draft order deleted successfully' });
    },
    onError: (error) => {
      toast({ title: 'Error', description: 'Failed to delete draft', variant: 'destructive' });
    }
  });

  return {
    draftOrders,
    isDraftOrdersLoading,
    autoSaveDraft: autoSaveDraftMutation.mutate,
    deleteDraft: deleteDraftMutation.mutate,
    isAutoSavingDraft: autoSaveDraftMutation.isPending,
    isDeletingDraft: deleteDraftMutation.isPending
  };
}

// ============================================================================
// AI SUGGESTIONS - SINGLE IMPLEMENTATION
// ============================================================================

export function useUnifiedAISuggestions() {
  const queryClient = useQueryClient();

  // Get AI suggestions
  const { data: aiSuggestions = [], isLoading: isAISuggestionsLoading } = useQuery({
    queryKey: ['/api/ai-suggestions/checkout'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/ai-suggestions/checkout');
      return Array.isArray(response) ? response : [];
    }
  });

  return {
    aiSuggestions,
    isAISuggestionsLoading
  };
}

// ============================================================================
// EXPORT UNIFIED REGISTRY
// ============================================================================

// All functions are already exported individually above