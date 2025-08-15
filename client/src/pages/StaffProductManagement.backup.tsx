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
  ShoppingCart,
  FileText,
  Zap,
  ArrowUpDown
} from 'lucide-react';
import { ProductActionsMenu } from '@/components/ui/product-actions-menu';

// Format currency utility
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

interface Product {
  id: number;
  name: string;
  description?: string;
  price: number;
  cost?: number;
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
  createdAt?: string;
  createdBy?: string;
  createdByUsername?: string;
}

interface NewProductForm {
  name: string;
  description: string;
  sku: string;
  basePrice: number;
  cost: number;
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

export default function StaffProductManagement() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const editSectionRef = useRef<HTMLDivElement>(null);
  
  // Component state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedProductForHistory, setSelectedProductForHistory] = useState<Product | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [sortBy, setSortBy] = useState('name'); // Default sort by name
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc'); // Default ascending
  const [addProductOpen, setAddProductOpen] = useState(false);
  const [editProductOpen, setEditProductOpen] = useState(false);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [imageUploadOpen, setImageUploadOpen] = useState(false);
  const [viewDetailsProduct, setViewDetailsProduct] = useState<Product | null>(null);
  const [imageUploadProduct, setImageUploadProduct] = useState<Product | null>(null);
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  const [cardSize, setCardSize] = useState<string>('2'); // 1, 2, 3, 4 cards per row
  const [scrollPosition, setScrollPosition] = useState(0);
  const [productCardRefs, setProductCardRefs] = useState<{[key: number]: HTMLDivElement | null}>({});
  
  // Image upload states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: 0,
    cost: 0,
    price1: 0,
    price2: 0,
    price3: 0,
    price4: 0,
    price5: 0,
    stock: 0,
    sku: '',
    categoryId: null as number | null,
    imageUrl: '',
    featured: false
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
  const { data: products = [], isLoading: productsLoading, refetch: refetchProducts } = useQuery<Product[]>({
    queryKey: ['/api/admin/products'],
  });

  const { data: categories = [] } = useQuery<{id: number; name: string}[]>({
    queryKey: ['/api/admin/categories'],
  });

  // Price history query
  const { data: priceHistory = [] } = useQuery<any[]>({
    queryKey: [`/api/admin/products/${selectedProductForHistory?.id}/price-history`],
    enabled: !!selectedProductForHistory?.id,
  });

  // Input change handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProductForm(prev => ({
      ...prev,
      [name]: name === 'price' || name === 'stock' ? Number(value) : 
              name === 'categoryId' ? (value === '' || value === null ? null : Number(value)) : value
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

  // Image upload handlers
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadImage = async () => {
    if (!imageFile || !selectedProduct) return;
    
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);
      
