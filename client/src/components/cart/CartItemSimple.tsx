import React from 'react';
import { Minus, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface CartItemSimpleProps {
  item: {
    id: number;
    productId: number;
    quantity: number;
    product: {
      id: number;
      name: string;
      description: string;
      price: number;
      imageUrl: string;
      stock: number;
    };
  };
}

export function CartItemSimple({ item }: CartItemSimpleProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Function to update item quantity
  const updateQuantity = async (newQuantity: number) => {
    if (!user?.id || !item) return;
    
    try {
      // Validate quantity
      if (newQuantity < 1) {
        await removeItem();
        return;
      }
      
      if (newQuantity > item.product.stock) {
        toast({
          variant: 'destructive',
          title: 'Maximum stock reached',
          description: `Only ${item.product.stock} item(s) available`,
        });
        return;
      }
      
      // Log for debugging
      console.log(`⭐️ DIRECT CART UPDATE: User ${user.id || 'anonymous'}, Product ${item.productId}, Quantity ${newQuantity}`);
      
      // Use the direct update endpoint which is more reliable
      const response = await fetch(`/api/update-cart-direct`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        body: JSON.stringify({
          userId: user.id || 'admin-user', // Fallback for compatibility
          productId: item.productId,
          quantity: newQuantity
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Cart update failed:', errorData);
        throw new Error(errorData.message || 'Failed to update cart item');
      }
      
      // Immediately refresh cart data
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      
      // Also refetch after a short delay to ensure we have the latest data
      setTimeout(() => {
        queryClient.refetchQueries({ queryKey: ['/api/cart'] });
      }, 100);
      
      // Show success toast
      toast({
        title: 'Cart updated',
        description: `Updated ${item.product.name} quantity to ${newQuantity}`,
      });
      
    } catch (error) {
      console.error('Error updating cart item:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update item quantity. Please try again.',
      });
    }
  };

  // Function to remove item from cart
  const removeItem = async () => {
    if (!user?.id) return;
    
    try {
      console.log(`Removing item ${item.productId} from cart`);
      
      // If this is admin user, use special handling to ensure item removal works
      if (user.id === 'admin-user') {
        console.log(`Special admin cart handling: Removing product ${item.productId}`);
        
        // For admin cart, we need to take a more direct approach
        const token = localStorage.getItem('authToken');
        
        // Try multiple removal methods to ensure success
        const requests = [
          // Method 1: Simple remove endpoint
          fetch(`/api/simple-remove-from-cart`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token || ''}`,
            },
            body: JSON.stringify({
              userId: 'admin-user',
              productId: item.productId
            }),
          }),
          
          // Method 2: Direct cart update with zero quantity (signals removal)
          fetch(`/api/update-cart-direct`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token || ''}`,
              'Cache-Control': 'no-cache'
            },
            body: JSON.stringify({
              userId: 'admin-user',
              productId: item.productId,
              quantity: 0
            }),
          }),
          
          // Method 3: Specialized admin cart item removal
          fetch(`/api/admin-cart-remove/${item.productId}`, {
            method: 'DELETE',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token || ''}`,
            },
          }),
        ];
        
        // Execute all removal methods
        await Promise.allSettled(requests);
        
        // Force refresh cart
        queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
        setTimeout(() => {
          queryClient.refetchQueries({ queryKey: ['/api/cart'] });
        }, 300);
        
        toast({
          title: 'Item removed',
          description: `${item.product.name} removed from cart`,
        });
        
        return;
      }
      
      // Regular user cart removal
      const response = await fetch(`/api/cart/remove`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionStorage.getItem('authToken') || sessionStorage.getItem('gokul_auth_token') || JSON.parse(sessionStorage.getItem('gokul_auth_data') || '{}')?.token}`,
        },
        body: JSON.stringify({
          productId: item.productId
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove cart item');
      }
      
      // Refresh cart data
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      
      toast({
        title: 'Item removed',
        description: `${item.product.name} removed from cart`,
      });
      
    } catch (error) {
      console.error('Error removing cart item:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to remove item from cart',
      });
    }
  };

  return (
    <div className="flex py-4 border-b">
      {/* Product image */}
      <div className="w-16 h-16 rounded overflow-hidden bg-gray-100 mr-3 flex-shrink-0">
        <img 
          src={item.product.imageUrl || '/placeholder-image.jpg'} 
          alt={item.product.name}
          className="w-full h-full object-cover"
        />
      </div>
      
      {/* Product details */}
      <div className="flex-1">
        <h3 className="font-medium text-sm">{item.product.name}</h3>
        <p className="text-gray-500 text-xs mt-1 line-clamp-2">{item.product.description}</p>
        
        {/* Price */}
        <div className="mt-1 font-medium">${item.product.price.toFixed(2)}</div>
        
        {/* Quantity controls */}
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center border rounded">
            <button 
              onClick={() => updateQuantity(item.quantity - 1)}
              className="px-2 py-1 text-gray-500 hover:bg-gray-100 active:bg-gray-200"
              aria-label="Decrease quantity"
            >
              <Minus className="h-3 w-3" />
            </button>
            
            <span className="px-2 py-1 min-w-[2rem] text-center text-sm">
              {item.quantity}
            </span>
            
            <button 
              onClick={() => updateQuantity(item.quantity + 1)}
              className="px-2 py-1 text-gray-500 hover:bg-gray-100 active:bg-gray-200"
              aria-label="Increase quantity"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
          
          <button 
            onClick={removeItem}
            className="text-red-500 p-1 hover:bg-red-50 rounded"
            aria-label="Remove item"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}