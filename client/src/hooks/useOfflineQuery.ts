import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { offlineManager } from '@/lib/offlineManager';
import { useToast } from '@/hooks/use-toast';

// Enhanced query hook that works offline
export function useOfflineQuery(options: any) {
  const { toast } = useToast();
  
  return useQuery({
    ...options,
    queryFn: async (...args) => {
      try {
        // Try online fetch first
        const result = await options.queryFn(...args);
        
        // Cache successful results
        if (result && options.queryKey) {
          await offlineManager.cacheData(JSON.stringify(options.queryKey), result);
        }
        
        return result;
      } catch (error) {
        // If offline, try to get cached data
        if (!navigator.onLine && options.queryKey) {
          const cachedData = await offlineManager.getCachedData(JSON.stringify(options.queryKey));
          if (cachedData) {
            return cachedData;
          }
        }
        throw error;
      }
    }
  });
}

// Enhanced mutation hook that works offline
export function useOfflineMutation(options: any) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    ...options,
    mutationFn: async (variables) => {
      const authToken = 
        sessionStorage.getItem('authToken') || 
        sessionStorage.getItem('gokul_auth_token') ||
        JSON.parse(sessionStorage.getItem('gokul_auth_data') || '{}')?.token;

      if (!navigator.onLine) {
        // Handle offline operations
        if (options.offlineHandler) {
          await options.offlineHandler(variables, authToken);
          
          toast({
            title: "Saved Offline",
            description: "Changes will sync when connection is restored",
            variant: "default",
          });
          
          return { offline: true, data: variables };
        } else {
          throw new Error('No offline handler available for this operation');
        }
      }

      // Online operation
      return await options.mutationFn(variables);
    },
    onSuccess: (data, variables, context) => {
      // Call original onSuccess if provided
      if (options.onSuccess) {
        options.onSuccess(data, variables, context);
      }

      // Invalidate relevant queries
      if (options.invalidateQueries) {
        options.invalidateQueries.forEach((queryKey: any) => {
          queryClient.invalidateQueries({ queryKey });
        });
      }
    },
    onError: (error, variables, context) => {
      if (options.onError) {
        options.onError(error, variables, context);
      }
    }
  });
}