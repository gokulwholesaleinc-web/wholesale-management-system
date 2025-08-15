import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Trash2, ChevronLeft, ArrowLeft, ShoppingBag, CalendarDays } from "lucide-react";
import { CartItemSimple } from "@/components/cart/CartItemSimple";
import { useClearCart } from "@/hooks/useClearCart";
import { SimplePickupDateSelector } from "@/components/checkout/SimplePickupDateSelector";

// Simple, stripped down cart page based on the screenshot

export function UltraSimpleCartPage() {
  const { user, isAuthenticated } = useAuth();
  const [_, navigate] = useLocation();
  const { clearCart, isClearing, clearSuccess, resetClearState } = useClearCart();
  
  // State for delivery option and pickup date
  const [deliveryOption, setDeliveryOption] = useState<'pickup' | 'delivery'>('pickup');
  const [pickupDate, setPickupDate] = useState<Date | undefined>(undefined);
  
  // Fetch cart data
  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ['/api/cart'],
    enabled: isAuthenticated,
  });
  
  // Calculate total
  const total = Array.isArray(cartItems) 
    ? cartItems.reduce((sum: number, item: any) => 
        sum + (item.product.price * item.quantity), 0) 
    : 0;
  
  // Reset clear success state when navigating away
  useEffect(() => {
    return () => resetClearState();
  }, [resetClearState]);
  
  // Handle cart clearing
  const handleClearCart = () => {
    if (!isAuthenticated || !user) return;
    const userId = typeof user === 'object' && 'id' in user ? user.id : 'admin-user';
    clearCart(userId);
  };
  
  // Handle navigation back to products
  const navigateToProducts = () => {
    navigate('/products');
  };
  
  // Handle delivery option change
  const handleDeliveryOptionChange = (option: 'pickup' | 'delivery') => {
    setDeliveryOption(option);
    if (option === 'delivery') {
      setPickupDate(undefined);
    }
  };
  
  // Handle order submission
  const handleSubmitOrder = () => {
    // Validate pickup date if store pickup is selected
    if (deliveryOption === 'pickup' && !pickupDate) {
      alert('Please select a pickup date before placing your order.');
      return;
    }
    
    // Create order message based on delivery option
    let orderMessage = 'Your order has been submitted.';
    if (deliveryOption === 'pickup' && pickupDate) {
      const date = pickupDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      orderMessage = `Your order has been submitted for pickup on ${date}. Please arrive during business hours (9am-5pm).`;
    } else {
      orderMessage = 'Your order has been submitted. You will be contacted soon to arrange delivery details.';
    }
    
    // Future implementation: submit order to server with pickup date
    alert(orderMessage);
    navigate('/');
  };
  
  // Responsive layout that works on both desktop and mobile
  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center mb-6">
        <Button 
          variant="ghost" 
          size="sm" 
          className="mr-2" 
          onClick={navigateToProducts}
        >
          <ArrowLeft className="h-5 w-5 mr-1" />
          <span>Back to Products</span>
        </Button>
        <h1 className="text-2xl font-bold">Shopping Cart</h1>
      </div>
      
      {clearSuccess ? (
        <div className="bg-white rounded-lg p-4 shadow-sm mb-4">
          <h2 className="font-medium">Cart reset complete</h2>
          <p className="text-gray-600">Your cart has been completely reset</p>
          <Button 
            variant="default" 
            className="mt-4" 
            onClick={navigateToProducts}
          >
            <ShoppingBag className="mr-2 h-4 w-4" />
            Continue Shopping
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm mb-6">
          {/* Cart items display */}
          {Array.isArray(cartItems) && cartItems.length > 0 ? (
            <div className="p-4">
              {cartItems.map((item: any) => (
                <CartItemSimple key={item.id} item={item} />
              ))}
              <div className="flex justify-between py-4 mt-3 border-t">
                <span className="font-bold text-lg">Subtotal</span>
                <span className="font-bold text-lg">${total.toFixed(2)}</span>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-gray-500">Your cart is empty</p>
              <Button 
                variant="outline" 
                className="mt-4" 
                onClick={navigateToProducts}
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                Browse Products
              </Button>
            </div>
          )}
          
          {Array.isArray(cartItems) && cartItems.length > 0 && (
            <div className="p-4 pt-0">
              <Button 
                variant="outline"
                className="w-full bg-red-50 text-red-500 hover:bg-red-100 border-red-200 flex items-center justify-center"
                onClick={() => handleClearCart()}
                disabled={isClearing}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Cart
              </Button>
            </div>
          )}
        </div>
      )}
      
      <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-lg mb-6">
        <div className="flex items-start">
          <div className="text-amber-500 mr-2">⚠️</div>
          <div>
            <h3 className="font-medium text-amber-800">Payment Information</h3>
            <p className="text-sm text-amber-700">
              This is only an order estimation. No payment will be taken through this app.
              All payments will be made in person at pickup or upon delivery.
            </p>
            

          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <h2 className="text-xl font-bold mb-4">Delivery Options</h2>
        <div className="space-y-3">
          <div className="border rounded-lg p-3">
            <div className="flex items-center">
              <input 
                type="radio" 
                id="pickup" 
                name="delivery" 
                className="mr-3"
                checked={deliveryOption === 'pickup'}
                onChange={() => handleDeliveryOptionChange('pickup')}
              />
              <label htmlFor="pickup" className="font-medium">Store Pickup</label>
            </div>
            
            {/* Show pickup date selector when store pickup is selected */}
            {deliveryOption === 'pickup' && (
              <div className="mt-3 ml-6">
                <p className="text-sm text-gray-600 mb-2">Select your preferred pickup date:</p>
                <SimplePickupDateSelector 
                  value={pickupDate}
                  onChange={setPickupDate}
                />
                <p className="text-xs text-gray-500 mt-2">
                  Please arrive during business hours (9am-5pm)
                </p>
              </div>
            )}
          </div>
          
          <div className="border rounded-lg p-3">
            <div className="flex items-center">
              <input 
                type="radio" 
                id="delivery" 
                name="delivery" 
                className="mr-3"
                checked={deliveryOption === 'delivery'}
                onChange={() => handleDeliveryOptionChange('delivery')}
              />
              <label htmlFor="delivery" className="font-medium">Delivery (7 day window)</label>
            </div>
            
            {deliveryOption === 'delivery' && (
              <div className="mt-2 ml-6">
                <p className="text-sm text-gray-600">
                  Our staff will contact you to arrange a delivery date and time within 7 business days.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {Array.isArray(cartItems) && cartItems.length > 0 && (
        <div className="mt-6 space-y-4">
          <Button 
            className="w-full py-6 text-lg bg-green-600 hover:bg-green-700 text-white" 
            onClick={handleSubmitOrder}
          >
            Place Order
          </Button>
          <p className="text-center text-sm text-gray-500">
            By submitting your order, our staff will contact you to confirm details.
          </p>
        </div>
      )}
    </div>
  );
}

export default UltraSimpleCartPage;