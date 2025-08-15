import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useRef, useCallback } from "react";

interface CartItem {
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

interface OptimisticCartState {
  items: CartItem[];
  total: number;
  itemCount: number;
}

const CART_QUERY_KEY = ['/api/cart'];

// Debounce utility for preventing duplicate requests
function useDebounceQueue() {
  const pending = useRef(new Map<number, NodeJS.Timeout>());
  
  const debounce = useCallback((productId: number, fn: () => void, delay = 150) => {
    // Clear existing timeout for this product
    const existing = pending.current.get(productId);
    if (existing) {
      clearTimeout(existing);
    }
    
    // Set new timeout
    const timeout = setTimeout(() => {
      fn();
      pending.current.delete(productId);
    }, delay);
    
    pending.current.set(productId, timeout);
  }, []);
  
  return { debounce };
}

export function useOptimizedCart() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { debounce } = useDebounceQueue();

  // Fetch cart data with smart caching
  const { data: cart, isLoading } = useQuery({
    queryKey: CART_QUERY_KEY,
    queryFn: async () => {
      const response = await apiRequest('/api/cart');
      return response;
    },
    staleTime: 30_000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Helper to calculate totals
  const calculateTotals = useCallback((items: CartItem[]) => {
    const total = items.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
    const itemCount = items.reduce((count, item) => count + item.quantity, 0);
    return { total, itemCount };
  }, []);

  // Optimistic add to cart with immediate UI updates
  const addToCartMutation = useMutation({
    mutationFn: async ({ productId, quantity = 1, product }: { 
      productId: number; 
      quantity?: number; 
      product?: any;
    }) => {
      return apiRequest('/api/cart/add', {
        method: 'POST',
        body: { productId, quantity },
      });
    },

    onMutate: async ({ productId, quantity = 1, product }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY });

      // Snapshot current cart
      const previousCart = queryClient.getQueryData<CartItem[]>(CART_QUERY_KEY) || [];

      // Optimistically update cart
      const newCart = [...previousCart];
      const existingIndex = newCart.findIndex(item => item.productId === productId);

      if (existingIndex >= 0) {
        // Update existing item
        newCart[existingIndex] = {
          ...newCart[existingIndex],
          quantity: newCart[existingIndex].quantity + quantity,
        };
      } else if (product) {
        // Add new item (if product data available)
        const newItem: CartItem = {
          id: Date.now(), // Temporary ID
          productId,
          quantity,
          product: {
            id: productId,
            name: product.name || 'Loading...',
            price: product.price || 0,
            imageUrl: product.imageUrl,
            stock: product.stock || 100,
          },
        };
        newCart.push(newItem);
      }

      // Apply optimistic update
      queryClient.setQueryData(CART_QUERY_KEY, newCart);

      // Show immediate feedback
      toast({
        title: "Added to cart",
        description: "Item added successfully",
        duration: 2000,
      });

      return { previousCart };
    },

    onError: (error, variables, context) => {
      // Revert on error
      if (context?.previousCart) {
        queryClient.setQueryData(CART_QUERY_KEY, context.previousCart);
      }
      
      toast({
        title: "Failed to add to cart",
        description: "Please try again",
        variant: "destructive",
      });
    },

    onSettled: () => {
      // Refresh cart data after short delay to sync with server
      debounce(0, () => {
        queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      }, 300);
    },
  });

  // Optimized quantity update
  const updateQuantityMutation = useMutation({
    mutationFn: async ({ productId, quantity }: { productId: number; quantity: number }) => {
      if (quantity <= 0) {
        return apiRequest('/api/cart/remove', {
          method: 'DELETE',
          body: { productId },
        });
      }
      return apiRequest('/api/cart/update', {
        method: 'PUT',
        body: { productId, quantity },
      });
    },

    onMutate: async ({ productId, quantity }) => {
      await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
      const previousCart = queryClient.getQueryData<CartItem[]>(CART_QUERY_KEY) || [];

      const newCart = quantity <= 0 
        ? previousCart.filter(item => item.productId !== productId)
        : previousCart.map(item =>
            item.productId === productId ? { ...item, quantity } : item
          );

      queryClient.setQueryData(CART_QUERY_KEY, newCart);
      return { previousCart };
    },

    onError: (error, variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(CART_QUERY_KEY, context.previousCart);
      }
    },

    onSettled: () => {
      debounce(0, () => {
        queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
      }, 200);
    },
  });

  // Remove item from cart
  const removeFromCartMutation = useMutation({
    mutationFn: async (productId: number) => {
      return apiRequest('/api/cart/remove', {
        method: 'DELETE',
        body: { productId },
      });
    },

    onMutate: async (productId) => {
      await queryClient.cancelQueries({ queryKey: CART_QUERY_KEY });
      const previousCart = queryClient.getQueryData<CartItem[]>(CART_QUERY_KEY) || [];
      
      const newCart = previousCart.filter(item => item.productId !== productId);
      queryClient.setQueryData(CART_QUERY_KEY, newCart);
      
      return { previousCart };
    },

    onError: (error, variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(CART_QUERY_KEY, context.previousCart);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    },
  });

  // Clear entire cart
  const clearCartMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/cart/clear', { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.setQueryData(CART_QUERY_KEY, []);
      toast({ title: "Cart cleared" });
    },
  });

  // Computed values
  const cartItems = cart || [];
  const { total: cartTotal, itemCount } = calculateTotals(cartItems);

  return {
    // Data
    cartItems,
    cartTotal,
    itemCount,
    isLoading,

    // Actions with optimistic updates
    addToCart: useCallback((productId: number, quantity = 1, product?: any) => {
      addToCartMutation.mutate({ productId, quantity, product });
    }, [addToCartMutation]),

    updateQuantity: useCallback((productId: number, quantity: number) => {
      updateQuantityMutation.mutate({ productId, quantity });
    }, [updateQuantityMutation]),

    removeFromCart: useCallback((productId: number) => {
      removeFromCartMutation.mutate(productId);
    }, [removeFromCartMutation]),

    clearCart: useCallback(() => {
      clearCartMutation.mutate();
    }, [clearCartMutation]),

    // Loading states
    isAddingToCart: addToCartMutation.isPending,
    isUpdatingCart: updateQuantityMutation.isPending,
    isRemovingFromCart: removeFromCartMutation.isPending,
    isClearingCart: clearCartMutation.isPending,

    // Refresh function
    refreshCart: useCallback(() => {
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY });
    }, [queryClient]),
  };
}