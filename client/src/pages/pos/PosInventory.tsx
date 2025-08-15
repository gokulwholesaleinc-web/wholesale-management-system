import React, { useState } from 'react';
import { ArrowLeft, Package, Search, Plus, Edit, Trash2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface Product {
  id: number;
  name: string;
  price: number;
  inventory: number;
  categoryId: number;
  upcCode?: string;
  description?: string;
  imageUrl?: string;
  level2Price?: number;
  level3Price?: number;
  level4Price?: number;
  level5Price?: number;
}

export const PosInventory: React.FC = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Fetch products - use the same endpoint as main app
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['/api/products'],
    select: (data: any) => data || []
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
    select: (data: any) => data || []
  });

  const handleBack = () => {
    setLocation('/dashboard');
  };

  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.upcCode && product.upcCode.includes(searchTerm));
    const matchesCategory = selectedCategory === 'all' || product.categoryId.toString() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getLowStockProducts = () => {
    return products.filter((product: Product) => product.inventory <= 10);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Inventory Management</h1>
          <div></div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Low Stock Alert */}
        {getLowStockProducts().length > 0 && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <span className="font-medium text-yellow-800">
                  {getLowStockProducts().length} product(s) have low stock (≤10 units)
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Filter */}
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by name or barcode..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  {categories.map((category: any) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))
          ) : (
            filteredProducts.map((product: Product) => (
              <Card key={product.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-sm">{product.name}</span>
                    </div>
                    <div className={`px-2 py-1 rounded-full text-xs ${
                      product.inventory <= 5 
                        ? 'bg-red-100 text-red-800' 
                        : product.inventory <= 10
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                    }`}>
                      {product.inventory} in stock
                    </div>
                  </div>
                  
                  <div className="space-y-1 text-sm text-gray-600">
                    <p><strong>Price:</strong> ${product.price.toFixed(2)}</p>
                    <p><strong>Category ID:</strong> {product.categoryId}</p>
                    {product.upcCode && (
                      <p><strong>UPC:</strong> {product.upcCode}</p>
                    )}
                    {product.level2Price && (
                      <p><strong>Level 2:</strong> ${product.level2Price.toFixed(2)}</p>
                    )}
                  </div>
                  
                  {product.description && (
                    <p className="text-xs text-gray-500 mt-2 line-clamp-2">
                      {product.description}
                    </p>
                  )}
                  
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Edit className="h-3 w-3 mr-1" />
                      Quick Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {filteredProducts.length === 0 && !isLoading && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No products found</h3>
            <p className="text-gray-500">Try adjusting your search or filter criteria</p>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Products</p>
                  <p className="text-xl font-bold">{products.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="text-sm text-gray-600">Low Stock</p>
                  <p className="text-xl font-bold">{getLowStockProducts().length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-green-500 rounded"></div>
                <div>
                  <p className="text-sm text-gray-600">In Stock</p>
                  <p className="text-xl font-bold">
                    {products.filter((p: Product) => p.inventory > 10).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 bg-red-500 rounded"></div>
                <div>
                  <p className="text-sm text-gray-600">Out of Stock</p>
                  <p className="text-xl font-bold">
                    {products.filter((p: Product) => p.inventory === 0).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};