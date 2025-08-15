import { useMutation, useQueryClient } from '@tanstack/react-query';
import { offlineManager } from '@/lib/offlineManager';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

export function useOfflineCreateOrder() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (orderData: any) => {
      const authToken = 
        sessionStorage.getItem('authToken') || 
        sessionStorage.getItem('gokul_auth_token') ||
        JSON.parse(sessionStorage.getItem('gokul_auth_data') || '{}')?.token;

      if (!navigator.onLine) {
        // Save order offline
        const offlineOrderId = await offlineManager.saveOrderOffline(orderData, authToken);
        
        toast({
          title: "Order Saved Offline",
          description: "Your order will be submitted when connection is restored",
          variant: "default",
        });
        
        return { 
          id: offlineOrderId, 
          offline: true, 
          status: 'pending_sync',
          ...orderData 
        };
      }

      // Online order creation
      return await apiRequest('POST', '/api/orders', orderData);
    },
    onSuccess: (data) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      
      if (!data.offline) {
        toast({
          title: "Order Created",
          description: "Your order has been successfully submitted",
          variant: "default",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Order Failed",
        description: error.message || "Failed to create order",
        variant: "destructive",
      });
    }
  });
}

export function useOfflineInventoryUpdate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ productId, changes }: { productId: string; changes: any }) => {
      const authToken = 
        sessionStorage.getItem('authToken') || 
        sessionStorage.getItem('gokul_auth_token') ||
        JSON.parse(sessionStorage.getItem('gokul_auth_data') || '{}')?.token;

      if (!navigator.onLine) {
        // Save inventory change offline
        await offlineManager.saveInventoryChangeOffline(productId, changes, authToken);
        
        toast({
          title: "Changes Saved Offline",
          description: "Inventory updates will sync when connection is restored",
          variant: "default",
        });
        
        return { offline: true, productId, changes };
      }

      // Online inventory update
      return await apiRequest('PUT', `/api/products/${productId}`, changes);
    },
    onSuccess: (data, variables) => {
      // Invalidate product queries
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: [`/api/products/${variables.productId}`] });
      
      if (!data.offline) {
        toast({
          title: "Inventory Updated",
          description: "Product information has been successfully updated",
          variant: "default",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update inventory",
        variant: "destructive",
      });
    }
  });
}

export function useOfflineCartUpdate() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (cartData: any) => {
      const authToken = 
        sessionStorage.getItem('authToken') || 
        sessionStorage.getItem('gokul_auth_token') ||
        JSON.parse(sessionStorage.getItem('gokul_auth_data') || '{}')?.token;

      if (!navigator.onLine) {
        // Save cart change offline
        await offlineManager.saveCartChangeOffline(cartData, authToken);
        
        // Update local cart state optimistically
        queryClient.setQueryData(['/api/cart'], (oldData: any) => {
          if (!oldData) return cartData;
          return { ...oldData, ...cartData };
        });
        
        toast({
          title: "Cart Updated Offline",
          description: "Changes will sync when connection is restored",
          variant: "default",
        });
        
        return { offline: true, ...cartData };
      }

      // Online cart update
      return await apiRequest('POST', '/api/cart', cartData);
    },
    onSuccess: (data) => {
      // Invalidate cart queries
      queryClient.invalidateQueries({ queryKey: ['/api/cart'] });
      
      if (!data.offline) {
        toast({
          title: "Cart Updated",
          description: "Your cart has been updated",
          variant: "default",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Cart Update Failed",
        description: error.message || "Failed to update cart",
        variant: "destructive",
      });
    }
  });
}