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
    cost: 0,
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

  // Fetch products
  const { data: products = [], isLoading: productsLoading, error: productsError } = useQuery({
    queryKey: ['/api/admin/products'],
    enabled: isAuthenticated && (user?.isAdmin || user?.isEmployee)
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
    enabled: isAuthenticated && (user?.isAdmin || user?.isEmployee)
  });

  // Fetch price history for selected product
  const { data: priceHistory, isLoading: priceHistoryLoading, error: priceHistoryError } = useQuery({
    queryKey: ['/api/admin/products', selectedProductForHistory?.id, 'price-history'],
    enabled: !!selectedProductForHistory?.id
  });

  // Add product mutation
  const addProductMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      
      // Add all product fields
      Object.entries(newProductForm).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, value.toString());
        }
      });

      // Add image if present
      if (imageFile) {
        formData.append('image', imageFile);
      }

      return apiRequest('/api/admin/products', {
        method: 'POST',
        body: formData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      setAddProductOpen(false);
      setNewProductForm({
        name: '',
        description: '',
        sku: '',
        basePrice: 0,
        cost: 0,
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
      setImageFile(null);
      setImagePreview('');
      toast({
        title: "Product added successfully",
        description: "The new product has been added to the inventory."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add product",
        description: error.message || "An error occurred while adding the product.",
        variant: "destructive"
      });
    }
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProduct) return;

      const formData = new FormData();
      
      // Add all product fields
      Object.entries(productForm).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          formData.append(key, value.toString());
        }
      });

      // Add image if present
      if (imageFile) {
        formData.append('image', imageFile);
      }

      return apiRequest(`/api/admin/products/${selectedProduct.id}`, {
        method: 'PUT',
        body: formData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      setEditProductOpen(false);
      setSelectedProduct(null);
      setImageFile(null);
      setImagePreview('');
      toast({
        title: "Product updated successfully",
        description: "The product has been updated."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update product",
        description: error.message || "An error occurred while updating the product.",
        variant: "destructive"
      });
    }
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      return apiRequest(`/api/admin/products/${productId}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      toast({
        title: "Product deleted",
        description: "The product has been deleted from the inventory."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete product",
        description: error.message || "An error occurred while deleting the product.",
        variant: "destructive"
      });
    }
  });

  // Archive product mutation
  const archiveProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      return apiRequest(`/api/admin/products/${productId}/archive`, {
        method: 'POST'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Product archived",
        description: "The product has been archived and is no longer visible to customers."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to archive product",
        description: error.message || "An error occurred while archiving the product.",
        variant: "destructive"
      });
    }
  });

  // Handle image upload
  const handleImageUpload = async () => {
    if (!imageFile || !imageUploadProduct) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', imageFile);

      await apiRequest(`/api/admin/products/${imageUploadProduct.id}/image`, {
        method: 'POST',
        body: formData
      });

      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      setImageUploadOpen(false);
      setImageUploadProduct(null);
      setImageFile(null);
      setImagePreview('');
      
      toast({
        title: "Image uploaded",
        description: "Product image has been updated successfully."
      });
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: "Failed to upload image. Please try again.",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setCameraStream(stream);
      setIsCameraActive(true);
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      toast({
        title: "Camera access denied",
        description: "Please allow camera access to take photos.",
        variant: "destructive"
      });
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
      setIsCameraActive(false);
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(video, 0, 0);
      
      const imageDataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImage(imageDataUrl);
      setImagePreview(imageDataUrl);
      
      // Convert to blob for upload
      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], 'captured-image.jpg', { type: 'image/jpeg' });
          setImageFile(file);
        }
      }, 'image/jpeg');
      
      stopCamera();
    }
  };

  // Profit margin calculation function (not markup)
  const calculateProfit = (price: number, cost: number) => {
    if (price === 0) return 0;
    return ((price - cost) / price) * 100;
  };

  // Handle add product form submission
  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addProductMutation.mutate();
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
        case 'createdAt':
          aValue = new Date(a.createdAt || 0).getTime();
          bValue = new Date(b.createdAt || 0).getTime();
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

  // Handle sort change
  const handleSortChange = (newSortBy: string) => {
    if (newSortBy === sortBy) {
      // If same field, toggle order
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      // If different field, set new field and default to ascending
      setSortBy(newSortBy);
      setSortOrder('asc');
    }
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
  const getGridClasses = () => {
    switch (cardSize) {
      case '1': return 'grid-cols-1';
      case '2': return 'grid-cols-1 sm:grid-cols-2';
      case '3': return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
      case '4': return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4';
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
                    <SelectItem value="createdAt_desc">Newest First</SelectItem>
                    <SelectItem value="createdAt_asc">Oldest First</SelectItem>
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
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Package className="mr-2 h-5 w-5" />
                Product Inventory
                <span className="ml-2 text-sm text-gray-500">
                  ({filteredAndSortedProducts.length} of {products.length} products)
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {productsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : productsError ? (
              <div className="text-center py-8 text-red-500">
                <p>Error loading products: {(productsError as any)?.message}</p>
              </div>
            ) : filteredAndSortedProducts.length === 0 ? (
              <div className="text-center py-8">
                <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500">No products found matching your criteria</p>
              </div>
            ) : (
              <div className={`grid ${getGridClasses()} gap-4`}>
                {filteredAndSortedProducts.map((product: Product) => (
                  <Card key={product.id} className="border hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="space-y-3">
                        {/* Product Image */}
                        <div className="relative w-full h-40 bg-gray-100 rounded-lg overflow-hidden">
                          {product.imageUrl ? (
                            <img 
                              src={product.imageUrl} 
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-gray-100">
                              <Package className="h-12 w-12 text-gray-400" />
                            </div>
                          )}
                        </div>

                        {/* Product Details */}
                        <div className="space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-gray-900 truncate">
                                {product.name}
                              </h3>
                              <p className="text-sm text-gray-500">
                                SKU: {product.sku}
                              </p>
                              {product.category && (
                                <p className="text-xs text-blue-600">
                                  {product.category.name}
                                </p>
                              )}
                            </div>
                          </div>
                          
                          {product.createdAt && (
                            <div className="text-xs text-gray-400 flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              {new Date(product.createdAt).toLocaleDateString()}
                              <span className="ml-2 text-gray-500">
                                by {product.createdByUsername || product.createdBy || 'Unknown'}
                              </span>
                            </div>
                          )}
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
                        
                        {/* Product Actions */}
                        <div className="flex justify-between items-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
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
                                sku: product.sku || '',
                                categoryId: product.categoryId || null,
                                imageUrl: product.imageUrl || '',
                                featured: product.featured || false
                              });
                              setEditProductOpen(true);
                            }}
                            className="flex items-center gap-1 bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200"
                          >
                            <Edit className="h-3 w-3" />
                            Edit
                          </Button>
                          <ProductActionsMenu
                            product={product}
                            onEdit={(product) => {
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
                                sku: product.sku || '',
                                categoryId: product.categoryId || null,
                                imageUrl: product.imageUrl || '',
                                featured: product.featured || false
                              });
                              setEditProductOpen(true);
                            }}
                            onViewSalesAnalytics={() => {}}
                            onToggleFeatured={() => {}}
                            onViewPriceHistory={() => setSelectedProductForHistory(product)}
                            onDuplicate={() => {}}
                            onAddToCart={() => {}}
                            onArchive={() => archiveProductMutation.mutate(product.id)}
                            onDelete={() => deleteProductMutation.mutate(product.id)}
                          />
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
                      onChange={(e) => setNewProductForm({...newProductForm, name: e.target.value})}
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
                      onChange={(e) => setNewProductForm({...newProductForm, sku: e.target.value})}
                      placeholder="Enter SKU or scan barcode"
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
                    onChange={(e) => setNewProductForm({...newProductForm, description: e.target.value})}
                    placeholder="Enter product description"
                    rows={3}
                  />
                </div>
              </TabsContent>

              {/* Pricing & Stock Tab */}
              <TabsContent value="pricing" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="new-cost">Cost Price</Label>
                    <Input
                      id="new-cost"
                      name="cost"
                      type="number"
                      step="0.01"
                      value={newProductForm.cost}
                      onChange={(e) => setNewProductForm({...newProductForm, cost: parseFloat(e.target.value) || 0})}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-price">Sale Price *</Label>
                    <Input
                      id="new-price"
                      name="price"
                      type="number"
                      step="0.01"
                      value={newProductForm.price}
                      onChange={(e) => setNewProductForm({...newProductForm, price: parseFloat(e.target.value) || 0})}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="new-stock">Stock Quantity *</Label>
                  <Input
                    id="new-stock"
                    name="stock"
                    type="number"
                    value={newProductForm.stock}
                    onChange={(e) => setNewProductForm({...newProductForm, stock: parseInt(e.target.value) || 0})}
                    placeholder="0"
                    required
                  />
                </div>
              </TabsContent>

              {/* Image & Category Tab */}
              <TabsContent value="image" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-category">Category</Label>
                  <Select 
                    value={newProductForm.categoryId?.toString() || 'none'} 
                    onValueChange={(value) => setNewProductForm({...newProductForm, categoryId: value !== 'none' ? parseInt(value) : null})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
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

                {/* Image Upload Section */}
                <div className="space-y-2">
                  <Label>Product Image</Label>
                  <div className="space-y-3">
                    {imagePreview && (
                      <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    
                    <div className="flex gap-2">
                      <Button 
                        type="button"
                        variant="outline" 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2"
                      >
                        <Upload className="h-4 w-4" />
                        Upload File
                      </Button>
                      <Button 
                        type="button"
                        variant="outline" 
                        onClick={startCamera}
                        className="flex items-center gap-2"
                      >
                        <Camera className="h-4 w-4" />
                        Take Photo
                      </Button>
                    </div>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setImageFile(file);
                          setImagePreview(URL.createObjectURL(file));
                        }
                      }}
                      className="hidden"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter className="mt-6">
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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Edit className="mr-2 h-5 w-5" />
              Edit Product
            </DialogTitle>
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
                    value={productForm.name}
                    onChange={(e) => setProductForm({...productForm, name: e.target.value})}
                    placeholder="Enter product name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-sku">SKU *</Label>
                  <Input
                    id="edit-sku"
                    value={productForm.sku}
                    onChange={(e) => setProductForm({...productForm, sku: e.target.value})}
                    placeholder="Enter SKU"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={productForm.description}
                  onChange={(e) => setProductForm({...productForm, description: e.target.value})}
                  placeholder="Enter product description"
                  rows={3}
                />
              </div>
            </TabsContent>

            {/* Pricing & Stock Tab */}
            <TabsContent value="pricing" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-cost">Cost Price</Label>
                  <Input
                    id="edit-cost"
                    type="number"
                    step="0.01"
                    value={productForm.cost}
                    onChange={(e) => setProductForm({...productForm, cost: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-price">Sale Price *</Label>
                  <Input
                    id="edit-price"
                    type="number"
                    step="0.01"
                    value={productForm.price}
                    onChange={(e) => setProductForm({...productForm, price: parseFloat(e.target.value) || 0})}
                    placeholder="0.00"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="edit-stock">Stock Quantity *</Label>
                <Input
                  id="edit-stock"
                  type="number"
                  value={productForm.stock}
                  onChange={(e) => setProductForm({...productForm, stock: parseInt(e.target.value) || 0})}
                  placeholder="0"
                />
              </div>
            </TabsContent>

            {/* Image & Category Tab */}
            <TabsContent value="image" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-category">Category</Label>
                <Select 
                  value={productForm.categoryId?.toString() || 'none'} 
                  onValueChange={(value) => setProductForm({...productForm, categoryId: value !== 'none' ? parseInt(value) : null})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
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

              {/* Current Image */}
              {selectedProduct?.imageUrl && (
                <div className="space-y-2">
                  <Label>Current Image</Label>
                  <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                    <img 
                      src={selectedProduct.imageUrl} 
                      alt="Current" 
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              )}

              {/* New Image Upload */}
              <div className="space-y-2">
                <Label>Update Image</Label>
                <div className="space-y-3">
                  {imagePreview && (
                    <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="flex gap-2">
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2"
                    >
                      <Upload className="h-4 w-4" />
                      Upload File
                    </Button>
                    <Button 
                      type="button"
                      variant="outline" 
                      onClick={startCamera}
                      className="flex items-center gap-2"
                    >
                      <Camera className="h-4 w-4" />
                      Take Photo
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => setEditProductOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => updateProductMutation.mutate()}
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
        </DialogContent>
      </Dialog>

      {/* Price History Dialog */}
      <Dialog open={!!selectedProductForHistory} onOpenChange={() => setSelectedProductForHistory(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              Price History - {selectedProductForHistory?.name}
            </DialogTitle>
            <DialogDescription>
              View pricing changes and history for this product
            </DialogDescription>
          </DialogHeader>
          
          <div className="max-h-[50vh] overflow-y-auto">
            <div className="space-y-4 pr-2">
              {priceHistoryLoading ? (
                <div className="text-center py-8">
                  <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-500" />
                  <p className="mt-2 text-sm text-gray-500">Loading price history...</p>
                </div>
              ) : priceHistoryError ? (
                <div className="text-center py-8 text-red-500">
                  <p>Error loading price history: {(priceHistoryError as any)?.message}</p>
                </div>
              ) : Array.isArray(priceHistory) && priceHistory.length > 0 ? (
                <div className="space-y-3">
                  {priceHistory
                    .filter((entry: any) => 
                      (entry.oldPrice !== null && entry.newPrice !== null && entry.oldPrice !== entry.newPrice) ||
                      (entry.oldCost !== null && entry.newCost !== null && entry.oldCost !== entry.newCost)
                    )
                    .map((entry: any, index: number) => (
                      <div key={index} className="border rounded-lg p-4 bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-semibold text-gray-900">
                            {entry.changeReason === 'manual_update' ? 'Price Updated' : 
                             entry.changeReason === 'Purchase order received' ? 'Cost Updated from PO' : 'Price Changed'}
                          </div>
                          <div className="text-sm text-gray-600">
                            {new Date(entry.createdAt || entry.changedAt).toLocaleString()}
                          </div>
                          {(entry.displayName || entry.changedBy) && (
                            <div className="text-sm text-blue-600">
                              By: {entry.displayName || entry.changedBy}
                            </div>
                          )}
                          {entry.purchaseOrderId && (
                            <div className="text-sm text-purple-600">
                              PO #{entry.purchaseOrderId}
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="space-y-1">
                            {/* Sale Price Changes */}
                            {(entry.oldPrice !== null && entry.newPrice !== null && entry.oldPrice !== entry.newPrice) && (
                              <div>
                                <div className="text-xs text-gray-500">Sale Price</div>
                                <div className="flex items-center space-x-2">
                                  <div className="text-sm text-gray-500 line-through">
                                    ${parseFloat(entry.oldPrice || 0).toFixed(2)}
                                  </div>
                                  <span>→</span>
                                  <div className="text-lg font-bold text-green-600">
                                    ${parseFloat(entry.newPrice || 0).toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            )}
                            {/* Cost Price Changes */}
                            {(entry.oldCost !== null && entry.newCost !== null && entry.oldCost !== entry.newCost) && (
                              <div>
                                <div className="text-xs text-gray-500">Cost Price</div>
                                <div className="flex items-center space-x-2">
                                  <div className="text-sm text-gray-500 line-through">
                                    ${parseFloat(entry.oldCost || 0).toFixed(2)}
                                  </div>
                                  <span>→</span>
                                  <div className="text-lg font-bold text-blue-600">
                                    ${parseFloat(entry.newCost || 0).toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      {entry.changeReason && (
                        <div className="mt-2 text-sm text-gray-600">
                          Reason: {entry.changeReason}
                        </div>
                      )}
                        </div>
                      ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p>No price history available for this product</p>
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedProductForHistory(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Camera Modal */}
      {isCameraActive && (
        <Dialog open={isCameraActive} onOpenChange={() => stopCamera()}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Take Product Photo</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <video 
                ref={videoRef}
                autoPlay 
                playsInline
                className="w-full rounded-lg"
              />
              <canvas ref={canvasRef} className="hidden" />
              <div className="flex justify-center gap-2">
                <Button onClick={capturePhoto} className="bg-green-600 hover:bg-green-700">
                  <Camera className="mr-2 h-4 w-4" />
                  Capture
                </Button>
                <Button variant="outline" onClick={stopCamera}>
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </AppLayout>
  );
}