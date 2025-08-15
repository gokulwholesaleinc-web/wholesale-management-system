import React, { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Trash2, ArrowLeft, ShoppingBag, ArrowRight, ChevronLeft, ChevronRight, Package, MapPin, CheckCircle, Store, Truck } from "lucide-react";
import { CartItemSimple } from "@/components/cart/CartItemSimple";
import { useClearCart } from "@/hooks/useClearCart";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DeliveryAddressSelector } from "@/components/cart/DeliveryAddressSelector";
import { SelectedDeliveryAddress } from "@/components/cart/SelectedDeliveryAddress";
import { Badge } from "@/components/ui/badge";
import { BackButton } from "@/components/ui/back-button";
import { apiRequest } from "@/lib/queryClient";

// Helper function to format date for Chicago timezone
const formatDateForChicago = (date: Date): string => {
  // Create a new date in Chicago timezone to avoid UTC conversion issues
  const chicagoDate = new Date(date.toLocaleString("en-US", {timeZone: "America/Chicago"}));
  
  // Format as YYYY-MM-DD for input fields
  const year = chicagoDate.getFullYear();
  const month = String(chicagoDate.getMonth() + 1).padStart(2, '0');
  const day = String(chicagoDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

export function ScrollableMobileCartPage() {
  const { user, isAuthenticated } = useAuth();
  const [_, navigate] = useLocation();
  const { clearCart, isClearing, clearSuccess, resetClearState } = useClearCart();

  // State for delivery option and pickup date
  const [deliveryOption, setDeliveryOption] = useState<'pickup' | 'delivery'>('pickup');
  // Set default pickup date to today instead of undefined
  const [pickupDate, setPickupDate] = useState<Date | undefined>(new Date());
  const [notes, setNotes] = useState<string>('');
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null);

  // Step navigation
  const [step, setStep] = useState<'cart' | 'delivery' | 'confirm'>('cart');

  // Order placement state
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Fetch cart data
  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ['/api/cart'],
    enabled: isAuthenticated,
  });

  // Fetch order settings for delivery fee calculation
  const { data: orderSettings } = useQuery({
    queryKey: ['/api/order-settings/minimum'],
    enabled: isAuthenticated,
  });

  // Calculate subtotal
  const subtotal = Array.isArray(cartItems) 
    ? cartItems.reduce((sum: number, item: any) => 
        sum + (item.product.price * item.quantity), 0) 
    : 0;

  // Calculate delivery fee based on order settings
  const freeDeliveryThreshold = (orderSettings as any)?.freeDeliveryThreshold || 500;
  const baseDeliveryFee = (orderSettings as any)?.deliveryFee || 25;
  const deliveryFee = deliveryOption === 'delivery' ? (subtotal >= freeDeliveryThreshold ? 0 : baseDeliveryFee) : 0;

  // Calculate total including delivery fee
  const total = subtotal + deliveryFee;

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
      // Don't reset pickup date to undefined
      // We'll just not show it in the UI, but keep the value
    } else if (option === 'pickup' && !pickupDate) {
      // If switching to pickup and no date is set, set to today
      setPickupDate(new Date());
    }
  };

  // Next step navigation
  const nextStep = () => {
    if (step === 'cart') setStep('delivery');
    else if (step === 'delivery') setStep('confirm');
  };

  // Previous step navigation
  const prevStep = () => {
    if (step === 'delivery') setStep('cart');
    else if (step === 'confirm') setStep('delivery');
  };

  const submitOrderAsync = async () => {
    console.log('🚀 MOBILE: Starting simplified order submission...');

    // Basic validation
    if (deliveryOption === 'pickup' && !pickupDate) {
      alert('Please select a pickup date.');
      setIsPlacingOrder(false);
      return;
    }

    if (deliveryOption === 'delivery' && !selectedAddressId) {
      alert('Please select a delivery address.');
      setIsPlacingOrder(false);
      return;
    }

    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      alert('Your cart is empty.');
      setIsPlacingOrder(false);
      return;
    }

    try {
      console.log('📦 MOBILE: Preparing order data...');
      
      // Simplified order data with delivery fee
      const orderData = {
        items: Array.isArray(cartItems) ? cartItems.map((item: any) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.product?.price || item.price
        })) : [],
        total: total,
        deliveryFee: deliveryFee,
        orderType: deliveryOption,
        pickupDate: pickupDate ? formatDateForChicago(pickupDate) : null,
        notes: notes.trim() || null,
        deliveryAddressId: deliveryOption === 'delivery' ? selectedAddressId : null
      };

      console.log('📤 MOBILE: Sending order request...', {
        itemCount: orderData.items.length,
        total: orderData.total,
        delivery: orderData.orderType
      });

      // Use apiRequest for proper authentication handling
      const newOrder = await apiRequest('POST', '/api/orders', orderData);
      console.log('✅ MOBILE: Order created:', newOrder.id);

      // Clear cart - simple approach
      try {
        if (isSamsung) {
          // Use XMLHttpRequest for cart clearing on Samsung too
          await new Promise((resolve) => {
            const xhr = new XMLHttpRequest();
            xhr.open('DELETE', '/api/cart', true);
            xhr.onload = () => resolve(true);
            xhr.onerror = () => resolve(true); // Don't fail on cart clear error
            xhr.send();
          });
        } else {
          await fetch('/api/cart', { method: 'DELETE' });
        }
        console.log('🗑️ MOBILE: Cart cleared');
      } catch (clearError) {
        console.log('⚠️ MOBILE: Cart clear failed (non-critical)');
      }

      // Success
      alert(`Order #${newOrder.id} submitted successfully! We'll contact you soon.`);
      navigate('/products');

    } catch (error) {
      console.error('💥 MOBILE: Order submission error:', error);
      alert('Failed to submit order. Please try again.');
      setIsPlacingOrder(false);
    }
  };

  // Render based on step
  return (
    <div className="pb-20 bg-gradient-to-br from-slate-50 to-blue-50 min-h-screen">
      {/* Enhanced Fixed Header */}
      <div className="fixed top-0 left-0 right-0 bg-white/95 backdrop-blur-md z-10 shadow-lg border-b border-slate-200">
        <div className="p-4 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={step === 'cart' ? navigateToProducts : prevStep}
            className="rounded-full w-10 h-10 p-0 hover:bg-slate-100 transition-colors duration-200"
          >
            <ChevronLeft className="h-5 w-5 text-slate-600" />
          </Button>

          <div className="text-center flex-1">
            <div className="flex items-center justify-center mb-2">
              {step === 'cart' && <ShoppingBag className="h-5 w-5 text-blue-600 mr-2" />}
              {step === 'delivery' && <Truck className="h-5 w-5 text-green-600 mr-2" />}
              {step === 'confirm' && <CheckCircle className="h-5 w-5 text-purple-600 mr-2" />}
              <h1 className="text-lg font-bold text-slate-800">
                {step === 'cart' && 'Shopping Cart'}
                {step === 'delivery' && 'Delivery Options'}
                {step === 'confirm' && 'Confirm Order'}
              </h1>
            </div>
            
            {/* Enhanced Progress Indicator */}
            <div className="flex justify-center items-center space-x-2">
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                  step === 'cart' 
                    ? 'bg-blue-600 text-white shadow-lg' 
                    : 'bg-blue-100 text-blue-600'
                }`}>
                  1
                </div>
                <div className={`w-8 h-1 mx-1 rounded-full transition-all duration-300 ${
                  step === 'delivery' || step === 'confirm' ? 'bg-blue-600' : 'bg-slate-200'
                }`} />
              </div>
              
              <div className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                  step === 'delivery' 
                    ? 'bg-green-600 text-white shadow-lg' 
                    : step === 'confirm' 
                    ? 'bg-green-100 text-green-600'
                    : 'bg-slate-200 text-slate-400'
                }`}>
                  2
                </div>
                <div className={`w-8 h-1 mx-1 rounded-full transition-all duration-300 ${
                  step === 'confirm' ? 'bg-green-600' : 'bg-slate-200'
                }`} />
              </div>
              
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all duration-300 ${
                step === 'confirm' 
                  ? 'bg-purple-600 text-white shadow-lg' 
                  : 'bg-slate-200 text-slate-400'
              }`}>
                3
              </div>
            </div>
          </div>

          <div className="w-10">
            {step !== 'confirm' && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={nextStep}
                className="rounded-full w-10 h-10 p-0 hover:bg-slate-100 transition-colors duration-200"
                disabled={Array.isArray(cartItems) && cartItems.length === 0}
              >
                <ChevronRight className="h-5 w-5 text-slate-600" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Scrollable content with padding to avoid header and footer */}
      <div className="pt-24 pb-20 px-4">
        {step === 'cart' && (
          <>
            {clearSuccess ? (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 shadow-lg mb-6">
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-600 mb-3" />
                  <h2 className="text-xl font-bold text-green-800 mb-2">Cart Cleared Successfully</h2>
                  <p className="text-green-600 mb-4">Your cart has been emptied and is ready for new items</p>
                  <Button 
                    variant="default" 
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg" 
                    onClick={navigateToProducts}
                  >
                    <Package className="mr-2 h-4 w-4" />
                    Browse Products
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 mb-6 overflow-hidden">
                {/* Cart items display */}
                {isLoading ? (
                  <div className="p-8 text-center">
                    <div className="relative">
                      <div className="animate-spin h-12 w-12 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto"></div>
                      <ShoppingBag className="h-6 w-6 absolute top-3 left-1/2 transform -translate-x-1/2 text-blue-600" />
                    </div>
                    <p className="mt-4 text-slate-600 font-medium">Loading your cart...</p>
                    <p className="text-sm text-slate-400">Please wait while we fetch your items</p>
                  </div>
                ) : Array.isArray(cartItems) && cartItems.length > 0 ? (
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-slate-800 flex items-center">
                        <Package className="h-5 w-5 mr-2 text-blue-600" />
                        Cart Items
                      </h3>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                        {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
                      </Badge>
                    </div>
                    
                    <div className="space-y-3">
                      {cartItems.map((item: any) => (
                        <div key={item.id} className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                          <CartItemSimple item={item} />
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex justify-between items-center py-6 mt-6 border-t-2 border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50 rounded-lg px-4">
                      <span className="text-xl font-bold text-slate-800">Subtotal</span>
                      <span className="text-2xl font-bold text-blue-600">${total.toFixed(2)}</span>
                    </div>
                  </div>
                ) : (
                  <div className="p-8 text-center">
                    <div className="bg-slate-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                      <ShoppingBag className="h-10 w-10 text-slate-400" />
                    </div>
                    <h3 className="text-xl font-bold text-slate-800 mb-2">Your cart is empty</h3>
                    <p className="text-slate-500 mb-6">Start adding products to see them here</p>
                    <Button 
                      variant="default"
                      className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg px-6 py-3"
                      onClick={navigateToProducts}
                    >
                      <Package className="mr-2 h-4 w-4" />
                      Browse Products
                    </Button>
                  </div>
                )}

                {Array.isArray(cartItems) && cartItems.length > 0 && (
                  <div className="p-6 pt-0 border-t bg-slate-50">
                    <Button 
                      variant="outline"
                      className="w-full bg-gradient-to-r from-red-50 to-pink-50 text-red-600 hover:from-red-100 hover:to-pink-100 border-red-200 hover:border-red-300 flex items-center justify-center py-3 font-medium transition-all duration-200"
                      onClick={handleClearCart}
                      disabled={isClearing}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {isClearing ? 'Clearing...' : 'Clear Cart'}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {step === 'delivery' && (
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200 mb-6 overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center">
                <Truck className="h-5 w-5 mr-2 text-green-600" />
                Delivery Options
              </h3>
              
              <div className="space-y-4">
                <div className={`border-2 rounded-xl p-4 transition-all duration-200 ${
                  deliveryOption === 'pickup' 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}>
                  <div className="flex items-center">
                    <input 
                      type="radio" 
                      id="pickup" 
                      name="delivery" 
                      className="mr-3 w-4 h-4 text-blue-600"
                      checked={deliveryOption === 'pickup'}
                      onChange={() => handleDeliveryOptionChange('pickup')}
                    />
                    <label htmlFor="pickup" className="font-semibold text-slate-800 flex items-center">
                      <Store className="h-4 w-4 mr-2 text-blue-600" />
                      Store Pickup
                    </label>
                  </div>

                  {deliveryOption === 'pickup' && (
                    <div className="mt-4 ml-7 animate-in slide-in-from-top-2 duration-300">
                      <p className="text-sm text-slate-600 mb-3 font-medium">Choose your pickup date:</p>
                      <select 
                        className="w-full p-3 border-2 border-slate-200 rounded-lg bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-colors"
                        onChange={(e) => {
                          if (e.target.value) {
                            setPickupDate(new Date(e.target.value));
                          } else {
                            setPickupDate(new Date());
                          }
                        }}
                        value={pickupDate ? formatDateForChicago(pickupDate) : formatDateForChicago(new Date())}
                      >
                        <option value="">Select a date</option>
                        {Array.from({ length: 14 }, (_, i) => {
                          const date = new Date();
                          date.setDate(date.getDate() + i);
                          const dateStr = formatDateForChicago(date);
                          const displayDate = new Intl.DateTimeFormat('en-US', { 
                            timeZone: 'America/Chicago',
                            weekday: 'short', 
                            month: 'short', 
                            day: 'numeric' 
                          }).format(date);
                          return (
                            <option key={i} value={dateStr}>
                              {i === 0 ? 'Today' : displayDate}
                            </option>
                          );
                        })}
                      </select>
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-xs text-blue-700 font-medium">
                          📍 Business Hours: 9:00 AM - 5:00 PM
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          Please arrive during business hours for pickup
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                <div className={`border-2 rounded-xl p-4 transition-all duration-200 ${
                  deliveryOption === 'delivery' 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}>
                  <div className="flex items-center">
                    <input 
                      type="radio" 
                      id="delivery" 
                      name="delivery" 
                      className="mr-3 w-4 h-4 text-green-600"
                      checked={deliveryOption === 'delivery'}
                      onChange={() => handleDeliveryOptionChange('delivery')}
                    />
                    <label htmlFor="delivery" className="font-semibold text-slate-800 flex items-center">
                      <Truck className="h-4 w-4 mr-2 text-green-600" />
                      Delivery (7 day window)
                    </label>
                  </div>

                  {deliveryOption === 'delivery' && (
                    <div className="mt-4 ml-7 animate-in slide-in-from-top-2 duration-300">
                      <div className="p-3 bg-green-50 rounded-lg border border-green-200 mb-4">
                        <p className="text-sm text-green-700 font-medium">
                          📞 Our staff will contact you to arrange delivery within 7 business days
                        </p>
                      </div>

                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center">
                          <MapPin className="h-4 w-4 mr-2 text-green-600" />
                          Select Delivery Address
                        </h3>
                        <DeliveryAddressSelector 
                          selectedAddressId={selectedAddressId}
                          onSelectAddress={setSelectedAddressId}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-2 border-slate-200 rounded-xl p-4 bg-white">
                  <label htmlFor="notes" className="block text-sm font-semibold text-slate-800 mb-3 flex items-center">
                    <Package className="h-4 w-4 mr-2 text-purple-600" />
                    Additional Notes (Optional)
                  </label>
                  <textarea
                    id="notes"
                    className="w-full p-3 border-2 border-slate-200 rounded-lg bg-white focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-colors resize-none"
                    placeholder="Any special instructions for your order..."
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'confirm' && (
          <>
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <h2 className="font-medium mb-3">Order Summary</h2>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Items:</span>
                  <span>{Array.isArray(cartItems) ? cartItems.length : 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Delivery Method:</span>
                  <span className="capitalize">{deliveryOption}</span>
                </div>
                {deliveryOption === 'pickup' && pickupDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Pickup Date:</span>
                    <span>
                      {pickupDate.toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </span>
                  </div>
                )}

                {deliveryOption === 'delivery' && selectedAddressId && (
                  <div className="flex flex-col text-sm border-t border-gray-100 pt-2 mt-2">
                    <span className="text-gray-600 font-medium">Delivery Address:</span>
                    <SelectedDeliveryAddress addressId={selectedAddressId} />
                  </div>
                )}
                
                <div className="border-t border-gray-100 pt-2 mt-2 space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span>${subtotal.toFixed(2)}</span>
                  </div>
                  {deliveryOption === 'delivery' && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">
                          Delivery Fee
                          {deliveryFee === 0 && (
                            <span className="text-green-600 ml-1">
                              (Free over ${freeDeliveryThreshold.toFixed(2)})
                            </span>
                          )}
                        </span>
                        <span className={deliveryFee === 0 ? "text-green-600" : ""}>
                          {deliveryFee === 0 ? "FREE" : `$${deliveryFee.toFixed(2)}`}
                        </span>
                      </div>
                      {deliveryFee > 0 && (
                        <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded border border-blue-200 mt-1">
                          💡 Add ${(freeDeliveryThreshold - subtotal).toFixed(2)} more to your cart to qualify for free delivery!
                        </div>
                      )}
                    </>
                  )}
                  <div className="flex justify-between text-sm font-bold pt-1 border-t">
                    <span>Total:</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <Alert className="mb-4">
              <AlertTitle className="text-amber-600 text-base">Payment Information</AlertTitle>
              <AlertDescription className="text-amber-700">
                This is only an order estimation. No payment will be taken through this app.
                All payments will be made in person at pickup or upon delivery.
              </AlertDescription>
            </Alert>


          </>
        )}
      </div>

      {/* Fixed footer */}
      <div className="fixed bottom-0 left-0 right-0 bg-white z-10 p-4 border-t">
        {step === 'cart' && Array.isArray(cartItems) && cartItems.length > 0 && (
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="font-bold">${total.toFixed(2)}</div>
              <div className="text-xs text-gray-500">
                {cartItems.reduce((sum, item) => sum + item.quantity, 0)} item(s)
              </div>
            </div>
            <Button onClick={nextStep} className="px-6">
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 'delivery' && (
          <div className="flex justify-end">
            <Button onClick={nextStep} className="px-6">
              Review Order <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 'confirm' && (
          <Button
            variant="default"
            size="lg"
            disabled={isPlacingOrder}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!isPlacingOrder) {
                setIsPlacingOrder(true);
                submitOrderAsync().catch((error) => {
                  console.error("Order submission failed:", error);
                  alert("Order submission failed. Please try again.");
                  setIsPlacingOrder(false);
                });
              }
            }}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg py-4 text-lg font-semibold"
          >
            <CheckCircle className="mr-2 h-5 w-5" />
            {isPlacingOrder ? "Processing Order..." : "Place Order"}
          </Button>
        )}
      </div>
    </div>
  );
}

export default ScrollableMobileCartPage;