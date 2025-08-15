import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface CartItemProps {
  item: {
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
  };
}

export function CartItem({ item }: CartItemProps) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Function to refresh cart data
  const refreshCart = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
    console.log('Cart refreshed');
  };
  
  // State to track loading state during updates
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Function to update cart quantity directly (more reliable method)
  const updateQuantity = async (newQuantity: number) => {
    if (isUpdating) return; // Prevent concurrent updates
    
    setIsUpdating(true);
    console.log(`Updating quantity for ${item.productId} to ${newQuantity}`, item);
    
    try {
      // Use the improved direct update endpoint
      console.log(`Using direct update endpoint to set quantity to ${newQuantity}`);
      const directUpdateResponse = await fetch('/api/update-cart-direct', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          // For compatibility with both admin and regular users
          userId: 'admin-user', 
          productId: item.productId,
          quantity: newQuantity
        })
      });
      
      if (directUpdateResponse.ok) {
        console.log('Direct update successful');
        
        // Force thorough cache refresh
        queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
        
        // Also refetch after a small delay to ensure latest data
        setTimeout(() => {
          queryClient.refetchQueries({ queryKey: ['/api/cart'] });
        }, 100);
        
        setIsUpdating(false);
        return;
      } else {
        throw new Error('Direct update failed');
      }
    } catch (error: any) {
      console.error('Error updating quantity:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update quantity"
      });
    } finally {
      setIsUpdating(false);
      refreshCart();
    }
  };
  
  // Handle increment - more reliable implementation
  const handleIncrement = async () => {
    if (item.quantity < item.product.stock) {
      const newQuantity = item.quantity + 1;
      await updateQuantity(newQuantity);
      
      toast({
        title: "Quantity updated",
        description: `Quantity for ${item.product.name} increased`
      });
    } else {
      toast({
        variant: "destructive",
        title: "Maximum quantity reached",
        description: `Only ${item.product.stock} available in stock`
      });
    }
  };
  
  // Handle decrement - more reliable implementation
  const handleDecrement = async () => {
    if (item.quantity <= 1) {
      handleRemove();
      return;
    }
    
    const newQuantity = item.quantity - 1;
    await updateQuantity(newQuantity);
    
    toast({
      title: "Quantity updated",
      description: `Quantity for ${item.product.name} decreased`
    });
  };
  
  const handleRemove = async () => {
    console.log(`Removing item ${item.productId} from cart`, item);
    try {
      const response = await fetch(`/api/cart/${item.productId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        toast({
          title: "Item removed",
          description: `${item.product.name} removed from cart`
        });
        refreshCart();
      } else {
        console.error('Failed to remove item:', await response.json());
        toast({
          variant: "destructive",
          title: "Removal failed",
          description: "Failed to remove item from cart"
        });
      }
    } catch (error) {
      console.error('Error removing item:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "There was a problem updating your cart"
      });
    }
  };
  
  // Calculate total price for this item
  const itemTotal = item.product.price * item.quantity;
  
  // Format price
  const formattedPrice = itemTotal.toFixed(2);
  
  // Track image loading state
  const [imageError, setImageError] = useState(false);
  
  // Generate gradient background for items without images
  const getGradientBg = () => {
    // Create a deterministic gradient based on product ID
    const hue1 = (item.product.id * 75) % 360;
    const hue2 = (hue1 + 40) % 360;
    return `linear-gradient(135deg, hsl(${hue1}, 70%, 50%) 0%, hsl(${hue2}, 70%, 60%) 100%)`;
  };

  return (
    <div className="flex items-center py-4 border-b border-slate-200">
      {!imageError && item.product.imageUrl ? (
        <img
          src={item.product.imageUrl}
          alt={item.product.name}
          className="w-16 h-16 rounded-md object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <div 
          className="w-16 h-16 rounded-md flex items-center justify-center text-white"
          style={{ background: getGradientBg() }}
        >
          <ShoppingBag className="w-6 h-6" />
        </div>
      )}
      <div className="ml-4 flex-1">
        <h4 className="font-medium text-sm">{item.product.name}</h4>
        <p className="text-slate-500 text-xs">${item.product.price.toFixed(2)} each</p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center border border-slate-300 rounded-md">
            <button 
              className="px-2 py-1 text-slate-600 hover:bg-slate-100"
              onClick={handleDecrement}
              aria-label="Decrease quantity"
              title="Remove one"
            >
              <Minus className="h-3 w-3" />
            </button>
            <span className="px-2 py-1 text-sm">{item.quantity}</span>
            <button 
              className="px-2 py-1 text-slate-600 hover:bg-slate-100"
              onClick={handleIncrement}
              aria-label="Increase quantity"
              disabled={item.quantity >= item.product.stock}
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
          <p className="font-semibold">${formattedPrice}</p>
        </div>
      </div>
      <button 
        className="ml-2 p-1 text-slate-400 hover:text-red-500"
        onClick={handleRemove}
        aria-label="Remove item"
      >
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}