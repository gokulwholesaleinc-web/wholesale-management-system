import React from 'react';
import { Button } from "@/components/ui/button";
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useSimpleCart } from '@/hooks/useSimpleCart';

/**
 * Emergency component for directly clearing carts when normal methods fail
 */
export function EmergencyCartClearer() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { refreshCart } = useSimpleCart();
  
  // Direct clear bypassing all normal routes
  const clearCartDirectly = async () => {
    try {
      // Replace current cart items in UI directly by redirecting to Home
      window.location.href = '/?cartCleared=true';
    } catch (error) {
      console.error('Failed to clear cart:', error);
      toast({
        title: 'Error',
        description: 'Failed to clear cart. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (!user?.id) return null;
  
  return (
    <div className="mt-2">
      <Button 
        variant="destructive" 
        size="sm" 
        className="w-full text-xs h-7"
        onClick={clearCartDirectly}
      >
        Force Clear Cart
      </Button>
    </div>
  );
}