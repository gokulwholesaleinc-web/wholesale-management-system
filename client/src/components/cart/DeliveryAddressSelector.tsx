import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Home, Plus, PlusCircle, Loader2 } from 'lucide-react';
import { DeliveryAddressList } from '@/components/address/DeliveryAddressList';
import { DeliveryAddressForm } from '@/components/address/DeliveryAddressForm';
import { DeliveryAddressFormValues } from '@/components/address/DeliveryAddressForm';

interface DeliveryAddressSelectorProps {
  selectedAddressId: number | null;
  onSelectAddress: (addressId: number) => void;
}

type Address = {
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
};

enum ViewMode {
  List,
  AddNew,
  Edit
}

export function DeliveryAddressSelector({ selectedAddressId, onSelectAddress }: DeliveryAddressSelectorProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(ViewMode.List);
  const [addressToEdit, setAddressToEdit] = useState<Address | null>(null);
  
  // Fetch addresses from API
  const { data: addresses = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/delivery-addresses'],
  });
  
  const handleSelectAddress = (address: Address) => {
    onSelectAddress(address.id);
  };
  
  const handleAddNewClick = () => {
    setViewMode(ViewMode.AddNew);
  };
  
  const handleEditAddress = (address: Address) => {
    setAddressToEdit(address);
    setViewMode(ViewMode.Edit);
  };
  
  const handleFormSuccess = () => {
    refetch();
    setViewMode(ViewMode.List);
    setAddressToEdit(null);
  };
  
  const handleFormCancel = () => {
    setViewMode(ViewMode.List);
    setAddressToEdit(null);
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (viewMode === ViewMode.AddNew) {
    return (
      <div>
        <div className="mb-4 flex items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(ViewMode.List)}
            className="mr-2"
          >
            Back to addresses
          </Button>
          <h3 className="text-lg font-medium">Add New Delivery Address</h3>
        </div>
        
        <DeliveryAddressForm
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </div>
    );
  }
  
  if (viewMode === ViewMode.Edit && addressToEdit) {
    return (
      <div>
        <div className="mb-4 flex items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode(ViewMode.List)}
            className="mr-2"
          >
            Back to addresses
          </Button>
          <h3 className="text-lg font-medium">Edit Delivery Address</h3>
        </div>
        
        <DeliveryAddressForm
          initialData={addressToEdit}
          onSuccess={handleFormSuccess}
          onCancel={handleFormCancel}
        />
      </div>
    );
  }
  
  if (addresses.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">You don't have any saved delivery addresses yet.</p>
        <Button onClick={handleAddNewClick}>
          <Plus className="h-4 w-4 mr-2" />
          Add Address
        </Button>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium">Select Delivery Address</h3>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleAddNewClick}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New Address
        </Button>
      </div>
      
      <RadioGroup 
        value={selectedAddressId?.toString() || ''}
        onValueChange={(value) => onSelectAddress(parseInt(value))}
        className="space-y-3"
      >
        {addresses.map((address: Address) => (
          <Card key={address.id} className={`border-2 ${selectedAddressId === address.id ? 'border-primary' : ''} p-4 cursor-pointer`}>
            <div className="flex gap-3">
              <RadioGroupItem value={address.id.toString()} id={`address-${address.id}`} />
              <div className="flex-1">
                <div className="flex justify-between">
                  <Label 
                    htmlFor={`address-${address.id}`} 
                    className="font-medium cursor-pointer"
                  >
                    {address.businessName && (
                      <>
                        {address.businessName} <br />
                      </>
                    )}
                    {address.name}
                    {address.isDefault && (
                      <span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                        Default
                      </span>
                    )}
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.preventDefault();
                      handleEditAddress(address);
                    }}
                  >
                    Edit
                  </Button>
                </div>
                
                <div className="text-sm text-muted-foreground mt-1 space-y-1">
                  <p>{address.addressLine1}</p>
                  {address.addressLine2 && <p>{address.addressLine2}</p>}
                  <p>{address.city}, {address.state} {address.postalCode}</p>
                  {address.phone && <p>Phone: {address.phone}</p>}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </RadioGroup>
    </div>
  );
}