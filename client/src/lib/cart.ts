import { apiRequest } from "./queryClient";

export const clearCart = async (userId: string) => {
  console.log('Attempting to clear cart for user:', userId);
  
  try {
    // Use the standard cart clear endpoint
    const response = await apiRequest('DELETE', '/api/cart/clear');
    console.log('Cart clear response:', response);
    return true;
  } catch (error) {
    console.error('Error clearing cart:', error);
    return false;
  }
};