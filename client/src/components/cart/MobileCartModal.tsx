import React, { useState } from 'react';
import { X, ShoppingBag, Trash2, ChevronLeft, ChevronRight, CalendarDays, Clock, Truck, Store, ClipboardCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { CartNotice } from './CartNotice';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';

interface MobileCartModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileCartModal({ isOpen, onClose }: MobileCartModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const queryClient = useQueryClient();

  // Add state for multi-page navigation
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [orderType, setOrderType] = useState<'delivery' | 'pickup'>('delivery');
  const [pickupDate, setPickupDate] = useState<string | null>(null);
  const [pickupTime, setPickupTime] = useState<string | null>(null);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showTobaccoNotice, setShowTobaccoNotice] = useState(true);
  const [showPaymentNotice, setShowPaymentNotice] = useState(true);

  // Fetch cart data
  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ['/api/cart'],
    enabled: isOpen, // Only fetch when modal is open
  });

  // Calculate total with additional safety checks
  const total = Array.isArray(cartItems) 
    ? cartItems.reduce((sum: number, item: any) => 
        sum + ((item.product?.price || 0) * (item.quantity || 0)), 0) 
    : 0;

  // Clear cart
  const clearCart = async () => {
    if (!user) return;

    try {
      await apiRequest('DELETE', '/api/cart');

      await queryClient.invalidateQueries({ queryKey: ['/api/cart'] });

      toast({
        title: 'Cart cleared',
        description: 'All items have been removed from your cart',
      });

      // Close the modal after clearing
      onClose();
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to clear cart. Please try again.',
      });
    }
  };

  // Go to checkout
  const goToCheckout = () => {
    onClose();
    navigate('/cart');
  };

  // Handle order placement
  const handlePlaceOrder = async () => {
    // Validate authentication
    if (!user) {
      toast({
        variant: "destructive",
        title: "Authentication required",
        description: "Please log in to place an order"
      });
      return;
    }

    // Validate cart has items
    if (!Array.isArray(cartItems) || cartItems.length === 0) {
      toast({
        variant: "destructive",
        title: "Empty cart",
        description: "Please add items to your cart before placing an order"
      });
      return;
    }

    // Validate pickup date if pickup is selected
    if (orderType === 'pickup' && !pickupDate) {
      toast({
        variant: "destructive",
        title: "Pickup date required",
        description: "Please select a pickup date"
      });
      return;
    }

    setIsPlacingOrder(true);

    try {
      const orderData = {
        userId: user.id,
        orderType,
        items: cartItems,
        status: 'pending',
        total: total,
        pickupDate: pickupDate || undefined,
        pickupTime: pickupTime || undefined,
        deliveryNote: deliveryNote || undefined
      };

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) {
        throw new Error('Failed to place order');
      }

      const newOrder = await response.json();

      // Clear cart after successful order
      await clearCart();

      // Set success message
      toast({
        title: "Order placed successfully",
        description: `Your order #${newOrder.id} has been received. We'll contact you soon.`
      });

      // Close modal and redirect to orders page
      onClose();
      navigate('/orders');
    } catch (error) {
      console.error('Failed to place order:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to place your order. Please try again."
      });
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // Next step function
  const nextStep = () => {
    // Validation for specific steps
    if (currentStep === 2 && orderType === 'pickup' && !pickupDate) {
      toast({
        variant: "destructive",
        title: "Pickup date required",
        description: "Please select a pickup date"
      });
      return;
    }

    setCurrentStep(prev => Math.min(prev + 1, 3));
  };

  // Previous step function
  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  if (!isOpen) return null;

  // Render the appropriate step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 1: // Cart items view
        return (
          <div className="flex-1 overflow-auto bg-gray-50">
            {isLoading ? (
              <div className="p-4 text-center">Loading...</div>
            ) : !Array.isArray(cartItems) || cartItems.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-gray-500">Your cart is empty</p>
              </div>
            ) : (
              <div className="pb-32">
                <div className="bg-white">
                  {cartItems.map((item: any) => (
                    <div key={item.id} className="p-4 border-b">
                      <div className="flex">
                        {/* Product image */}
                        <div className="w-16 h-16 rounded overflow-hidden bg-gray-100 mr-3">
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

                          <div className="flex justify-between items-center mt-2">
                            <div className="text-sm">
                              Qty: {item.quantity} × ${item.product.price.toFixed(2)}
                            </div>
                            <div className="font-medium">${(item.quantity * item.product.price).toFixed(2)}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Notices */}
                <div className="bg-white p-4 mt-2">
                  {showPaymentNotice && (
                    <div className="mb-2">
                      <CartNotice 
                        type="payment" 
                        onClose={() => setShowPaymentNotice(false)} 
                      />
                    </div>
                  )}

                  {showTobaccoNotice && (
                    <div className="mb-2">
                      <CartNotice 
                        type="tobacco" 
                        onClose={() => setShowTobaccoNotice(false)}
                      />
                    </div>
                  )}
                </div>

                {/* Subtotal */}
                <div className="bg-white p-4 mt-2 border-t border-b">
                  <div className="flex justify-between font-medium text-base">
                    <span>Subtotal</span>
                    <span>${total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 2: // Delivery/Pickup options
        return (
          <div className="flex-1 overflow-auto bg-white p-4">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-3">Choose your order type</h3>
                <RadioGroup 
                  value={orderType} 
                  onValueChange={(value) => setOrderType(value as 'delivery' | 'pickup')}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2 border p-3 rounded-md">
                    <RadioGroupItem value="delivery" id="delivery" />
                    <Label htmlFor="delivery" className="flex items-center">
                      <Truck className="mr-2 h-4 w-4" />
                      Delivery (within 7 days)
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2 border p-3 rounded-md">
                    <RadioGroupItem value="pickup" id="pickup" />
                    <Label htmlFor="pickup" className="flex items-center">
                      <Store className="mr-2 h-4 w-4" />
                      Pickup from store
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {orderType === 'pickup' && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="pickupDate" className="flex items-center mb-2">
                      <CalendarDays className="mr-2 h-4 w-4" />
                      Select Pickup Date
                    </Label>
                    <Input 
                      id="pickupDate"
                      type="date"
                      value={pickupDate || ''}
                      onChange={(e) => setPickupDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full"
                    />
                  </div>

                  <div>
                    <Label htmlFor="pickupTime" className="flex items-center mb-2">
                      <Clock className="mr-2 h-4 w-4" />
                      Preferred Pickup Time (Optional)
                    </Label>
                    <Input 
                      id="pickupTime"
                      type="time"
                      value={pickupTime || ''}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>
              )}

              {orderType === 'delivery' && (
                <div>
                  <Label htmlFor="deliveryNote" className="flex items-center mb-2">
                    <ClipboardCheck className="mr-2 h-4 w-4" />
                    Delivery Notes (Optional)
                  </Label>
                  <Textarea
                    id="deliveryNote"
                    placeholder="Add any special delivery instructions here..."
                    value={deliveryNote}
                    onChange={(e) => setDeliveryNote(e.target.value)}
                    className="w-full"
                  />
                </div>
              )}
            </div>
          </div>
        );

      case 3: // Order summary and confirmation
        return (
          <div className="flex-1 overflow-auto bg-white">
            <div className="p-4 border-b">
              <h3 className="text-lg font-semibold">Order Summary</h3>
            </div>

            <div className="p-4 border-b">
              <div className="text-sm space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium">Order Type:</span>
                  <span>{orderType === 'delivery' ? 'Delivery' : 'Pickup'}</span>
                </div>

                {orderType === 'pickup' && pickupDate && (
                  <div className="flex justify-between">
                    <span className="font-medium">Pickup Date:</span>
                    <span>{new Date(pickupDate).toLocaleDateString()}</span>
                  </div>
                )}

                {orderType === 'pickup' && pickupTime && (
                  <div className="flex justify-between">
                    <span className="font-medium">Pickup Time:</span>
                    <span>{pickupTime}</span>
                  </div>
                )}

                {orderType === 'delivery' && deliveryNote && (
                  <div>
                    <span className="font-medium block mb-1">Delivery Notes:</span>
                    <p className="text-gray-600 text-xs">{deliveryNote}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 border-b">
              <h4 className="font-medium mb-2">Items ({cartItems.length})</h4>
              <div className="space-y-2">
                {Array.isArray(cartItems) && cartItems.map((item: any) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.quantity}x {item.product.name}</span>
                    <span>${(item.quantity * item.product.price).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4">
              <div className="flex justify-between font-semibold text-lg">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                No payment will be taken now. Payment will be collected on delivery or pickup.
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Navigation steps display
  const renderStepIndicator = () => (
    <div className="px-4 py-3 bg-gray-50 border-t flex justify-between items-center">
      <div className="flex space-x-2">
        {[1, 2, 3].map((step) => (
          <div 
            key={step}
            className={`h-2 w-8 rounded-full ${
              currentStep === step 
                ? 'bg-blue-600' 
                : currentStep > step 
                  ? 'bg-blue-300' 
                  : 'bg-gray-300'
            }`}
          />
        ))}
      </div>
      <div className="text-sm text-gray-500">
        Step {currentStep} of 3
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex flex-col">
      {/* Header */}
      <div className="bg-white p-4 flex justify-between items-center border-b">
        <div className="flex items-center">
          <ShoppingBag className="h-5 w-5 mr-2" />
          <h2 className="text-lg font-medium">
            {currentStep === 1 && `Your Cart (${Array.isArray(cartItems) ? cartItems.length : 0})`}
            {currentStep === 2 && 'Delivery Options'}
            {currentStep === 3 && 'Confirm Order'}
          </h2>
        </div>
        <button 
          onClick={onClose}
          className="p-1 rounded-full hover:bg-gray-100"
          aria-label="Close"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Step Indicator */}
      {renderStepIndicator()}

      {/* Content */}
      {renderStepContent()}

      {/* Footer */}
      <div className="bg-white p-4 border-t">
        {currentStep === 1 && (
          <>
            <Button 
              className="w-full mb-2"
              onClick={nextStep}
              disabled={!Array.isArray(cartItems) || cartItems.length === 0}
            >
              Continue to Delivery Options
            </Button>

            <Button 
              variant="outline"
              className="w-full flex items-center justify-center text-red-500"
              onClick={clearCart}
              disabled={!Array.isArray(cartItems) || cartItems.length === 0}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Clear Cart
            </Button>
          </>
        )}

        {currentStep === 2 && (
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={prevStep}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <Button onClick={nextStep}>
              Continue
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}

        {currentStep === 3 && (
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={prevStep}>
              <ChevronLeft className="mr-1 h-4 w-4" />
              Back
            </Button>
            <Button 
              onClick={handlePlaceOrder}
              disabled={isPlacingOrder}
            >
              {isPlacingOrder ? "Processing..." : "Place Order"}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default MobileCartModal;