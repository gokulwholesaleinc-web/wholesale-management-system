import React, { useState } from 'react';
import { useTitle } from 'react-use';
import { DeliveryAddressList } from '@/components/address/DeliveryAddressList';
import { DeliveryAddressForm } from '@/components/address/DeliveryAddressForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Plus } from 'lucide-react';
import { useLocation } from 'wouter';
import ProtectedRoute from '@/components/ProtectedRoute';

interface DeliveryAddress {
  id: number;
  name: string;
  businessName?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  isDefault: boolean;
  notes?: string;
}

enum PageView {
  LIST,
  ADD,
  EDIT
}

export default function DeliveryAddressesPage() {
  useTitle('Delivery Addresses - Gokul Wholesale');
  const [, navigate] = useLocation();
  const [pageView, setPageView] = useState<PageView>(PageView.LIST);
  const [selectedAddress, setSelectedAddress] = useState<DeliveryAddress | undefined>(undefined);
  
  const handleAddAddress = () => {
    setPageView(PageView.ADD);
  };
  
  const handleEditAddress = (address: DeliveryAddress) => {
    setSelectedAddress(address);
    setPageView(PageView.EDIT);
  };
  
  const handleSuccess = () => {
    setPageView(PageView.LIST);
    setSelectedAddress(undefined);
  };
  
  const handleCancel = () => {
    setPageView(PageView.LIST);
    setSelectedAddress(undefined);
  };
  
  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-6 max-w-3xl">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            className="mr-2 p-2" 
            onClick={() => navigate('/account')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Delivery Addresses</h1>
        </div>
        
        <Card>
          <CardContent className="p-5">
            {pageView === PageView.LIST && (
              <DeliveryAddressList
                onAddAddress={handleAddAddress}
                onEditAddress={handleEditAddress}
              />
            )}
            
            {pageView === PageView.ADD && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Add New Address</h2>
                <DeliveryAddressForm
                  onSuccess={handleSuccess}
                  onCancel={handleCancel}
                />
              </div>
            )}
            
            {pageView === PageView.EDIT && selectedAddress && (
              <div>
                <h2 className="text-xl font-semibold mb-4">Edit Address</h2>
                <DeliveryAddressForm
                  initialData={selectedAddress}
                  onSuccess={handleSuccess}
                  onCancel={handleCancel}
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}