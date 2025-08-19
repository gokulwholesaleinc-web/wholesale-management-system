import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Package } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  sku?: string;
  stock: number;
}

interface QuickStockAdjustProps {
  products: Product[];
  onApply: (id: number, quantity: number) => void;
}

export function QuickStockAdjust({ products, onApply }: QuickStockAdjustProps) {
  const [skuSearch, setSkuSearch] = useState('');
  const [newStock, setNewStock] = useState('');
  
  const foundProduct = products.find(p => 
    p.sku?.toLowerCase() === skuSearch.toLowerCase() ||
    p.name.toLowerCase().includes(skuSearch.toLowerCase())
  );

  const handleApply = () => {
    if (!foundProduct || !newStock) return;
    const qty = parseInt(newStock, 10);
    if (isNaN(qty)) return;
    
    onApply(foundProduct.id, qty);
    setSkuSearch('');
    setNewStock('');
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label>Search Product</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              className="pl-10"
              placeholder="Enter SKU or product name..."
              value={skuSearch}
              onChange={(e) => setSkuSearch(e.target.value)}
            />
          </div>
        </div>
        <div>
          <Label>New Stock Quantity</Label>
          <Input
            type="number"
            placeholder="Enter stock quantity"
            value={newStock}
            onChange={(e) => setNewStock(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <Button 
            onClick={handleApply}
            disabled={!foundProduct || !newStock}
            className="w-full"
          >
            <Package className="mr-2 h-4 w-4" />
            Update Stock
          </Button>
        </div>
      </div>

      {skuSearch && foundProduct && (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{foundProduct.name}</p>
                <p className="text-sm text-gray-600">Current Stock: {foundProduct.stock}</p>
                {foundProduct.sku && <p className="text-sm text-gray-600">SKU: {foundProduct.sku}</p>}
              </div>
              <div className="text-right">
                {newStock && <p className="text-sm text-green-700">New Stock: {newStock}</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {skuSearch && !foundProduct && (
        <Card className="bg-red-50 border-red-200">
          <CardContent className="pt-4">
            <p className="text-sm text-red-700">No product found matching "{skuSearch}"</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}