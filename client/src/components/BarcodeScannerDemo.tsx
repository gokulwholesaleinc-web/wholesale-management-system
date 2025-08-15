import React, { useState } from 'react';
import { Camera, Package, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useBarcodeProductSearch } from '@/hooks/useBarcodeProductSearch';
import { offlineCartManager } from '@/lib/offlineCartManager';

interface BarcodeScannerDemoProps {
  onAddToCart?: (productId: number, quantity: number) => Promise<void>;
}

export function BarcodeScannerDemo({ onAddToCart }: BarcodeScannerDemoProps) {
  const [manualBarcode, setManualBarcode] = useState('');
  const [cameraActive, setCameraActive] = useState(false);
  const { toast } = useToast();
  
  const { 
    searchByBarcode, 
    product: scannedProduct, 
    isLoading: isSearchingProduct,
    isProductFound,
    isProductNotFound,
    clearSearch 
  } = useBarcodeProductSearch();

  // Simulate camera scanning
  const simulateCameraScan = () => {
    setCameraActive(true);
    
    // Simulate scanning delay
    setTimeout(() => {
      // Generate a sample product ID (1-20 range for demo)
      const sampleProductId = Math.floor(Math.random() * 20) + 1;
      const sampleBarcode = sampleProductId.toString();
      
      searchByBarcode(sampleBarcode);
      setCameraActive(false);
      
      toast({
        title: "Barcode Scanned",
        description: `Camera detected barcode: ${sampleBarcode}`,
        variant: "default",
      });
    }, 2000);
  };

  // Handle manual barcode entry
  const handleManualSearch = () => {
    if (manualBarcode.trim()) {
      searchByBarcode(manualBarcode.trim());
      setManualBarcode('');
    }
  };

  // Add scanned product to cart
  const handleAddToCart = async (product: any) => {
    try {
      if (onAddToCart) {
        await onAddToCart(product.id, 1);
      } else {
        // Use offline cart manager as fallback
        await offlineCartManager.saveCartItem(product.id.toString(), 1, {
          price: product.price,
          timestamp: Date.now()
        });
        
        toast({
          title: "Added to Cart",
          description: `${product.name} added to offline cart`,
          variant: "default",
        });
      }
      
      clearSearch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add product to cart",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Camera className="h-5 w-5" />
            <span>Barcode Scanner</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Camera Scanner Button */}
          <div className="flex flex-col space-y-2">
            <Button
              onClick={simulateCameraScan}
              disabled={cameraActive || isSearchingProduct}
              className="w-full h-12"
              variant={cameraActive ? "secondary" : "default"}
            >
              {cameraActive ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Scanning with Camera...
                </>
              ) : (
                <>
                  <Camera className="mr-2 h-4 w-4" />
                  Start Camera Scan
                </>
              )}
            </Button>
            <p className="text-xs text-gray-500 text-center">
              Click to simulate camera barcode scanning
            </p>
          </div>

          {/* Manual Barcode Entry */}
          <div className="border-t pt-4">
            <div className="flex space-x-2">
              <Input
                placeholder="Enter barcode manually (e.g., 1, 2, 3...)"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleManualSearch()}
                disabled={isSearchingProduct}
              />
              <Button
                onClick={handleManualSearch}
                disabled={!manualBarcode.trim() || isSearchingProduct}
                size="icon"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Status */}
      {isSearchingProduct && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center space-x-3">
              <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
              <span className="text-sm text-blue-700">Searching for product...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product Found */}
      {isProductFound && scannedProduct && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <Package className="h-4 w-4 text-green-600" />
                    <h3 className="font-semibold text-green-800">{scannedProduct.name}</h3>
                    <Badge variant="secondary" className="text-xs">
                      Found
                    </Badge>
                  </div>
                  <p className="text-sm text-green-600 mb-1">
                    Price: ${scannedProduct.price}
                  </p>
                  <p className="text-xs text-green-600">
                    Stock: {scannedProduct.stockQuantity} units
                  </p>
                  {scannedProduct.description && (
                    <p className="text-xs text-gray-600 mt-2">
                      {scannedProduct.description}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex space-x-2 pt-2">
                <Button 
                  size="sm" 
                  onClick={() => handleAddToCart(scannedProduct)}
                  className="bg-green-600 hover:bg-green-700 flex-1"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add to Cart
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={clearSearch}
                >
                  Clear
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product Not Found */}
      {isProductNotFound && (
        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-orange-800">Product Not Found</h3>
                <p className="text-sm text-orange-600">
                  No product found with that barcode
                </p>
                <p className="text-xs text-orange-500 mt-1">
                  Try scanning again or enter a different barcode
                </p>
              </div>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={clearSearch}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Demo Instructions */}
      <Card className="border-gray-200 bg-gray-50">
        <CardContent className="p-4">
          <h4 className="font-medium text-gray-800 mb-2">Demo Instructions</h4>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• Use "Start Camera Scan" to simulate barcode scanning</li>
            <li>• Enter product IDs manually (try: 1, 2, 3, etc.)</li>
            <li>• Products are searched from your current inventory</li>
            <li>• Cart items persist offline and sync when online</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}