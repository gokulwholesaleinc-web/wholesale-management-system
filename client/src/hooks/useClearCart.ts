import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useToast } from './use-toast';
import { apiRequest } from '@/lib/queryClient';

export function useClearCart() {
  const [isClearing, setIsClearing] = useState(false);
  const [clearSuccess, setClearSuccess] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const clearCart = async (userId: string) => {
    if (!userId) return;
    
    try {
      setIsClearing(true);
      
      console.log("Initiating cart clear for user:", userId);
      
      // apiRequest returns parsed JSON directly, not a Response object
      const result = await apiRequest('DELETE', '/api/cart/clear');
      
      if (result.success) {
        // Force refresh cart data with aggressive cache invalidation
        await queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
        await queryClient.refetchQueries({ queryKey: ['/api/cart'] });
        
        // Set success state
        setClearSuccess(true);
        
        toast({
          title: "Cart cleared",
          description: "Your cart has been cleared successfully"
        });
      } else {
        throw new Error(result.message || 'Failed to clear cart');
      }
    } catch (error) {
      console.error("Cart clearing error:", error);
      toast({
        variant: "destructive",
        title: "Error clearing cart",
        description: error.message || "An unexpected error occurred"
      });
    } finally {
      setIsClearing(false);
    }
  };

  const resetClearState = () => {
    setClearSuccess(false);
  };

  return {
    clearCart,
    isClearing,
    clearSuccess,
    resetClearState
  };
}

export default useClearCart;