import React, { useState, useEffect } from 'react';
import { Truck, Store, Calendar, Clock } from 'lucide-react';
import { format, addDays } from 'date-fns';

interface CheckoutOptionsProps {
  orderType: 'delivery' | 'pickup';
  setOrderType: (type: 'delivery' | 'pickup') => void;
  pickupDate: string | null;
  setPickupDate: (date: string | null) => void;
  pickupTime: string | null;
  setPickupTime: (time: string | null) => void;
  deliveryNote: string;
  setDeliveryNote: (note: string) => void;
}

export function CheckoutOptions({
  orderType,
  setOrderType,
  pickupDate,
  setPickupDate,
  pickupTime,
  setPickupTime,
  deliveryNote,
  setDeliveryNote
}: CheckoutOptionsProps) {
  const [availableDates, setAvailableDates] = useState<Array<{date: Date, formatted: string}>>([]);

  // Set pickup time slots
  const timeSlots = [
    { label: 'Morning (9:00 AM - 12:00 PM)', value: 'morning' },
    { label: 'Afternoon (12:00 PM - 3:00 PM)', value: 'afternoon' },
    { label: 'Evening (3:00 PM - 6:00 PM)', value: 'evening' }
  ];

  // Generate next 14 days as available pickup dates (excluding Sundays)
  useEffect(() => {
    const dates = [];
    const today = new Date();
    
    for (let i = 1; i <= 14; i++) {
      const date = addDays(today, i);
      const day = date.getDay();
      
      // Skip Sundays (day 0)
      if (day !== 0) {
        dates.push({
          date,
          formatted: format(date, 'EEEE, MMMM d, yyyy')
        });
      }
    }
    
    setAvailableDates(dates);
  }, []);

  // Handle order type change
  const handleOrderTypeChange = (type: 'delivery' | 'pickup') => {
    setOrderType(type);
    
    // Reset pickup selections when switching to delivery
    if (type === 'delivery') {
      setPickupDate(null);
      setPickupTime(null);
    }
  };

  // Handle pickup date selection
  const handleDateSelect = (dateStr: string) => {
    setPickupDate(dateStr);
  };

  // Handle pickup time selection
  const handleTimeSelect = (timeValue: string) => {
    setPickupTime(timeValue);
  };

  // Handle delivery note update
  const handleDeliveryNoteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDeliveryNote(e.target.value);
  };

  return (
    <div className="mt-6 space-y-6">
      {/* Important payment notice */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-yellow-800">Payment Information</h3>
            <div className="mt-2 text-yellow-700">
              <p className="text-base mb-3">
                This is only an order estimation. No payment will be taken through this app.
                All payments will be made in person at pickup or upon delivery.
              </p>

            </div>
          </div>
        </div>
      </div>

      <h2 className="text-2xl font-bold">Delivery Options</h2>
      
      {/* Order Type Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => handleOrderTypeChange('delivery')}
          className={`p-6 text-lg rounded-lg flex flex-col items-center justify-center h-36 ${
            orderType === 'delivery' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          <Truck size={48} className="mb-3" />
          <span className="font-semibold">Delivery</span>
          <span className="text-sm mt-1">Within 7 days</span>
        </button>
        
        <button
          onClick={() => handleOrderTypeChange('pickup')}
          className={`p-6 text-lg rounded-lg flex flex-col items-center justify-center h-36 ${
            orderType === 'pickup' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-100 text-gray-800'
          }`}
        >
          <Store size={48} className="mb-3" />
          <span className="font-semibold">Store Pickup</span>
          <span className="text-sm mt-1">Choose date & time</span>
        </button>
      </div>
      
      {/* Delivery Message */}
      {orderType === 'delivery' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-3 flex items-center">
            <Truck className="mr-2" size={24} />
            Delivery Information
          </h3>
          <p className="text-lg mb-4">
            Your order will be delivered within 7 days. Our team will contact you 
            to confirm the exact delivery date and time window.
          </p>
          <div className="mt-4">
            <label className="block text-lg font-medium mb-2">
              Special Delivery Instructions (Optional)
            </label>
            <textarea
              value={deliveryNote}
              onChange={handleDeliveryNoteChange}
              className="w-full p-4 text-lg border border-gray-300 rounded-lg"
              placeholder="E.g., Leave at back door, call before delivery, etc."
              rows={3}
            />
          </div>
        </div>
      )}
      
      {/* Pickup Options */}
      {orderType === 'pickup' && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-xl font-semibold mb-3 flex items-center">
            <Store className="mr-2" size={24} />
            Pickup Details
          </h3>
          
          {/* Date Selection */}
          <div className="mb-6">
            <label className="block text-lg font-medium mb-3 flex items-center">
              <Calendar className="mr-2" size={20} />
              Select Pickup Date
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableDates.map((dateObj, index) => (
                <button
                  key={index}
                  onClick={() => handleDateSelect(format(dateObj.date, 'yyyy-MM-dd'))}
                  className={`p-4 text-left rounded-lg text-lg ${
                    pickupDate === format(dateObj.date, 'yyyy-MM-dd')
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-800'
                  }`}
                >
                  {dateObj.formatted}
                </button>
              ))}
            </div>
          </div>
          
          {/* Time Selection */}
          {pickupDate && (
            <div>
              <label className="block text-lg font-medium mb-3 flex items-center">
                <Clock className="mr-2" size={20} />
                Select Pickup Time
              </label>
              <div className="grid grid-cols-1 gap-3">
                {timeSlots.map((slot, index) => (
                  <button
                    key={index}
                    onClick={() => handleTimeSelect(slot.value)}
                    className={`p-4 text-left rounded-lg text-lg ${
                      pickupTime === slot.value
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-800'
                    }`}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-lg">
            <p>
              Please bring your ID for verification when picking up your order. 
              We'll hold your order for 48 hours from your selected pickup date.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}