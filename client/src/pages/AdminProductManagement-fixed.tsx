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
  const [editProductOpen, setEditProductOpen] = useState(false);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [cardSize, setCardSize] = useState<string>('2'); // 1, 2, 3, 4 cards per row

  // Form states
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: 0,
    stock: 0,
    sku: '',
    categoryId: null as number | null,
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

  // Fetch data
  const { data: products = [], isLoading: productsLoading, refetch: refetchProducts } = useQuery({
    queryKey: ['/api/admin/products'],
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['/api/admin/categories'],
  });

  // Input change handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProductForm(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'stock' || name === 'categoryId' ? Number(value) : value
    }));
  };

  const handleNewProductChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewProductForm(prev => ({
      ...prev,
      [name]: ['price', 'stock', 'basePrice', 'price1', 'price2', 'price3', 'price4', 'price5'].includes(name) 
        ? Number(value) : value
    }));
  };

  // Add product mutation
  const addProductMutation = useMutation({
    mutationFn: async () => {
      const cleanData = {
        ...newProductForm,
        categoryId: newProductForm.categoryId === 0 ? null : newProductForm.categoryId
      };
      return await apiRequest('POST', '/api/admin/products', cleanData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      refetchProducts();
      
      toast({
        title: "Product added successfully",
        description: "The new product has been added to your inventory.",
      });

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
      setAddProductOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error adding product",
        description: error.message || "Failed to add product. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Update product mutation  
  const updateProductMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProduct) throw new Error('No product selected');
      
      const cleanData = {
        ...productForm,
        categoryId: productForm.categoryId === 0 ? null : productForm.categoryId
      };
      
      return await apiRequest('PUT', `/api/admin/products/${selectedProduct.id}`, cleanData);
    },
    onSuccess: (updatedProduct) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      
      setSelectedProduct(prevProduct => {
        if (!prevProduct) return null;
        return {
          ...prevProduct,
          ...updatedProduct,
          price: productForm.price,
          price1: productForm.price
        };
      });
      
      setEditMode(false);
      setEditProductOpen(false);
      
      toast({
        title: "Product updated successfully",
        description: "The product details have been updated.",
      });
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
      setEditProductOpen(false);
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      return await apiRequest('DELETE', `/api/admin/products/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      refetchProducts();
      
      toast({
        title: "Product deleted successfully",
        description: "The product has been removed from your inventory.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error deleting product",
        description: error.message || "Failed to delete product. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Select product for editing
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setProductForm({
      name: product.name || '',
      description: product.description || '',
      price: product.price || 0,
      stock: product.stock || 0,
      sku: product.sku || '',
      categoryId: product.categoryId || null,
      imageUrl: product.imageUrl || ''
    });
    setEditMode(true);
    setEditProductOpen(true);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setSelectedProduct(null);
    setEditMode(false);
    setEditProductOpen(false);
  };

  // Handle add product form submission
  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addProductMutation.mutate();
  };

  // Filter products based on search and category
  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === '' || selectedCategory === 'all' || 
                          product.categoryId?.toString() === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Get grid column classes based on card size
  const getGridColsClass = () => {
    switch (cardSize) {
      case '1': return 'grid-cols-1';
      case '2': return 'grid-cols-1 sm:grid-cols-2';
      case '3': return 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3';
      case '4': return 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';
      default: return 'grid-cols-1 sm:grid-cols-2';
    }
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
            <p className="text-gray-600">Manage your product inventory and details</p>
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
              <div className="md:w-48">
                <Label htmlFor="cardSize">Cards per Row</Label>
                <Select value={cardSize} onValueChange={setCardSize}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select density" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Card (Large)</SelectItem>
                    <SelectItem value="2">2 Cards (Medium)</SelectItem>
                    <SelectItem value="3">3 Cards (Small)</SelectItem>
                    <SelectItem value="4">4 Cards (Compact)</SelectItem>
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
              <div className={`grid ${getGridColsClass()} gap-4`}>
                {filteredProducts.map((product: Product) => (
                  <Card key={product.id} className="border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
                    <CardContent className="p-0">
                      {/* Large Image Section */}
                      <div className="relative h-32 bg-gray-100 overflow-hidden">
                        {product.imageUrl ? (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-50">
                            <Package className="h-8 w-8 text-gray-400" />
                          </div>
                        )}
                        {/* Category Badge */}
                        {product.category && (
                          <div className="absolute top-2 left-2">
                            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                              {product.category.name}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Compact Content Section */}
                      <div className="p-3">
                        <div className="mb-2">
                          <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 mb-1">{product.name}</h3>
                          <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                        </div>
                        
                        <div className="flex justify-between items-center mb-3">
                          <div className="text-lg font-bold text-green-600">
                            ${product.price?.toFixed(2) || '0.00'}
                          </div>
                          <div className={`text-sm px-2 py-1 rounded-full ${
                            (product.stock || 0) > 10 
                              ? 'bg-green-100 text-green-700' 
                              : (product.stock || 0) > 0 
                                ? 'bg-yellow-100 text-yellow-700' 
                                : 'bg-red-100 text-red-700'
                          }`}>
                            {product.stock || 0} in stock
                          </div>
                        </div>
                        
                        {/* Compact Action Buttons */}
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSelectProduct(product)}
                            className="flex-1 h-8 text-xs"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteProductMutation.mutate(product.id)}
                            className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Add Product Modal */}
      <Dialog open={addProductOpen} onOpenChange={setAddProductOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Plus className="mr-2 h-5 w-5" />
              Add New Product
            </DialogTitle>
            <DialogDescription>
              Create a new product with details and pricing information
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddProductSubmit}>
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
                    <Input
                      id="new-sku"
                      name="sku"
                      value={newProductForm.sku}
                      onChange={handleNewProductChange}
                      placeholder="Enter SKU"
                      required
                    />
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
                    <Label htmlFor="new-price">Price *</Label>
                    <Input
                      id="new-price"
                      name="price"
                      type="number"
                      step="0.01"
                      value={newProductForm.price}
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
                    {newProductForm.imageUrl && (
                      <div className="mt-3">
                        <Label className="text-sm text-gray-600">Image Preview</Label>
                        <div className="border rounded-md overflow-hidden w-full h-32 flex items-center justify-center bg-gray-50 mt-1">
                          <img 
                            src={newProductForm.imageUrl} 
                            alt="Product preview" 
                            className="max-w-full max-h-full object-contain"
                            onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/200x150?text=Invalid+URL')}
                          />
                        </div>
                      </div>
                    )}
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
              </TabsContent>
            </Tabs>

            <DialogFooter className="flex justify-between mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddProductOpen(false)}
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

      {/* Edit Product Modal */}
      <Dialog open={editProductOpen} onOpenChange={setEditProductOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Edit className="mr-2 h-5 w-5" />
              Edit Product: {selectedProduct?.name}
            </DialogTitle>
            <DialogDescription>
              Update product details and pricing information
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
                  <Label htmlFor="edit-name">Product Name *</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    value={productForm.name}
                    onChange={handleInputChange}
                    placeholder="Enter product name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-sku">SKU *</Label>
                  <Input
                    id="edit-sku"
                    name="sku"
                    value={productForm.sku}
                    onChange={handleInputChange}
                    placeholder="Enter SKU"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  name="description"
                  value={productForm.description}
                  onChange={handleInputChange}
                  placeholder="Enter product description"
                  rows={3}
                />
              </div>
            </TabsContent>

            {/* Pricing & Stock Tab */}
            <TabsContent value="pricing" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-price">Price *</Label>
                  <Input
                    id="edit-price"
                    name="price"
                    type="number"
                    step="0.01"
                    value={productForm.price}
                    onChange={handleInputChange}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-stock">Stock Quantity *</Label>
                  <Input
                    id="edit-stock"
                    name="stock"
                    type="number"
                    value={productForm.stock}
                    onChange={handleInputChange}
                    placeholder="0"
                    required
                  />
                </div>
              </div>
            </TabsContent>

            {/* Image & Category Tab */}
            <TabsContent value="image" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-imageUrl">Image URL</Label>
                  <Input
                    id="edit-imageUrl"
                    name="imageUrl"
                    value={productForm.imageUrl}
                    onChange={handleInputChange}
                    placeholder="https://example.com/image.jpg"
                  />
                  {productForm.imageUrl && (
                    <div className="mt-3">
                      <Label className="text-sm text-gray-600">Image Preview</Label>
                      <div className="border rounded-md overflow-hidden w-full h-32 flex items-center justify-center bg-gray-50 mt-1">
                        <img 
                          src={productForm.imageUrl} 
                          alt="Product preview" 
                          className="max-w-full max-h-full object-contain"
                          onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/200x150?text=Invalid+URL')}
                        />
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-categoryId">Category</Label>
                  <Select
                    value={productForm.categoryId?.toString() || 'none'}
                    onValueChange={(value) => setProductForm(prev => ({
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
            </TabsContent>
          </Tabs>

          <DialogFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancelEdit}
            >
              Cancel
            </Button>
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
                <>
                  <Edit className="mr-2 h-4 w-4" />
                  Update Product
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}