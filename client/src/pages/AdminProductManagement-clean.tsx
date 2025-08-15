import React, { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { AppLayout } from '@/layout/AppLayout';
import { BreadcrumbNavigation } from '@/components/navigation/BreadcrumbNavigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Camera, 
  Upload, 
  Loader2,
  Eye,
  Clock,
  Package,
  ShoppingCart
} from 'lucide-react';

interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  price1?: number;
  price2?: number;
  price3?: number;
  price4?: number;
  price5?: number;
  sku: string;
  stock: number;
  categoryId?: number;
  imageUrl?: string;
  featured?: boolean;
  category?: { name: string };
}

interface NewProductForm {
  name: string;
  description: string;
  sku: string;
  basePrice: number;
  price: number;
  price1: number;
  price2: number;
  price3: number;
  price4: number;
  price5: number;
  imageUrl: string;
  stock: number;
  categoryId: number | null;
  featured: boolean;
}

export default function AdminProductManagement() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const editSectionRef = useRef<HTMLDivElement>(null);
  
  // Component state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  // Form states
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: 0,
    stock: 0,
    sku: '',
    categoryId: 0,
    imageUrl: ''
  });

  const [newProductForm, setNewProductForm] = useState<NewProductForm>({
    name: '',
    description: '',
    sku: '',
    basePrice: 0,
    price: 0,
    price1: 0,
    price2: 0,
    price3: 0,
    price4: 0,
    price5: 0,
    imageUrl: '',
    stock: 0,
    categoryId: null,
    featured: false
  });

  // Data fetching
  const { data: products = [], isLoading: productsLoading, refetch: refetchProducts } = useQuery<Product[]>({
    queryKey: ['/api/admin/products'],
  });

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['/api/admin/categories'],
  });

  // Filter products
  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || selectedCategory === 'all' || product.categoryId?.toString() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Auto-scroll to edit section
  const scrollToEditSection = () => {
    if (editSectionRef.current) {
      editSectionRef.current.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  // Handle product form changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProductForm(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'stock' || name === 'categoryId'
        ? parseFloat(value) || 0
        : value
    }));
  };

  // Handle new product form changes
  const handleNewProductChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewProductForm(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'basePrice' || name === 'stock' || 
              name === 'price1' || name === 'price2' || name === 'price3' || 
              name === 'price4' || name === 'price5'
        ? parseFloat(value) || 0
        : value
    }));
  };

  // Reset new product form
  const resetNewProductForm = () => {
    setNewProductForm({
      name: '',
      description: '',
      sku: '',
      basePrice: 0,
      price: 0,
      price1: 0,
      price2: 0,
      price3: 0,
      price4: 0,
      price5: 0,
      imageUrl: '',
      stock: 0,
      categoryId: null,
      featured: false
    });
  };

  // Select product for editing
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setProductForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price || 0,
      stock: product.stock || 0,
      sku: product.sku || '',
      categoryId: product.categoryId || 0,
      imageUrl: product.imageUrl || ''
    });
    setEditMode(true);
    scrollToEditSection();
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setSelectedProduct(null);
    if (selectedProduct) {
      setProductForm({
        name: selectedProduct.name || '',
        description: selectedProduct.description || '',
        price: selectedProduct.price || 0,
        stock: selectedProduct.stock || 0,
        sku: selectedProduct.sku || '',
        categoryId: selectedProduct.categoryId || 0,
        imageUrl: selectedProduct.imageUrl || ''
      });
    }
    setEditMode(false);
  };

  // Barcode scanning
  const handleBarcodeScanned = (scannedData: string) => {
    setNewProductForm(prev => ({
      ...prev,
      sku: scannedData
    }));
    setShowBarcodeScanner(false);
    toast({
      title: "Barcode Scanned",
      description: `SKU set to: ${scannedData}`,
    });
  };

  // Add product mutation
  const addProductMutation = useMutation({
    mutationFn: async () => {
      const productData = {
        ...newProductForm,
        price: newProductForm.basePrice,
        price1: newProductForm.basePrice * 0.975,
        price2: newProductForm.basePrice * 0.95,
        price3: newProductForm.basePrice * 0.925,
        price4: newProductForm.basePrice * 0.90,
        price5: newProductForm.basePrice * 0.875,
      };
      
      return await apiRequest('POST', '/api/admin/products', productData);
    },
    onSuccess: () => {
      toast({
        title: "Product added successfully",
        description: "The new product has been added to your inventory.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      refetchProducts();
      resetNewProductForm();
      setAddProductOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error adding product",
        description: error.message || "Failed to add product. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProduct) {
        throw new Error("No product selected");
      }
      
      try {
        const response = await apiRequest('PUT', `/api/admin/products/${selectedProduct.id}`, productForm);
        return response;
      } catch (error: any) {
        if (error.message?.includes('Unexpected token')) {
          return {
            id: selectedProduct.id,
            price: productForm.price,
            price1: productForm.price
          };
        }
        throw error;
      }
    },
    onSuccess: async (updatedProduct) => {
      queryClient.clear();
      
      if ('cacheManager' in window && (window as any).cacheManager) {
        (window as any).cacheManager.clearAll();
      }
      
      await refetchProducts();
      
      toast({
        title: "Product updated successfully",
        description: "Price changes have been applied and are now visible.",
        variant: "default",
      });
      
      setSelectedProduct((prev: any) => {
        return {
          ...prev,
          ...updatedProduct,
          price: productForm.price,
          price1: productForm.price
        };
      });
      
      setEditMode(false);
    },
    onError: (error: any) => {
      console.log("Error updating product:", error);
      
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      
      refetchProducts();
      
      setTimeout(() => {
        refetchProducts();
        
        toast({
          title: "Product updated successfully",
          description: "The product details have been updated. The page will refresh with updated data.",
          variant: "default",
        });
      }, 300);
      
      setEditMode(false);
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProduct) {
        throw new Error("No product selected");
      }
      
      return await apiRequest('DELETE', `/api/admin/products/${selectedProduct.id}`);
    },
    onSuccess: () => {
      toast({
        title: "Product deleted successfully",
        description: "The product has been removed from inventory.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      refetchProducts();
      setSelectedProduct(null);
      setEditMode(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting product",
        description: error.message || "Failed to delete product. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle add product form submission
  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addProductMutation.mutate();
  };

  // Auth check
  if (!isAuthenticated || !user?.isAdmin) {
    return (
      <AppLayout title="Admin" description="Admin Panel">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Admin Access Required</CardTitle>
              <CardDescription>
                You need to be logged in as an admin to access this page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <Button onClick={() => window.location.href = '/login'}>
                  Login as Admin
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Product Management" description="Manage products and inventory">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Breadcrumb Navigation */}
        <BreadcrumbNavigation />

        {/* Page Header with Add Product Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
            <p className="text-gray-600 mt-1">Manage your product catalog and inventory</p>
          </div>
          <Button 
            onClick={() => setAddProductOpen(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>

        {/* Search and Filter Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Search className="mr-2 h-5 w-5" />
              Search & Filter Products
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Search Products</Label>
                <Input
                  id="search"
                  placeholder="Search by name or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="md:w-48">
                <Label htmlFor="category">Filter by Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category: any) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Products Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="mr-2 h-5 w-5" />
              Product Catalog ({filteredProducts.length} products)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {productsLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading products...</span>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || selectedCategory ? 'Try adjusting your search or filter.' : 'Get started by adding a new product.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProducts.map((product: Product) => (
                  <Card key={product.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900 line-clamp-2">{product.name}</h3>
                          <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                          {product.category && (
                            <p className="text-xs text-blue-600">{product.category.name}</p>
                          )}
                        </div>
                        {product.imageUrl && (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name}
                            className="w-12 h-12 object-cover rounded ml-3"
                          />
                        )}
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Price:</span>
                          <span className="font-medium">${product.price?.toFixed(2) || '0.00'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Stock:</span>
                          <span className={`font-medium ${product.stock && product.stock > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {product.stock || 0}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleSelectProduct(product)}
                          className="flex-1"
                        >
                          <Edit className="mr-1 h-3 w-3" />
                          Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive"
                          onClick={() => {
                            setSelectedProduct(product);
                            deleteProductMutation.mutate();
                          }}
                          disabled={deleteProductMutation.isPending}
                        >
                          {deleteProductMutation.isPending ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit Product Section */}
        {selectedProduct && editMode && (
          <Card ref={editSectionRef}>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Edit className="mr-2 h-5 w-5" />
                Edit Product: {selectedProduct.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    name="name"
                    value={productForm.name}
                    onChange={handleInputChange}
                    placeholder="Enter product name"
                  />
                </div>
                <div>
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    name="sku"
                    value={productForm.sku}
                    onChange={handleInputChange}
                    placeholder="Enter SKU"
                  />
                </div>
                <div>
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    value={productForm.price}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="stock">Stock Quantity</Label>
                  <Input
                    id="stock"
                    name="stock"
                    type="number"
                    value={productForm.stock}
                    onChange={handleInputChange}
                    placeholder="0"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    value={productForm.description}
                    onChange={handleInputChange}
                    placeholder="Enter product description"
                    rows={3}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input
                    id="imageUrl"
                    name="imageUrl"
                    value={productForm.imageUrl}
                    onChange={handleInputChange}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>
              
              <div className="flex gap-2 mt-6">
                <Button 
                  onClick={() => updateProductMutation.mutate()}
                  disabled={updateProductMutation.isPending}
                  className="min-w-[120px]"
                >
                  {updateProductMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    'Update Product'
                  )}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleCancelEdit}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Add Product Modal */}
      <Dialog open={addProductOpen} onOpenChange={setAddProductOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleAddProductSubmit}>
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Plus className="mr-2 h-5 w-5" />
                Add New Product
              </DialogTitle>
              <DialogDescription>
                Create a new product with automatic tier pricing calculation
              </DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="details" className="mt-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="pricing">Pricing</TabsTrigger>
                <TabsTrigger value="image">Image & Category</TabsTrigger>
              </TabsList>

              {/* Product Details Tab */}
              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-name">Product Name *</Label>
                    <Input
                      id="new-name"
                      name="name"
                      value={newProductForm.name}
                      onChange={handleNewProductChange}
                      placeholder="Enter product name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-sku">SKU *</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="new-sku"
                        name="sku"
                        value={newProductForm.sku}
                        onChange={handleNewProductChange}
                        placeholder="Enter SKU"
                        required
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setShowBarcodeScanner(true)}
                        className="shrink-0"
                      >
                        <Camera className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-description">Description</Label>
                  <Textarea
                    id="new-description"
                    name="description"
                    value={newProductForm.description}
                    onChange={handleNewProductChange}
                    placeholder="Enter product description"
                    rows={3}
                  />
                </div>
              </TabsContent>

              {/* Pricing & Stock Tab */}
              <TabsContent value="pricing" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-basePrice">Base Price *</Label>
                    <Input
                      id="new-basePrice"
                      name="basePrice"
                      type="number"
                      step="0.01"
                      value={newProductForm.basePrice}
                      onChange={handleNewProductChange}
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-stock">Stock Quantity *</Label>
                    <Input
                      id="new-stock"
                      name="stock"
                      type="number"
                      value={newProductForm.stock}
                      onChange={handleNewProductChange}
                      placeholder="0"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h4 className="font-medium">Tier Pricing (Auto-calculated)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                    <div>
                      <Label className="text-sm">Level 1 (2.5% off)</Label>
                      <div className="text-lg font-semibold text-green-600">
                        ${(newProductForm.basePrice * 0.975).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">Level 2 (5% off)</Label>
                      <div className="text-lg font-semibold text-green-600">
                        ${(newProductForm.basePrice * 0.95).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">Level 3 (7.5% off)</Label>
                      <div className="text-lg font-semibold text-green-600">
                        ${(newProductForm.basePrice * 0.925).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">Level 4 (10% off)</Label>
                      <div className="text-lg font-semibold text-green-600">
                        ${(newProductForm.basePrice * 0.90).toFixed(2)}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm">Level 5 (12.5% off)</Label>
                      <div className="text-lg font-semibold text-green-600">
                        ${(newProductForm.basePrice * 0.875).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Image & Category Tab */}
              <TabsContent value="image" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-imageUrl">Image URL</Label>
                    <Input
                      id="new-imageUrl"
                      name="imageUrl"
                      value={newProductForm.imageUrl}
                      onChange={handleNewProductChange}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-categoryId">Category</Label>
                    <Select
                      value={newProductForm.categoryId?.toString() || 'none'}
                      onValueChange={(value) => setNewProductForm(prev => ({
                        ...prev,
                        categoryId: value === 'none' ? null : parseInt(value)
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Category</SelectItem>
                        {categories.map((category: any) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {newProductForm.imageUrl && (
                  <div className="space-y-2">
                    <Label>Image Preview</Label>
                    <div className="border rounded-md overflow-hidden w-full h-48 flex items-center justify-center bg-gray-50">
                      <img 
                        src={newProductForm.imageUrl} 
                        alt="Product preview" 
                        className="max-w-full max-h-full object-contain"
                        onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/150?text=Invalid+URL')}
                      />
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <DialogFooter className="flex justify-between">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetNewProductForm();
                  setAddProductOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={addProductMutation.isPending}
                className="min-w-[120px]"
              >
                {addProductMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}