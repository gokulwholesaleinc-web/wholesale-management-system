import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Home, 
  Plus, 
  Edit, 
  Trash, 
  Star, 
  StarIcon, 
  Loader2,
  Check
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

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

interface DeliveryAddressListProps {
  onAddAddress: () => void;
  onEditAddress: (address: DeliveryAddress) => void;
  selectable?: boolean;
  onSelectAddress?: (address: DeliveryAddress) => void;
  selectedAddressId?: number;
}

export function DeliveryAddressList({
  onAddAddress,
  onEditAddress,
  selectable = false,
  onSelectAddress,
  selectedAddressId
}: DeliveryAddressListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch addresses
  const { 
    data: addresses = [], 
    isLoading,
    isError,
  } = useQuery({
    queryKey: ['/api/delivery-addresses'],
  });

  // Delete address mutation
  const deleteMutation = useMutation({
    mutationFn: async (addressId: number) => {
      return await apiRequest('DELETE', `/api/delivery-addresses/${addressId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/delivery-addresses'] });
      toast({
        title: 'Address deleted',
        description: 'Delivery address has been removed',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete address',
        description: error.message || 'An error occurred while deleting the address',
        variant: 'destructive',
      });
    }
  });

  // Set default address mutation
  const setDefaultMutation = useMutation({
    mutationFn: async (addressId: number) => {
      return await apiRequest('POST', `/api/delivery-addresses/${addressId}/set-default`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/delivery-addresses'] });
      toast({
        title: 'Default address updated',
        description: 'Your default delivery address has been updated',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update default address',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    }
  });

  const handleDelete = (addressId: number) => {
    if (confirm('Are you sure you want to delete this address?')) {
      deleteMutation.mutate(addressId);
    }
  };

  const handleSetDefault = (addressId: number) => {
    setDefaultMutation.mutate(addressId);
  };

  const handleSelect = (address: DeliveryAddress) => {
    if (selectable && onSelectAddress) {
      onSelectAddress(address);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 text-center">
        <p className="text-red-500">Failed to load addresses. Please try again.</p>
      </div>
    );
  }

  if (addresses.length === 0) {
    return (
      <div className="py-6 text-center">
        <p className="text-muted-foreground mb-4">You don't have any saved delivery addresses yet.</p>
        <Button onClick={onAddAddress}>
          <Plus className="h-4 w-4 mr-2" />
          Add Address
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Your Delivery Addresses</h3>
        <Button size="sm" onClick={onAddAddress}>
          <Plus className="h-4 w-4 mr-2" />
          Add New
        </Button>
      </div>

      <div className="grid gap-4 grid-cols-1">
        {addresses.map((address: DeliveryAddress) => (
          <Card 
            key={address.id}
            className={cn(
              "border overflow-hidden transition-all", 
              selectable && "cursor-pointer hover:border-primary",
              selectable && selectedAddressId === address.id && "border-primary ring-1 ring-primary"
            )}
            onClick={() => selectable && handleSelect(address)}
          >
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <h4 className="font-medium mr-2">{address.name}</h4>
                    {address.isDefault && (
                      <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                        Default
                      </span>
                    )}
                    {selectable && selectedAddressId === address.id && (
                      <span className="ml-2 bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full flex items-center">
                        <Check className="h-3 w-3 mr-1" />
                        Selected
                      </span>
                    )}
                  </div>

                  {address.businessName && (
                    <p className="text-sm text-muted-foreground mb-1">{address.businessName}</p>
                  )}
                  
                  <p className="text-sm">{address.addressLine1}</p>
                  {address.addressLine2 && <p className="text-sm">{address.addressLine2}</p>}
                  <p className="text-sm">
                    {address.city}, {address.state} {address.postalCode}
                  </p>
                  {address.phone && <p className="text-sm mt-1">Phone: {address.phone}</p>}
                </div>

                <div className="flex items-center mt-3 md:mt-0 space-x-2">
                  {!address.isDefault && (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSetDefault(address.id);
                      }}
                      disabled={setDefaultMutation.isPending}
                    >
                      <Star className="h-4 w-4 mr-1" />
                      Set Default
                    </Button>
                  )}
                  <Button 
                    size="icon" 
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditAddress(address);
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    size="icon" 
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(address.id);
                    }}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}