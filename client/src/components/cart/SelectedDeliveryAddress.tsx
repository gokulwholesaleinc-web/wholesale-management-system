import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

interface SelectedDeliveryAddressProps {
  addressId: number;
}

export function SelectedDeliveryAddress({ addressId }: SelectedDeliveryAddressProps) {
  // Fetch the specific address by ID
  const { data: address, isLoading } = useQuery({
    queryKey: [`/api/delivery-addresses/${addressId}`],
    enabled: !!addressId,
  });
  
  if (isLoading) {
    return (
      <div className="flex items-center text-muted-foreground text-sm mt-1">
        <Loader2 className="h-3 w-3 animate-spin mr-2" />
        Loading address...
      </div>
    );
  }
  
  if (!address) {
    return <span className="text-muted-foreground text-sm mt-1">Address not found</span>;
  }
  
  return (
    <div className="text-sm text-muted-foreground mt-1 space-y-1">
      <p>
        {address.businessName && (
          <>
            {address.businessName} <br />
          </>
        )}
        {address.name}
      </p>
      <p>{address.addressLine1}</p>
      {address.addressLine2 && <p>{address.addressLine2}</p>}
      <p>{address.city}, {address.state} {address.postalCode}</p>
      {address.phone && <p>Phone: {address.phone}</p>}
    </div>
  );
}