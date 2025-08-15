// This is a compatibility layer to replace the old CartProvider with simpleCart

import { useSimpleCart } from '@/hooks/simpleCart';

// Export simpleCart as useCart for backward compatibility
export const /**
 * DEPRECATED: Use useUnifiedCart from function-registry instead
 * This hook is kept for backwards compatibility only
 */
useCart = () => {
  console.log('DEPRECATED: useCart hook used. Please migrate to useUnifiedCart from function-registry');
  
  // Import unified cart from registry
  const { useUnifiedCart } = require('@shared/function-registry');
  const unifiedCart = useUnifiedCart();
  
  // Return unified cart interface with legacy compatibility
  return {
    cartItems: unifiedCart.cartItems || [],
    itemCount: unifiedCart.itemCount || 0,
    cartTotal: unifiedCart.cartTotal || 0,
    
    // Legacy methods that point to unified cart
    addToCart: unifiedCart.addToCart,
    removeFromCart: unifiedCart.removeFromCart,
    updateQuantity: unifiedCart.updateQuantity,
    clearCart: unifiedCart.clearCart,
    
    // Legacy properties for compatibility
    deliveryDates: [],
    timeSlots: [],
    selectDeliveryDate: () => {},
    selectTimeSlot: () => {},
    selectedDeliveryDate: null,
    selectedTimeSlot: null,
    placeOrder: async () => ({}),
    isPlacingOrder: false,
    isLoading: unifiedCart.isLoading || false
  };
};

// No-op functions that don't do anything
export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  console.log('CartProvider is deprecated, using simpleCart instead');
  return <>{children}</>;
};

export const addToCartFromOutside = async (productId: number, quantity: number) => {
  console.log('Using simplified addToCartFromOutside');
  try {
    const { addToCart } = useSimpleCart();
    await addToCart(productId, quantity);
    return true;
  } catch (error) {
    console.error('Failed to add to cart:', error);
    return false;
  }
};
