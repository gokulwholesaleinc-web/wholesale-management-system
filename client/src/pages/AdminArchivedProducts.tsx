import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Archive, 
  Package, 
  Search, 
  RefreshCw, 
  Eye,
  RotateCcw,
  Calendar,
  DollarSign,
  Barcode,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { BreadcrumbNavigation } from '@/components/navigation/BreadcrumbNavigation';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { formatDate } from '@/lib/utils';
import { ProductCard } from '@/components/products/ProductCard';
import { ProductGrid } from '@/components/products/ProductGrid';

interface ArchivedProduct {
  id: number;
  name: string;
  description: string;
  price: number;
  cost: number;
  imageUrl: string;
  sku: string;
  brand: string;
  stock: number;
  categoryId: number;
  categoryName: string;
  archived: boolean;
  updatedAt: string;
  createdAt: string;
}

export function AdminArchivedProducts() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const { toast } = useToast();

  // Fetch archived products
  const { data: archivedProducts = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/products/archived'],
    queryFn: async () => {
      const response = await apiRequest('/api/admin/products/archived');
      return response.data || [];
    },
    refetchInterval: 30000,
  });

  // Filter products based on search
  const filteredProducts = archivedProducts.filter((product: ArchivedProduct) =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle bulk unarchive
  const handleBulkUnarchive = async () => {
    if (selectedProducts.length === 0) {
      toast({
        title: "No products selected",
        description: "Please select products to unarchive",
        variant: "destructive",
      });
      return;
    }

    try {
      await Promise.all(
        selectedProducts.map(productId =>
          apiRequest(`/api/admin/products/${productId}/unarchive`, {
            method: 'POST',
          })
        )
      );

      toast({
        title: "Success",
        description: `${selectedProducts.length} products have been unarchived`,
      });

      setSelectedProducts([]);
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unarchive products",
        variant: "destructive",
      });
    }
  };

  // Handle single product unarchive
  const handleUnarchive = async (productId: number) => {
    try {
      await apiRequest(`/api/admin/products/${productId}/unarchive`, {
        method: 'POST',
      });

      toast({
        title: "Success",
        description: "Product has been unarchived",
      });

      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unarchive product",
        variant: "destructive",
      });
    }
  };

  // Calculate statistics
  const totalValue = filteredProducts.reduce((sum: number, product: ArchivedProduct) => 
    sum + (product.price * product.stock), 0
  );

  const totalStock = filteredProducts.reduce((sum: number, product: ArchivedProduct) => 
    sum + product.stock, 0
  );

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto py-8">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin" />
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-8">
        <BreadcrumbNavigation />
        
        <PageHeader
          title="Archived Products"
          description="Manage and restore archived products"
          icon={<Archive className="h-8 w-8" />}
        />

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Archived</CardTitle>
              <Archive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredProducts.length}</div>
              <p className="text-xs text-muted-foreground">
                Products archived
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Stock</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalStock}</div>
              <p className="text-xs text-muted-foreground">
                Items in archived products
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalValue.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Value of archived inventory
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Selected</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{selectedProducts.length}</div>
              <p className="text-xs text-muted-foreground">
                Products selected
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search archived products by name, brand, or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              onClick={handleBulkUnarchive}
              disabled={selectedProducts.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Unarchive Selected ({selectedProducts.length})
            </Button>
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <Card className="py-16">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <Archive className="h-16 w-16 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm ? 'No archived products found' : 'No archived products'}
              </h3>
              <p className="text-gray-600 max-w-md">
                {searchTerm 
                  ? 'Try adjusting your search terms or clear the search to see all archived products.'
                  : 'Products that are archived will appear here. You can archive products from the main products page.'
                }
              </p>
              {searchTerm && (
                <Button 
                  variant="outline" 
                  onClick={() => setSearchTerm('')}
                  className="mt-4"
                >
                  Clear Search
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Select All Checkbox */}
            <div className="flex items-center space-x-2 p-4 bg-gray-50 rounded-lg">
              <input
                type="checkbox"
                id="select-all"
                checked={selectedProducts.length === filteredProducts.length}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedProducts(filteredProducts.map(p => p.id));
                  } else {
                    setSelectedProducts([]);
                  }
                }}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="select-all" className="text-sm font-medium">
                Select all products ({filteredProducts.length})
              </label>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((product: ArchivedProduct) => (
                <Card key={product.id} className="relative border-2 border-gray-200 bg-gray-50/50">
                  {/* Selection Checkbox */}
                  <div className="absolute top-2 left-2 z-10">
                    <input
                      type="checkbox"
                      checked={selectedProducts.includes(product.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProducts([...selectedProducts, product.id]);
                        } else {
                          setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>

                  {/* Archived Badge */}
                  <div className="absolute top-2 right-2 z-10">
                    <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-300">
                      <Archive className="h-3 w-3 mr-1" />
                      Archived
                    </Badge>
                  </div>

                  <CardHeader className="pt-12">
                    <div className="flex justify-center mb-4">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-24 h-24 object-cover rounded-lg opacity-60"
                        />
                      ) : (
                        <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center opacity-60">
                          <Package className="h-12 w-12 text-gray-400" />
                        </div>
                      )}
                    </div>
                    <CardTitle className="text-lg text-gray-600">{product.name}</CardTitle>
                    <CardDescription className="text-sm text-gray-500">
                      {product.brand && <span className="font-medium">{product.brand}</span>}
                      {product.sku && <span className="ml-2 text-xs">SKU: {product.sku}</span>}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Price:</span>
                      <span className="text-lg font-bold text-gray-700">${product.price.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Stock:</span>
                      <Badge variant={product.stock > 0 ? "default" : "destructive"}>
                        {product.stock} units
                      </Badge>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Category:</span>
                      <span className="text-sm text-gray-700">{product.categoryName || 'Uncategorized'}</span>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-600">Archived:</span>
                      <span className="text-xs text-gray-500">
                        {formatDate(product.updatedAt)}
                      </span>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleUnarchive(product.id)}
                        className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Unarchive
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}