      const response = await fetch(`/api/admin/products/${selectedProduct.id}/upload-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken') || sessionStorage.getItem('authToken')}`
        },
        body: formData
      });
      
      if (!response.ok) throw new Error('Upload failed');
      
      const result = await response.json();
      
      // Update form with new image URL
      setProductForm(prev => ({
        ...prev,
        imageUrl: result.imageUrl
      }));
      
      // Clear upload state
      setImageFile(null);
      setImagePreview('');
      
      toast({
        title: "Image uploaded successfully",
        description: "Product image has been updated."
      });
      
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const removeImagePreview = () => {
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
        categoryId: productForm.categoryId === 0 || productForm.categoryId === null || isNaN(productForm.categoryId) ? null : productForm.categoryId,
        price: Number(productForm.price),
        stock: Number(productForm.stock)
      };
      
      // Ensure valid values
      if (isNaN(cleanData.categoryId as number)) {
        cleanData.categoryId = null;
      }
      if (isNaN(cleanData.price)) {
        cleanData.price = 0;
      }
      if (isNaN(cleanData.stock)) {
        cleanData.stock = 0;
      }
      
      return await apiRequest('PUT', `/api/admin/products/${selectedProduct.id}`, cleanData);
    },
    onSuccess: async (updatedProduct) => {
      // Clear all related caches aggressively
      queryClient.removeQueries({ queryKey: ['/api/admin/products'] });
      queryClient.removeQueries({ queryKey: ['/api/products'] });
      
      // Force immediate refetch
      await refetchProducts();
      
      // Update the selected product state to reflect changes immediately
      if (selectedProduct) {
        setSelectedProduct({
          ...selectedProduct,
          ...updatedProduct,
          price: productForm.price,
          stock: productForm.stock,
          name: productForm.name,
          description: productForm.description
        });
      }
      
      setEditMode(false);
      setEditProductOpen(false);
      
      toast({
        title: "Product updated successfully", 
        description: `Price updated to $${productForm.price}. Changes saved and display refreshed.`,
      });
    },
    onError: (error: any) => {
      console.error("Update error:", error);
      
      // Still invalidate cache on error to ensure fresh data
      queryClient.removeQueries({ queryKey: ['/api/admin/products'] });
      queryClient.removeQueries({ queryKey: ['/api/products'] });
      refetchProducts();
      
      toast({
        title: "Error updating product",
        description: error.message || "Failed to update product. Please try again.",
        variant: "destructive",
      });
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
      cost: product.cost || 0,
      price1: product.price1 || 0,
      price2: product.price2 || 0,
      price3: product.price3 || 0,
      price4: product.price4 || 0,
      price5: product.price5 || 0,
      stock: product.stock || 0,
      sku: product.sku || `PRODUCT-${product.id}`,
      categoryId: product.categoryId || null,
      imageUrl: product.imageUrl || '',
      featured: product.featured || false
    });
    
    // Clear any existing image upload state
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    setEditMode(true);
    setEditProductOpen(true);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setSelectedProduct(null);
    setEditMode(false);
    setEditProductOpen(false);
    
    // Clear image upload state
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handle add product form submission
  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addProductMutation.mutate();
  };

  // Show price history
  const showPriceHistory = (product: Product) => {
    setSelectedProductForHistory(product);
    setPriceHistoryOpen(true);
  };

  // Sort function
  const sortProducts = (productsToSort: Product[]) => {
    return [...productsToSort].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'name':
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
          break;
        case 'price':
          aValue = a.price || 0;
          bValue = b.price || 0;
          break;
        case 'cost':
          aValue = a.cost || 0;
          bValue = b.cost || 0;
          break;
        case 'stock':
          aValue = a.stock || 0;
          bValue = b.stock || 0;
          break;
        case 'sku':
          aValue = a.sku?.toLowerCase() || '';
          bValue = b.sku?.toLowerCase() || '';
          break;
        case 'category':
          aValue = a.category?.name?.toLowerCase() || '';
          bValue = b.category?.name?.toLowerCase() || '';
          break;
        default:
          aValue = a.name?.toLowerCase() || '';
          bValue = b.name?.toLowerCase() || '';
      }

      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue);
        return sortOrder === 'asc' ? comparison : -comparison;
      }

      // Handle numeric comparison
      const comparison = aValue - bValue;
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  };

  // Filter and sort products
  const filteredAndSortedProducts = sortProducts(
    products.filter((product: Product) => {
      const matchesSearch = product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === '' || selectedCategory === 'all' || 
                            product.categoryId?.toString() === selectedCategory;
      return matchesSearch && matchesCategory;
    })
  );

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

  // Auth check - Allow both admin and staff access
  if (!isAuthenticated || (!user?.isAdmin && !user?.isEmployee)) {
    return (
      <AppLayout title="Staff" description="Staff Panel">
        <div className="container mx-auto px-4 py-8">
          <Card>
            <CardHeader>
              <CardTitle>Staff Access Required</CardTitle>
              <CardDescription>
                You need to be logged in as a staff member or admin to access this page.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center">
                <Button onClick={() => window.location.href = '/login'}>
                  Login as Staff
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Product Management">
      <div className="container mx-auto px-4 py-8 space-y-8">
        {/* Breadcrumb Navigation */}
        <BreadcrumbNavigation />
        
        {/* Page Header with Add Product Button */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Product Management</h1>
            <p className="text-gray-600">Manage your product inventory and details</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={() => setAddProductOpen(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
          </div>
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
            <div className="flex flex-col lg:flex-row gap-4">
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
                <Label htmlFor="sortBy">Sort by</Label>
                <Select value={`${sortBy}_${sortOrder}`} onValueChange={(value) => {
                  const [field, order] = value.split('_');
                  setSortBy(field);
                  setSortOrder(order as 'asc' | 'desc');
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="name_asc">Name (A-Z)</SelectItem>
                    <SelectItem value="name_desc">Name (Z-A)</SelectItem>
                    <SelectItem value="price_asc">Price (Low-High)</SelectItem>
                    <SelectItem value="price_desc">Price (High-Low)</SelectItem>
                    <SelectItem value="cost_asc">Cost (Low-High)</SelectItem>
                    <SelectItem value="cost_desc">Cost (High-Low)</SelectItem>
                    <SelectItem value="stock_asc">Stock (Low-High)</SelectItem>
                    <SelectItem value="stock_desc">Stock (High-Low)</SelectItem>
                    <SelectItem value="sku_asc">SKU (A-Z)</SelectItem>
                    <SelectItem value="sku_desc">SKU (Z-A)</SelectItem>
                    <SelectItem value="category_asc">Category (A-Z)</SelectItem>
                    <SelectItem value="category_desc">Category (Z-A)</SelectItem>
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
              Product Catalog ({filteredAndSortedProducts.length} products)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {productsLoading ? (
              <div className="flex justify-center items-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="ml-2">Loading products...</span>
              </div>
            ) : filteredAndSortedProducts.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No products found</h3>
                <p className="mt-1 text-sm text-gray-500">
                  {searchTerm || selectedCategory ? 'Try adjusting your search or filter.' : 'Get started by adding a new product.'}
                </p>
              </div>
            ) : (
              <div className={`grid ${getGridColsClass()} gap-4`}>
                {filteredAndSortedProducts.map((product: Product) => (
                  <Card key={product.id} className="border border-gray-200 hover:shadow-md transition-shadow">
                    <CardContent className="p-3">
                      {/* Compact Image Section */}
                      <div className="relative h-20 bg-gray-100 overflow-hidden rounded-md mb-3">
                        {product.imageUrl ? (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name}
                            className="w-full h-full object-contain bg-white"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-50">
                            <Package className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                        {/* Stock Badge - Small */}
                        <div className="absolute top-1 right-1">
                          <span className={`px-1.5 py-0.5 text-xs rounded ${
                            (product.stock || 0) <= 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                          }`}>
                            {product.stock || 0}
                          </span>
                        </div>
                      </div>
                      
                      {/* Compact Product Details */}
                      <div className="space-y-2">
                        <div>
                          <h3 className="font-medium text-sm text-gray-900 line-clamp-2 leading-tight">
                            {product.name || 'Unnamed Product'}
                          </h3>
                          <p className="text-xs text-gray-500 truncate">SKU: {product.sku || `PRODUCT-${product.id}`}</p>
                        </div>
                        
                        {/* Category and Price Row */}
                        <div className="flex items-center justify-between">
                          {product.category && (
                            <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                              {product.category.name}
                            </span>
                          )}
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-bold text-green-600">
                              {formatCurrency(product.price || 0)}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                showPriceHistory(product);
                              }}
                              className="h-5 w-5 p-0 text-gray-500 hover:text-gray-700"
                              title="View Price History"
                            >
                              <Clock className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                        
                        {product.cost && (
                          <p className="text-xs text-gray-500">
                            Cost: {formatCurrency(product.cost)}
                          </p>
                        )}
                        
                        {/* Compact Action Buttons */}
                        <div className="flex gap-1 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectProduct(product);
                            }}
                            className="flex-1 h-7 text-xs"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm('Are you sure you want to delete this product?')) {
                                deleteProductMutation.mutate(product.id);
                              }
                            }}
                            className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
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

        {/* Add Product Modal */}
        <Dialog open={addProductOpen} onOpenChange={setAddProductOpen}>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Plus className="mr-2 h-5 w-5" />
                Add New Product
              </DialogTitle>
              <DialogDescription>
                Add a new product to your inventory with pricing tiers
              </DialogDescription>
            </DialogHeader>
            
            <form onSubmit={handleAddProductSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={newProductForm.name}
                    onChange={handleNewProductChange}
                    placeholder="Enter product name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sku">SKU</Label>
                  <Input
                    id="sku"
                    name="sku"
                    value={newProductForm.sku}
                    onChange={handleNewProductChange}
                    placeholder="Enter SKU"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="basePrice">Base Price *</Label>
                  <Input
                    id="basePrice"
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
                  <Label htmlFor="stock">Stock Quantity *</Label>
                  <Input
                    id="stock"
                    name="stock"
                    type="number"
                    value={newProductForm.stock}
                    onChange={handleNewProductChange}
                    placeholder="0"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoryId">Category</Label>
                  <Select 
                    value={newProductForm.categoryId?.toString() || 'none'} 
                    onValueChange={(value) => setNewProductForm(prev => ({...prev, categoryId: value === 'none' ? null : Number(value)}))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Category</SelectItem>
                      {categories
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input
                    id="imageUrl"
                    name="imageUrl"
                    value={newProductForm.imageUrl}
                    onChange={handleNewProductChange}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  name="description"
                  value={newProductForm.description}
                  onChange={handleNewProductChange}
                  placeholder="Enter product description"
                  rows={3}
                />
              </div>

              {/* Tier Pricing Section for Add Product */}
              <div className="space-y-4">
                <div className="border-t pt-4">
                  <h3 className="text-lg font-semibold mb-4">Customer Tier Pricing</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="price1">Level 1 Price</Label>
                      <Input
                        id="price1"
                        name="price1"
                        type="number"
                        step="0.01"
                        value={newProductForm.price1}
                        onChange={handleNewProductChange}
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500">Premium customers</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="price2">Level 2 Price</Label>
                      <Input
                        id="price2"
                        name="price2"
                        type="number"
                        step="0.01"
                        value={newProductForm.price2}
                        onChange={handleNewProductChange}
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500">Regular customers</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="price3">Level 3 Price</Label>
                      <Input
                        id="price3"
                        name="price3"
                        type="number"
                        step="0.01"
                        value={newProductForm.price3}
                        onChange={handleNewProductChange}
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500">Volume customers</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="price4">Level 4 Price</Label>
                      <Input
                        id="price4"
                        name="price4"
                        type="number"
                        step="0.01"
                        value={newProductForm.price4}
                        onChange={handleNewProductChange}
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500">Bulk customers</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="price5">Level 5 Price</Label>
                      <Input
                        id="price5"
                        name="price5"
                        type="number"
                        step="0.01"
                        value={newProductForm.price5}
                        onChange={handleNewProductChange}
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500">Wholesale customers</p>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setAddProductOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={addProductMutation.isPending}
                  className="bg-green-600 hover:bg-green-700"
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
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <Edit className="mr-2 h-5 w-5" />
                Edit Product: {selectedProduct?.name}
              </DialogTitle>
              <DialogDescription>
                Update product details and pricing information
              </DialogDescription>
            </DialogHeader>
            
            {selectedProduct && (
              <form onSubmit={(e) => { e.preventDefault(); updateProductMutation.mutate(); }} className="space-y-4">
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
                    <Label htmlFor="edit-sku">SKU</Label>
                    <Input
                      id="edit-sku"
                      name="sku"
                      value={productForm.sku}
                      onChange={handleInputChange}
                      placeholder="Enter SKU"
                    />
                  </div>

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

                {/* Tier Pricing Section */}
                <div className="space-y-4">
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold mb-4">Customer Tier Pricing</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="edit-price1">Level 1 Price</Label>
                        <Input
                          id="edit-price1"
                          name="price1"
                          type="number"
                          step="0.01"
                          value={productForm.price1}
                          onChange={handleInputChange}
                          placeholder="0.00"
                        />
                        <p className="text-xs text-gray-500">Premium customers</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-price2">Level 2 Price</Label>
                        <Input
                          id="edit-price2"
                          name="price2"
                          type="number"
                          step="0.01"
                          value={productForm.price2}
                          onChange={handleInputChange}
                          placeholder="0.00"
                        />
                        <p className="text-xs text-gray-500">Regular customers</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-price3">Level 3 Price</Label>
                        <Input
                          id="edit-price3"
                          name="price3"
                          type="number"
                          step="0.01"
                          value={productForm.price3}
                          onChange={handleInputChange}
                          placeholder="0.00"
                        />
                        <p className="text-xs text-gray-500">Volume customers</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-price4">Level 4 Price</Label>
                        <Input
                          id="edit-price4"
                          name="price4"
                          type="number"
                          step="0.01"
                          value={productForm.price4}
                          onChange={handleInputChange}
                          placeholder="0.00"
                        />
                        <p className="text-xs text-gray-500">Bulk customers</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="edit-price5">Level 5 Price</Label>
                        <Input
                          id="edit-price5"
                          name="price5"
                          type="number"
                          step="0.01"
                          value={productForm.price5}
                          onChange={handleInputChange}
                          placeholder="0.00"
                        />
                        <p className="text-xs text-gray-500">Wholesale customers</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                  <div className="space-y-2">
                    <Label htmlFor="edit-cost">Cost</Label>
                    <Input
                      id="edit-cost"
                      name="cost"
                      type="number"
                      step="0.01"
                      value={productForm.cost}
                      onChange={handleInputChange}
                      placeholder="0.00"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-categoryId">Category</Label>
                    <Select 
                      value={productForm.categoryId?.toString() || 'none'} 
                      onValueChange={(value) => setProductForm(prev => ({...prev, categoryId: value === 'none' ? null : Number(value)}))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Category</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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

                {/* Enhanced Image Upload Section */}
                <div className="space-y-4">
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <ImageIcon className="mr-2 h-5 w-5" />
                      Product Image
                    </h3>
                    
                    {/* Current Image Preview */}
                    {(productForm.imageUrl || imagePreview) && (
                      <div className="mb-4">
                        <Label className="text-sm font-medium">Current Image</Label>
                        <div className="mt-2 relative">
                          <img 
                            src={imagePreview || productForm.imageUrl} 
                            alt="Product preview"
                            className="w-32 h-32 object-contain border border-gray-200 rounded-lg bg-white"
                          />
                          {imagePreview && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={removeImagePreview}
                              className="mt-2 text-red-600 hover:text-red-700"
                            >
                              <Minus className="h-3 w-3 mr-1" />
                              Remove Preview
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* File Upload */}
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Upload New Image</Label>
                        <div className="mt-2 flex items-center gap-3">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleImageFileChange}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Choose File
                          </Button>
                          {imageFile && (
                            <Button
                              type="button"
                              onClick={uploadImage}
                              disabled={uploading}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              {uploading ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <Camera className="h-4 w-4 mr-2" />
                                  Upload Image
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                        {imageFile && (
                          <p className="text-sm text-gray-500 mt-1">
                            Selected: {imageFile.name}
                          </p>
                        )}
                      </div>

                      {/* URL Input Alternative */}
                      <div className="border-t pt-3">
                        <Label htmlFor="edit-imageUrl" className="text-sm font-medium">Or Enter Image URL</Label>
                        <Input
                          id="edit-imageUrl"
                          name="imageUrl"
                          value={productForm.imageUrl}
                          onChange={handleInputChange}
                          placeholder="https://example.com/image.jpg"
                          className="mt-2"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={updateProductMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700"
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
              </form>
            )}
          </DialogContent>
        </Dialog>

        {/* Price History Modal */}
        <Dialog open={priceHistoryOpen} onOpenChange={setPriceHistoryOpen}>
          <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center">
                <History className="mr-2 h-5 w-5" />
                Price History: {selectedProductForHistory?.name}
              </DialogTitle>
              <DialogDescription>
                Track price changes and updates over time
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {priceHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No price history</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No price changes have been recorded for this product yet.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {priceHistory.map((entry, index) => (
                    <Card key={index} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              {entry.changeType === 'increase' ? (
                                <TrendingUp className="h-4 w-4 text-green-600" />
                              ) : entry.changeType === 'decrease' ? (
                                <TrendingDown className="h-4 w-4 text-red-600" />
                              ) : (
                                <Minus className="h-4 w-4 text-gray-600" />
                              )}
                              <span className="font-medium">
                                {entry.changeType === 'increase' ? 'Price Increased' : 
                                 entry.changeType === 'decrease' ? 'Price Decreased' : 'Price Updated'}
                              </span>
                            </div>
                            
                            <div className="flex items-center gap-4 text-sm">
                              <span className="text-gray-500">From:</span>
                              <span className="font-mono">{formatCurrency(entry.oldPrice)}</span>
                              <span className="text-gray-500">To:</span>
                              <span className="font-mono font-semibold">{formatCurrency(entry.newPrice)}</span>
                            </div>
                            
                            {entry.details && (
                              <div className="text-sm text-gray-600">
                                <strong>Details:</strong> {entry.details}
                              </div>
                            )}
                          </div>
                          
                          <div className="text-right text-sm text-gray-500">
                            <div>{new Date(entry.createdAt).toLocaleDateString()}</div>
                            <div>{new Date(entry.createdAt).toLocaleTimeString()}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
            
            <DialogFooter>
              <Button onClick={() => setPriceHistoryOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}