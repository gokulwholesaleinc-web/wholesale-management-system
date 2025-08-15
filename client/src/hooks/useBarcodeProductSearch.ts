import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  barcode?: string;
  category?: string;
  brand?: string;
}

export function useBarcodeProductSearch() {
  const [scannedBarcode, setScannedBarcode] = useState<string | null>(null);
  const { toast } = useToast();

  // Search for product by barcode
  const { data: product, isLoading, error } = useQuery({
    queryKey: ['/api/products/barcode', scannedBarcode],
    queryFn: async () => {
      if (!scannedBarcode) return null;
      
      const authToken = 
        sessionStorage.getItem('authToken') || 
        sessionStorage.getItem('gokul_auth_token') ||
        JSON.parse(sessionStorage.getItem('gokul_auth_data') || '{}')?.token;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      const response = await fetch(`/api/products/barcode/${encodeURIComponent(scannedBarcode)}`, {
        headers
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Product not found');
        }
        throw new Error('Failed to search product');
      }

      return response.json();
    },
    enabled: !!scannedBarcode,
    retry: false
  });

  const searchByBarcode = (barcode: string) => {
    setScannedBarcode(barcode);
    
    toast({
      title: "Barcode Scanned",
      description: `Searching for product with barcode: ${barcode}`,
      variant: "default",
    });
  };

  const clearSearch = () => {
    setScannedBarcode(null);
  };

  const isProductFound = product && !error;
  const isProductNotFound = error?.message === 'Product not found';

  return {
    searchByBarcode,
    clearSearch,
    product,
    isLoading,
    isProductFound,
    isProductNotFound,
    scannedBarcode,
    error
  };
}