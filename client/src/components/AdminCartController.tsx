import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';

/**
 * Special component for admin cart management
 * Provides direct control methods to clear the cart completely
 */
export function AdminCartController() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isClearing, setIsClearing] = useState(false);
  
  // Only show this component for admin users
  if (!user?.id || user.id !== 'admin-user') {
    return null;
  }
  
  // Special ultra-reliable cart clear for admin accounts
  const adminClearCart = async () => {
    if (isClearing) return;
    
    try {
      setIsClearing(true);
      
      console.log("ADMIN CART CLEAR INITIATED");
      
      // First, clear client-side cache immediately for better UX
      queryClient.setQueryData(['/api/cart'], []);
      
      // Get the authentication token using centralized auth store
      import { getAuthToken } from '@/lib/authStore';
      const token = getAuthToken('main') || '';
      
      // Use our new dedicated admin cart clear endpoint
      await fetch('/api/admin/clear-global-cart', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'Cache-Control': 'no-cache'
        }
      });
      
      // Use standard cart clear endpoint
      try {
        await fetch('/api/cart/clear', {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
      } catch (clearError) {
        console.log("Standard cart clear error:", clearError);
      }
      
      // Force refresh cache
      await queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      queryClient.refetchQueries({ queryKey: ['/api/cart'] });
      
      toast({
        title: 'Cart cleared',
        description: 'Your cart has been cleared successfully.',
      });
    } catch (error) {
      console.error("Admin cart clear error:", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to clear cart. Please try again.',
      });
      
      // Force reload the page as last resort
      window.location.reload();
    } finally {
      setIsClearing(false);
    }
  };
  
  return (
    <div className="mt-4 mb-2">
      <Button 
        onClick={adminClearCart}
        disabled={isClearing}
        variant="outline"
        className="w-full text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600 text-xs h-8 flex items-center justify-center"
      >
        <Trash2 className="mr-1 h-3 w-3" />
        {isClearing ? 'Clearing Cart...' : 'Clear Cart'}
      </Button>
    </div>
  );
}