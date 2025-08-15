import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

// Define interface for cart items
interface CartItem {
  id: number;
  userId: string;
  productId: number;
  quantity: number;
  product?: {
    id: number;
    name: string;
    price: number;
    imageUrl?: string;
    stock: number;
  };
}

export function useSimpleCart() {
  const { toast } = useToast();
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Get cart items with responsive caching for immediate updates
  const { data: cartItems = [], isLoading, refetch: refetchCart } = useQuery({
    queryKey: ['/api/cart'],
    retry: 2,
    retryDelay: 1000,
    refetchOnWindowFocus: true,
    staleTime: 0, // Always consider stale for immediate updates
    gcTime: 5 * 60 * 1000, // 5 minutes - shorter cache retention for responsiveness
    refetchOnMount: true,
    queryFn: async () => {
      try {
        console.log('Fetching cart items from database...');
        const response = await apiRequest('GET', '/api/cart');
        console.log('Cart items retrieved:', response?.length || 0, 'items');
        
        // Ensure we always return an array
        const items = Array.isArray(response) ? response : [];
        
        // Log cart contents for debugging
        if (items.length > 0) {
          console.log('Cart contains:', items.map(item => `${item.product?.name} (qty: ${item.quantity})`).join(', '));
        } else {
          console.log('Cart is empty from database');
        }
        
        return items;
      } catch (error) {
        console.error('Failed to fetch cart items:', error);
        return [];
      }
    }
  });

  // Add to cart mutation - OPTIMIZED FOR PERFORMANCE
  const addToCartMutation = useMutation({
    mutationFn: async ({ productId, quantity }: { productId: number, quantity: number }) => {
      console.log(`Adding product ${productId} with quantity ${quantity} to cart...`);
      const response = await apiRequest('POST', '/api/cart', { productId, quantity });
      console.log('Add to cart response:', response);
      return response;
    },
    onSuccess: (data) => {
      console.log('Successfully added to cart:', data);
      // OPTIMIZED: Single cache invalidation to prevent race conditions
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({
        title: "Added to cart",
        description: "Product has been added to your cart"
      });
    },
    onError: (error: any) => {
      console.error('Error adding to cart:', error);
      toast({
        variant: "destructive",
        title: "Failed to add product",
        description: error.message || "There was an error adding the product to your cart"
      });
    }
  });

  // Remove from cart mutation
  const removeFromCartMutation = useMutation({
    mutationFn: async (productId: number) => {
      console.log(`Removing product ${productId} from cart...`);
      const response = await apiRequest('DELETE', `/api/cart/${productId}`);
      console.log('Remove from cart response:', response);
      return response;
    },
    onSuccess: (data) => {
      console.log('Successfully removed from cart:', data);
      // Aggressive cache invalidation for immediate UI updates
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      queryClient.removeQueries({ queryKey: ['/api/cart'] });
      // Manually refetch to ensure UI updates
      refetchCart();
      toast({
        title: "Removed from cart",
        description: "Item has been removed from your cart"
      });
    },
    onError: (error: any) => {
      console.error('Error removing from cart:', error);
      toast({
        variant: "destructive",
        title: "Failed to remove item",
        description: error.message || "There was an error removing the item from your cart"
      });
    }
  });

  // Calculate totals
  const totalItems = Array.isArray(cartItems) 
    ? cartItems.reduce((total: number, item: CartItem) => total + item.quantity, 0)
    : 0;

  const subtotal = Array.isArray(cartItems)
    ? cartItems.reduce((total: number, item: CartItem) => {
        if (item.product) {
          return total + (item.quantity * item.product.price);
        }
        return total;
      }, 0)
    : 0;

  const deliveryFee = subtotal > 0 ? 15.00 : 0;
  const total = subtotal + deliveryFee;

  // Update quantity mutation - OPTIMIZED FOR PERFORMANCE
  const updateQuantityMutation = useMutation({
    mutationFn: async ({ productId, quantity }: { productId: number, quantity: number }) => {
      console.log(`Updating quantity for product ${productId} to EXACTLY ${quantity}...`);
      // Use the more reliable direct update endpoint
      const response = await apiRequest('POST', '/api/update-cart-direct', { 
        productId, 
        quantity,
      });
      console.log('Update quantity response (direct method):', response);
      return response;
    },
    onSuccess: (data) => {
      console.log('Successfully updated quantity:', data);
      // OPTIMIZED: Single cache invalidation to prevent race conditions
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({
        title: "Cart updated",
        description: "Item quantity has been updated"
      });
    },
    onError: (error: any) => {
      console.error('Error updating quantity:', error);
      toast({
        variant: "destructive",
        title: "Failed to update item",
        description: error.message || "There was an error updating the item quantity"
      });
    }
  });

  // Cart functions
  const addToCart = async (productId: number, quantity: number) => {
    await addToCartMutation.mutateAsync({ productId, quantity });
  };

  const removeFromCart = async (productId: number) => {
    await removeFromCartMutation.mutateAsync(productId);
  };

  const updateQuantity = async (productId: number, quantity: number) => {
    if (quantity <= 0) {
      await removeFromCart(productId);
      return;
    }
    await updateQuantityMutation.mutateAsync({ productId, quantity });
  };

  // Clear cart mutation - OPTIMIZED FOR PERFORMANCE
  const clearCartMutation = useMutation({
    mutationFn: async (userId: string) => {
      console.log(`Clearing cart for user ${userId}...`);
      return apiRequest('DELETE', '/api/cart/clear');
    },
    onSuccess: () => {
      // OPTIMIZED: Single cache invalidation to prevent race conditions
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      toast({
        title: "Cart cleared",
        description: "Your cart has been cleared successfully"
      });
    },
    onError: (error: any) => {
      console.error('Error clearing cart:', error);
      toast({
        variant: "destructive",
        title: "Failed to clear cart",
        description: error.message || "There was an error clearing your cart"
      });
    }
  });

  // Clear cart function
  const clearCart = async (userId: string) => {
    await clearCartMutation.mutateAsync(userId);
  };

  const openCart = () => setIsCartOpen(true);
  const closeCart = () => setIsCartOpen(false);
  const toggleCart = () => setIsCartOpen(!isCartOpen);

  return {
    cartItems,
    isLoading,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    totalItems,
    subtotal,
    deliveryFee,
    total,
    isCartOpen,
    openCart,
    closeCart,
    toggleCart
  };
}