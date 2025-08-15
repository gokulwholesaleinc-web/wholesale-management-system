import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AppLayout } from '@/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Settings, Truck, DollarSign, ShoppingCart, Save, RefreshCw } from 'lucide-react';
import { BreadcrumbNavigation } from '@/components/navigation/BreadcrumbNavigation';

interface OrderSettings {
  id: number;
  minimumOrderAmount: number;
  deliveryFee: number;
  freeDeliveryThreshold: number;
  loyaltyPointsRate: number;
  updatedAt: string;
  updatedBy: string;
}

export default function AdminOrderSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);

  // Fetch current settings
  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['/api/admin/order-settings'],
    retry: 3,
  });

  // Form state
  const [formData, setFormData] = useState<Partial<OrderSettings>>({});

  // Initialize form when settings load
  React.useEffect(() => {
    if (settings && !isEditing) {
      setFormData({
        minimumOrderAmount: settings.minimumOrderAmount,
        deliveryFee: settings.deliveryFee,
        freeDeliveryThreshold: settings.freeDeliveryThreshold,
        loyaltyPointsRate: settings.loyaltyPointsRate,
      });
    }
  }, [settings, isEditing]);

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<OrderSettings>) => {
      return apiRequest('/api/admin/order-settings', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: 'Settings Updated',
        description: 'Order and delivery settings have been updated successfully.',
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/order-settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/order-settings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/order-settings/minimum'] });
    },
    onError: (error) => {
      toast({
        title: 'Update Failed',
        description: `Failed to update settings: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure all numeric values are properly converted
    const cleanData = {
      minimumOrderAmount: formData.minimumOrderAmount ? Number(formData.minimumOrderAmount) : undefined,
      deliveryFee: formData.deliveryFee ? Number(formData.deliveryFee) : undefined,
      freeDeliveryThreshold: formData.freeDeliveryThreshold ? Number(formData.freeDeliveryThreshold) : undefined,
      loyaltyPointsRate: formData.loyaltyPointsRate ? Number(formData.loyaltyPointsRate) : undefined,
    };
    
    console.log('🏪 [Frontend] Sending order settings data:', cleanData);
    updateMutation.mutate(cleanData);
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (settings) {
      setFormData({
        minimumOrderAmount: settings.minimumOrderAmount,
        deliveryFee: settings.deliveryFee,
        freeDeliveryThreshold: settings.freeDeliveryThreshold,
        loyaltyPointsRate: settings.loyaltyPointsRate,
      });
    }
  };

  if (isLoading) {
    return (
      <AppLayout title="Order & Delivery Settings">
        <div className="container mx-auto py-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout title="Order & Delivery Settings">
        <div className="container mx-auto py-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center text-red-600">
                Failed to load settings: {error.message}
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Order & Delivery Settings">
      <div className="container mx-auto py-6 space-y-6">
        <BreadcrumbNavigation
          items={[
            { label: 'Admin', href: '/admin' },
            { label: 'Order & Delivery Settings', href: '/admin/order-settings' }
          ]}
        />

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Settings className="h-8 w-8" />
              Order & Delivery Settings
            </h1>
            <p className="text-gray-600 mt-2">
              Configure minimum orders, delivery fees, and customer loyalty settings
            </p>
          </div>
          
          {!isEditing && (
            <Button onClick={() => setIsEditing(true)} className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Edit Settings
            </Button>
          )}
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Order Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Order Settings
              </CardTitle>
              <CardDescription>
                Configure minimum order requirements and customer behavior
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="minimumOrderAmount">Minimum Order Amount ($)</Label>
                  <Input
                    id="minimumOrderAmount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.minimumOrderAmount || ''}
                    onChange={(e) => setFormData({ ...formData, minimumOrderAmount: parseFloat(e.target.value) })}
                    disabled={!isEditing}
                    className={isEditing ? '' : 'bg-gray-50'}
                  />
                  <p className="text-sm text-gray-500">
                    Customers must reach this amount to place an order
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="loyaltyPointsRate">Loyalty Points Rate (%)</Label>
                  <Input
                    id="loyaltyPointsRate"
                    type="number"
                    min="0"
                    max="1"
                    step="0.001"
                    value={formData.loyaltyPointsRate || ''}
                    onChange={(e) => setFormData({ ...formData, loyaltyPointsRate: parseFloat(e.target.value) })}
                    disabled={!isEditing}
                    className={isEditing ? '' : 'bg-gray-50'}
                  />
                  <p className="text-sm text-gray-500">
                    Points earned per dollar spent (e.g., 0.02 = 2%)
                  </p>
                </div>

                {isEditing && (
                  <div className="flex gap-2 pt-4">
                    <Button 
                      type="submit" 
                      disabled={updateMutation.isPending}
                      className="flex items-center gap-2"
                    >
                      {updateMutation.isPending ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save Changes
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={handleCancel}
                      disabled={updateMutation.isPending}
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>

          {/* Delivery Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Delivery Settings
              </CardTitle>
              <CardDescription>
                Configure delivery fees and free shipping thresholds
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="deliveryFee">Standard Delivery Fee ($)</Label>
                  <Input
                    id="deliveryFee"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.deliveryFee || ''}
                    onChange={(e) => setFormData({ ...formData, deliveryFee: parseFloat(e.target.value) })}
                    disabled={!isEditing}
                    className={isEditing ? '' : 'bg-gray-50'}
                  />
                  <p className="text-sm text-gray-500">
                    Base delivery fee for orders below free threshold
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="freeDeliveryThreshold">Free Delivery Threshold ($)</Label>
                  <Input
                    id="freeDeliveryThreshold"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.freeDeliveryThreshold || ''}
                    onChange={(e) => setFormData({ ...formData, freeDeliveryThreshold: parseFloat(e.target.value) })}
                    disabled={!isEditing}
                    className={isEditing ? '' : 'bg-gray-50'}
                  />
                  <p className="text-sm text-gray-500">
                    Order amount required for free delivery
                  </p>
                </div>

                {/* Preview section */}
                {formData.deliveryFee !== undefined && formData.freeDeliveryThreshold !== undefined && (
                  <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Delivery Preview:</h4>
                    <div className="text-sm text-blue-800 space-y-1">
                      <div>Orders under ${formData.freeDeliveryThreshold}: ${formData.deliveryFee} delivery fee</div>
                      <div>Orders ${formData.freeDeliveryThreshold}+: FREE delivery</div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Status Card */}
        {settings && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Current Status
              </CardTitle>
              <CardDescription>
                Current active settings and last update information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">
                    ${settings.minimumOrderAmount}
                  </div>
                  <div className="text-sm text-green-600">Min Order</div>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">
                    ${settings.deliveryFee}
                  </div>
                  <div className="text-sm text-blue-600">Delivery Fee</div>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">
                    ${settings.freeDeliveryThreshold}
                  </div>
                  <div className="text-sm text-purple-600">Free Delivery</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <div className="text-2xl font-bold text-orange-600">
                    {(settings.loyaltyPointsRate * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-orange-600">Loyalty Rate</div>
                </div>
              </div>
              
              <div className="mt-4 pt-4 border-t text-sm text-gray-500">
                Last updated: {new Date(settings.updatedAt).toLocaleDateString()} at {new Date(settings.updatedAt).toLocaleTimeString()}
                {settings.updatedBy && ` by ${settings.updatedBy}`}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}