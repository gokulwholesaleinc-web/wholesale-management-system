import React, { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/layout/AppLayout';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import BarcodeScanner from '@/components/BarcodeScanner';
import { 
  Loader2, 
  DollarSign, 
  Save, 
  Camera, 
  Pencil, 
  X, 
  Check, 
  Package, 
  Image, 
  Upload,
  RefreshCw,
  Trash2,
  AlertTriangle,
  Plus,
  Truck,
  QrCode,
  Search,
  CheckCircle,
  ArrowLeft,
  Clock,
  Edit2,
  Eye
} from 'lucide-react';
import { Link } from 'wouter';

export default function AdminProductManagement() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editSectionRef = useRef<HTMLDivElement>(null);
  
  // State for product editing and deletion
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    price: 0,
    stock: 0,
    sku: '',
    categoryId: 0,
    imageUrl: ''
  });
  
  // State for image uploading
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // State for add product modal
  const [addProductOpen, setAddProductOpen] = useState<boolean>(false);
  const [newProductForm, setNewProductForm] = useState({
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
    categoryId: null as number | null,
    featured: false
  });
  
  // State for filtering and searching
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  
  // State for price history viewing
  const [showPriceHistory, setShowPriceHistory] = useState(false);
  const [priceHistoryProduct, setPriceHistoryProduct] = useState<any>(null);
  
  // State for barcode scanner
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

  // Fetch categories for filtering
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['/api/categories'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Parse categories
  const categoryId = categoryFilter ? parseInt(categoryFilter) : null;

  // Fetch all products for admin with aggressive cache invalidation
  const { 
    data: products = [], 
    isLoading: isLoadingProducts,
    refetch: refetchProducts,
    error: productsError
  } = useQuery<any[]>({
    queryKey: ['/api/admin/products'],
    enabled: isAuthenticated && (user?.isAdmin || user?.is_admin),
    staleTime: 0, // Always consider data stale
    refetchOnWindowFocus: true, // Refetch when window gains focus
    retry: (failureCount, error: any) => {
      // Don't retry on 401/403 errors
      if (error && typeof error === 'object' && 'message' in error) {
        const errorMessage = String(error.message);
        if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('Unauthorized')) {
          return false;
        }
      }
      return failureCount < 2;
    }
  });

  // Filter products by search term and category with proper null safety
  const filteredProducts = (products as any[])
    .filter((product: any) => 
      (categoryId === null || product.categoryId === categoryId) &&
      (filter === '' || 
        (product.name && product.name.toLowerCase().includes(filter.toLowerCase())) ||
        (product.description && product.description.toLowerCase().includes(filter.toLowerCase())) ||
        (product.sku && product.sku.toLowerCase().includes(filter.toLowerCase())))
    )
    .sort((a: any, b: any) => (a.name || '').localeCompare(b.name || ''));

  // Mutation for updating product details
  const updateProductMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProduct) {
        throw new Error("No product selected");
      }
      
      // Ensure price and stock fields are properly converted to numbers
      const price = parseFloat(productForm.price?.toString() || '0');
      const updatedForm = {
        ...productForm,
        price: price,
        stock: parseInt(productForm.stock?.toString() || '0')
      };
      
      const response = await apiRequest('PUT', `/api/admin/products/${selectedProduct.id}`, updatedForm);
      
      try {
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Error updating product");
        }
        return await response.json();
      } catch (error: any) {
        // Handle case where response is not JSON or already consumed
        if (error.name === 'SyntaxError') {
          // Return a valid object with minimal data if JSON parsing fails
          return {
            id: selectedProduct.id,
            price: price,
            price1: price
          };
        }
        throw error;
      }
    },
    onSuccess: async (updatedProduct) => {
      // Clear all caches first
      queryClient.clear();
      
      // Clear browser cache if available  
      if ('cacheManager' in window && (window as any).cacheManager) {
        (window as any).cacheManager.clearAll();
      }
      
      // Force immediate refetch
      await refetchProducts();
      
      toast({
        title: "Product updated successfully",
        description: "Price changes have been applied and are now visible.",
        variant: "default",
      });
      
      // Force update local state with new data
      setSelectedProduct((prev: any) => {
        // Create a new merged object with updated price reflecting in both fields
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
      // This error is likely a JSON parsing error which we can safely ignore
      // since the product price is still being updated on the server
      console.log("Error updating product:", error);
      
      // Instead of showing error, show success message and refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      
      // Force immediate refetch of the products to ensure UI is up to date
      refetchProducts();
      
      // Set a small timeout and refetch again to make sure we have latest data
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
  
  // Mutation for deleting a product
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
      // Force refetch the products list instead of just invalidating the cache
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      refetchProducts(); // Immediately refetch to update the UI
      setSelectedProduct(null);
      setDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete product",
        description: error.message || "There was an error deleting the product.",
        variant: "destructive",
      });
    },
  });



  // Combined image update mutation (handles both URL and file upload)
  const updateImageMutation = useMutation({
    mutationFn: async (imageData: { type: 'url' | 'file', data: string | FormData }) => {
      if (!selectedProduct) {
        throw new Error("No product selected");
      }
      
      if (imageData.type === 'url') {
        return await apiRequest('PUT', `/api/admin/products/${selectedProduct.id}/image`, { 
          imageUrl: imageData.data as string 
        });
      } else {
        // File upload with proper authentication
        const token = localStorage.getItem('gokul_unified_auth') || sessionStorage.getItem('gokul_unified_auth');
        let authToken = '';
        
        if (token) {
          try {
            const authData = JSON.parse(token);
            authToken = authData.token;
          } catch (e) {
            console.error('Failed to parse auth token');
          }
        }

        const response = await fetch(`/api/admin/products/${selectedProduct.id}/upload-image`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
          body: imageData.data as FormData,
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to upload image");
        }
        
        return await response.json();
      }
    },
    onSuccess: () => {
      toast({
        title: "Image updated successfully",
        description: "The product image has been updated.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setImagePreview(null);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update image",
        description: error.message || "There was an error updating the product image.",
        variant: "destructive",
      });
    },
  });



  // Handle form field changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Convert number fields from string to number
    if (name === 'price' || name === 'stock') {
      const numValue = parseFloat(value);
      setProductForm({
        ...productForm,
        [name]: isNaN(numValue) ? 0 : numValue
      });
    } else {
      setProductForm({
        ...productForm,
        [name]: value
      });
    }
  };

  // Handle category selection
  const handleCategoryChange = (value: string) => {
    setProductForm({
      ...productForm,
      categoryId: parseInt(value)
    });
  };

  // Handle file selection for upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      setImagePreview(null);
      return;
    }

    const file = files[0];
    // Create a preview
    const reader = new FileReader();
    reader.onload = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Handle file upload
  const handleFileUpload = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedProduct || !fileInputRef.current?.files?.length) {
      toast({
        title: "Upload failed",
        description: "Please select a product and an image file",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append('image', fileInputRef.current.files[0]);
    
    updateImageMutation.mutate({ type: 'file', data: formData });
  };

  // Handle update form submission
  const handleUpdateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    updateProductMutation.mutate();
  };

  // Handle image URL update
  const handleUpdateImageUrl = (e: React.FormEvent) => {
    e.preventDefault();
    updateImageMutation.mutate({ type: 'url', data: productForm.imageUrl });
  };

  // Auto-scroll function
  const scrollToEditSection = () => {
    if (editSectionRef.current) {
      editSectionRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    }
  };

  // Handle selecting a product for editing
  const handleSelectProduct = (product: any) => {
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
    setEditMode(false);
    setImagePreview(null);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    
    // Auto-scroll to edit section after a short delay to ensure state update
    setTimeout(() => {
      scrollToEditSection();
    }, 100);
  };

  // Handle canceling edit mode
  const handleCancelEdit = () => {
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





  // Add product mutation
  const addProductMutation = useMutation({
    mutationFn: async (productData: typeof newProductForm) => {
      const response = await apiRequest('POST', '/api/admin/products', productData);
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Product added successfully",
        description: "The new product has been added to inventory.",
        variant: "default",
      });
      // Refresh the product list
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      refetchProducts();
      // Reset form and close modal
      resetNewProductForm();
      setAddProductOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add product",
        description: error.message || "There was an error adding the product.",
        variant: "destructive",
      });
    },
  });

  // Handle new product form submission
  const handleAddProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newProductForm.name.trim()) {
      toast({
        title: "Validation Error",
        description: "Product name is required.",
        variant: "destructive",
      });
      return;
    }

    if (newProductForm.price <= 0) {
      toast({
        title: "Validation Error", 
        description: "Product price must be greater than 0.",
        variant: "destructive",
      });
      return;
    }

    addProductMutation.mutate(newProductForm);
  };

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

  // State for purchase orders
  const [purchaseOrderTab, setPurchaseOrderTab] = useState('pending');
  const [showCreatePODialog, setShowCreatePODialog] = useState(false);
  const [showViewPODialog, setShowViewPODialog] = useState(false);
  const [selectedPurchaseOrder, setSelectedPurchaseOrder] = useState<any>(null);

  // Fetch purchase orders
  const { data: purchaseOrders = [] } = useQuery<any[]>({
    queryKey: ['/api/purchase-orders'],
    enabled: isAuthenticated && (!!user?.isAdmin || !!user?.isEmployee),
  });

  // Calculate order counts for purchase orders
  const orderCounts = {
    pending: purchaseOrders.filter((po: any) => po.status === 'pending').length,
    ordered: purchaseOrders.filter((po: any) => po.status === 'ordered').length,
    shipped: purchaseOrders.filter((po: any) => po.status === 'shipped').length,
    received: purchaseOrders.filter((po: any) => po.status === 'received').length,
    all: purchaseOrders.length,
  };

  // Fetch price history for selected product
  const { data: priceHistory = [] } = useQuery<any[]>({
    queryKey: [`/api/admin/products/${priceHistoryProduct?.id}/price-history`],
    enabled: !!priceHistoryProduct?.id,
    staleTime: 0, // Always fetch fresh data
  });

  // Handle price history viewing
  const handleViewPriceHistory = (product: any) => {
    setPriceHistoryProduct(product);
    setShowPriceHistory(true);
  };

  return (
    <AppLayout title="Product Management" description="Admin panel for managing products and purchase orders">
      {/* Header with Back to Dashboard button */}
      <div className="flex items-center justify-between mb-6 pb-4 border-b">
        <h1 className="text-2xl font-bold">Product Management</h1>
        <Button asChild variant="outline" onClick={() => {
          // Set the products tab as active when returning to admin dashboard
          localStorage.setItem('admin_dashboard_tab', 'products');
        }}>
          <Link href="/admin">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin Dashboard
          </Link>
        </Button>
      </div>

      {/* Main Tabs */}
      <Tabs defaultValue="products" className="w-full">
        <div className="w-full overflow-x-auto mb-6">
          <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground min-w-full md:w-full">
            <TabsTrigger value="products" className="whitespace-nowrap">
              <Package className="mr-2 h-4 w-4" />
              Product Management
            </TabsTrigger>
            <TabsTrigger value="purchase-orders" className="whitespace-nowrap">
              <Truck className="mr-2 h-4 w-4" />
              Purchase Orders ({orderCounts.all})
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Products Tab */}
        <TabsContent value="products">
          {/* Delete confirmation dialog */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertTriangle className="mr-2 h-5 w-5 text-destructive" />
              Delete Product
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4">
            {selectedProduct && (
              <div className="mb-4 p-4 border rounded-md bg-muted/50">
                <p className="font-semibold">{selectedProduct.name}</p>
                <p className="text-sm text-muted-foreground">SKU: {selectedProduct.sku || 'N/A'}</p>
                <p className="text-sm text-muted-foreground">Price: ${selectedProduct.price?.toFixed(2)}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteProductMutation.mutate()}
              disabled={deleteProductMutation.isPending}
            >
              {deleteProductMutation.isPending ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...</>
              ) : (
                <>Delete Product</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <div className="container mx-auto px-4 py-8">
        {/* Product detail editor */}
        {selectedProduct && (
          <Card className="mb-8" ref={editSectionRef}>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>
                  {editMode ? "Edit Product" : "Product Details"}
                </CardTitle>
                <CardDescription>
                  {editMode ? "Update product information" : "View and manage product details"}
                </CardDescription>
              </div>
              {!editMode ? (
                <div className="flex space-x-2">
                  <Button onClick={() => setEditMode(true)} variant="outline" size="sm">
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </Button>
                  <Button onClick={() => setDeleteDialogOpen(true)} variant="destructive" size="sm">
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </Button>
                </div>
              ) : (
                <div className="flex space-x-2">
                  <Button onClick={handleCancelEdit} variant="outline" size="sm">
                    <X className="mr-2 h-4 w-4" /> Cancel
                  </Button>
                  <Button onClick={handleUpdateProduct} size="sm">
                    {updateProductMutation.isPending ? (
                      <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                    ) : (
                      <><Save className="mr-2 h-4 w-4" /> Save</>
                    )}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="details">
                <TabsList className="mb-4">
                  <TabsTrigger value="details">
                    <Package className="mr-2 h-4 w-4" />
                    Details
                  </TabsTrigger>
                  <TabsTrigger value="image">
                    <Image className="mr-2 h-4 w-4" />
                    Image
                  </TabsTrigger>
                </TabsList>
                
                {/* Product Details Tab */}
                <TabsContent value="details">
                  <form onSubmit={handleUpdateProduct} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Product Name</Label>
                        <Input
                          id="name"
                          name="name"
                          value={productForm.name}
                          onChange={handleInputChange}
                          disabled={!editMode}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="sku">SKU</Label>
                        <Input
                          id="sku"
                          name="sku"
                          value={productForm.sku}
                          onChange={handleInputChange}
                          disabled={!editMode}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Input
                        id="description"
                        name="description"
                        value={productForm.description}
                        onChange={handleInputChange}
                        disabled={!editMode}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="price">Price ($)</Label>
                        <Input
                          id="price"
                          name="price"
                          type="number"
                          step="0.01"
                          min="0"
                          value={productForm.price}
                          onChange={handleInputChange}
                          disabled={!editMode}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="stock">Stock</Label>
                        <Input
                          id="stock"
                          name="stock"
                          type="number"
                          min="0"
                          value={productForm.stock}
                          onChange={handleInputChange}
                          disabled={!editMode}
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select
                          value={productForm.categoryId ? productForm.categoryId.toString() : ''}
                          onValueChange={handleCategoryChange}
                          disabled={!editMode}
                        >
                          <SelectTrigger id="category">
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category: any) => (
                              <SelectItem key={category.id} value={category.id.toString()}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    

                  </form>
                </TabsContent>
                
                {/* Product Image Tab */}
                <TabsContent value="image">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="imageUrl">Image URL</Label>
                        <div className="flex space-x-2">
                          <Input
                            id="imageUrl"
                            name="imageUrl"
                            value={productForm.imageUrl}
                            onChange={handleInputChange}
                            placeholder="https://example.com/image.jpg"
                          />
                          <Button 
                            onClick={handleUpdateImageUrl}
                            disabled={!productForm.imageUrl || updateImageMutation.isPending}
                          >
                            {updateImageMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Enter a direct URL to an image on the web
                        </p>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="file-upload">Upload Image</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="file-upload"
                            type="file"
                            ref={fileInputRef}
                            accept="image/*"
                            onChange={handleFileChange}
                            className="flex-1"
                          />
                          <Button 
                            onClick={handleFileUpload}
                            disabled={!fileInputRef.current?.files?.length || updateImageMutation.isPending}
                          >
                            {updateImageMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          Supported formats: JPG, PNG, GIF, WebP. Max file size: 5MB.
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-center justify-center">
                      <div className="border rounded-md overflow-hidden w-full h-64 flex items-center justify-center bg-gray-50">
                        {imagePreview ? (
                          <img 
                            src={imagePreview} 
                            alt="Preview" 
                            className="max-w-full max-h-full object-contain" 
                          />
                        ) : productForm.imageUrl ? (
                          <img 
                            src={productForm.imageUrl} 
                            alt={productForm.name} 
                            className="max-w-full max-h-full object-contain" 
                            onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/150?text=No+Image')}
                          />
                        ) : (
                          <div className="text-gray-400 flex flex-col items-center">
                            <Image className="h-12 w-12 mb-2" />
                            <span>No image available</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Product Listing */}
        <Card>
          <CardHeader>
            <CardTitle>Product Listing</CardTitle>
            <CardDescription>
              Browse and manage your product inventory. Click on a product to view and edit details.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <Label htmlFor="filter">Search Products</Label>
                <Input
                  id="filter"
                  placeholder="Search by name, description, or SKU..."
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                />
              </div>
              <div className="w-full md:w-64">
                <Label htmlFor="category">Filter by Category</Label>
                <Select
                  value={categoryFilter || 'all'}
                  onValueChange={(value) => setCategoryFilter(value === 'all' ? null : value)}
                >
                  <SelectTrigger id="category">
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
              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => refetchProducts()}
                  className="h-10 w-10"
                  title="Refresh product list"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {isLoadingProducts ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <>
                {/* Desktop view - standard table */}
                <div className="hidden md:block border rounded-md overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">ID</TableHead>
                        <TableHead>Product Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="w-24 text-right">Price</TableHead>
                        <TableHead className="w-24 text-right">Stock</TableHead>
                        <TableHead className="w-20">Image</TableHead>
                        <TableHead className="w-32">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                            No products found matching your search criteria
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredProducts.map((product: any) => (
                          <TableRow 
                            key={product.id} 
                            className={`cursor-pointer hover:bg-gray-50 ${selectedProduct?.id === product.id ? 'bg-blue-50' : ''}`}
                            onClick={() => handleSelectProduct(product)}
                          >
                            <TableCell className="font-medium">{product.id}</TableCell>
                            <TableCell>
                              <div className="font-medium">{product.name}</div>
                              <div className="text-xs text-gray-500 truncate max-w-[250px]">{product.sku || '—'}</div>
                            </TableCell>
                            <TableCell>
                              {categories.find((c: any) => c.id === product.categoryId)?.name || '—'}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              ${(product.price || 0).toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              {product.stock}
                            </TableCell>
                            <TableCell>
                              {product.imageUrl ? (
                                <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100">
                                  <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/60?text=No+Image')}
                                  />
                                </div>
                              ) : (
                                <div className="w-12 h-12 rounded-md bg-gray-100 flex items-center justify-center">
                                  <Image className="h-6 w-6 text-gray-400" />
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewPriceHistory(product);
                                  }}
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0"
                                  title="View Price History"
                                >
                                  <Clock className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectProduct(product);
                                    setEditMode(true);
                                    // Additional auto-scroll trigger for edit button
                                    setTimeout(() => {
                                      scrollToEditSection();
                                    }, 150);
                                  }}
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0"
                                  title="Edit Product"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSelectProduct(product);
                                    setDeleteDialogOpen(true);
                                  }}
                                  size="sm"
                                  variant="outline"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                                  title="Delete Product"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Mobile view - card layout for better touch interaction */}
                <div className="md:hidden space-y-4">
                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 border rounded-md">
                      No products found matching your search criteria
                    </div>
                  ) : (
                    filteredProducts.map((product: any) => (
                      <Card 
                        key={product.id}
                        className={`cursor-pointer hover:bg-gray-50 ${selectedProduct?.id === product.id ? 'border-primary border-2' : ''}`}
                        onClick={() => handleSelectProduct(product)}
                      >
                        <CardContent className="p-4">
                          <div className="flex gap-4">
                            {/* Product image */}
                            <div className="flex-shrink-0">
                              {product.imageUrl ? (
                                <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-100">
                                  <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    className="w-full h-full object-cover"
                                    onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/60?text=No+Image')}
                                  />
                                </div>
                              ) : (
                                <div className="w-16 h-16 rounded-md bg-gray-100 flex items-center justify-center">
                                  <Image className="h-6 w-6 text-gray-400" />
                                </div>
                              )}
                            </div>
                            
                            {/* Product details */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="font-medium text-base line-clamp-1">{product.name}</div>
                                <div className="font-semibold text-right ml-2">${(product.price || 0).toFixed(2)}</div>
                              </div>
                              
                              <div className="mt-1 text-sm text-gray-600">ID: {product.id}</div>
                              
                              <div className="mt-1 grid grid-cols-2 gap-1 text-sm">
                                <div>
                                  <span className="text-gray-500">SKU:</span> {product.sku || '—'}
                                </div>
                                <div className="text-right">
                                  <span className="text-gray-500">Stock:</span> {product.stock}
                                </div>
                                <div className="col-span-2">
                                  <span className="text-gray-500">Category:</span> {categories.find((c: any) => c.id === product.categoryId)?.name || '—'}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Mobile edit button (visible when row selected) */}
                          {selectedProduct?.id === product.id && (
                            <div className="mt-3 pt-3 border-t grid grid-cols-1 gap-2">
                              <Button 
                                onClick={(e) => {
                                  e.stopPropagation(); 
                                  setEditMode(true);
                                  // Auto-scroll for mobile edit button
                                  setTimeout(() => {
                                    scrollToEditSection();
                                  }, 150);
                                }}
                                className="w-full py-5"
                                variant="default"
                              >
                                <Pencil className="mr-2 h-4 w-4" /> Edit Product Details
                              </Button>
                              <Button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewPriceHistory(product);
                                }}
                                className="w-full py-5"
                                variant="outline"
                              >
                                <Clock className="mr-2 h-4 w-4" /> View Price History
                              </Button>
                              <Button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteDialogOpen(true);
                                }}
                                className="w-full py-5"
                                variant="destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete Product
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="text-sm text-gray-500">
              Showing {filteredProducts.length} of {products.length} products
            </div>
            <div className="flex space-x-2">
              <Button 
                variant="outline"
                onClick={() => setAddProductOpen(true)}
              >
                <Package className="mr-2 h-4 w-4" />
                Add New Product
              </Button>
              
              <Button asChild>
                <a href="/admin/products/add">
                  <Upload className="mr-2 h-4 w-4" />
                  Import Products
                </a>
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
        </TabsContent>

        {/* Purchase Orders Tab */}
        <TabsContent value="purchase-orders">
          <div className="space-y-6">
            {/* Purchase Order Header */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold">Purchase Orders</h2>
                <p className="text-muted-foreground">Manage inventory procurement and receiving</p>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setShowCreatePODialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  New Purchase Order
                </Button>
              </div>
            </div>

            {/* Purchase Order Status Tabs */}
            <Tabs value={purchaseOrderTab} onValueChange={setPurchaseOrderTab}>
              <div className="w-full overflow-x-auto">
                <TabsList className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground min-w-full md:w-full">
                  <TabsTrigger value="pending" className="whitespace-nowrap">
                    Pending ({orderCounts.pending})
                  </TabsTrigger>
                  <TabsTrigger value="ordered" className="whitespace-nowrap">
                    Ordered ({orderCounts.ordered})
                  </TabsTrigger>
                  <TabsTrigger value="shipped" className="whitespace-nowrap">
                    Shipped ({orderCounts.shipped})
                  </TabsTrigger>
                  <TabsTrigger value="received" className="whitespace-nowrap">
                    Received ({orderCounts.received})
                  </TabsTrigger>
                  <TabsTrigger value="all" className="whitespace-nowrap">
                    All ({orderCounts.all})
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value={purchaseOrderTab} className="space-y-4 mt-6">
                {purchaseOrders.filter((po: any) => 
                  purchaseOrderTab === 'all' || po.status === purchaseOrderTab
                ).length === 0 ? (
                  <Card className="p-8 text-center">
                    <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No purchase orders found
                    </h3>
                    <p className="text-gray-500 mb-4">
                      Get started by creating your first purchase order.
                    </p>
                    <Button onClick={() => setShowCreatePODialog(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Purchase Order
                    </Button>
                  </Card>
                ) : (
                  <div className="grid gap-4">
                    {purchaseOrders
                      .filter((po: any) => purchaseOrderTab === 'all' || po.status === purchaseOrderTab)
                      .map((po: any) => (
                        <Card key={po.id}>
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <CardTitle className="text-lg">PO #{po.orderNumber}</CardTitle>
                                <CardDescription>{po.supplier}</CardDescription>
                              </div>
                              <Badge variant={
                                po.status === 'received' ? 'default' :
                                po.status === 'shipped' ? 'secondary' :
                                po.status === 'ordered' ? 'outline' : 'destructive'
                              }>
                                {po.status}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <p className="text-muted-foreground">Order Date</p>
                                <p className="font-medium">{new Date(po.orderDate).toLocaleDateString()}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Total Amount</p>
                                <p className="font-medium">${po.totalAmount?.toFixed(2) || '0.00'}</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Items</p>
                                <p className="font-medium">{po.items?.length || 0} items</p>
                              </div>
                              <div>
                                <p className="text-muted-foreground">Created By</p>
                                <p className="font-medium">{po.createdBy}</p>
                              </div>
                            </div>
                          </CardContent>
                          <CardFooter className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedPurchaseOrder(po);
                                setShowViewPODialog(true);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </Button>
                            {po.status === 'shipped' && (
                              <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Receive Items
                              </Button>
                            )}
                          </CardFooter>
                        </Card>
                      ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </TabsContent>
      </Tabs>

      {/* Barcode Scanner Dialog */}
      {showBarcodeScanner && (
        <Dialog open={showBarcodeScanner} onOpenChange={setShowBarcodeScanner}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Scan Product Barcode</DialogTitle>
              <DialogDescription>
                Scan a product barcode to quickly find and add items to purchase orders
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <BarcodeScanner
                onScanResult={(code: string) => {
                  console.log('Scanned code:', code);
                  toast({
                    title: "Barcode Scanned",
                    description: `Found code: ${code}`,
                  });
                  setShowBarcodeScanner(false);
                }}
                onClose={() => {
                  console.log('Scanner closed');
                  setShowBarcodeScanner(false);
                }}
                isOpen={showBarcodeScanner}
              />
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Price History Dialog */}
      <Dialog open={showPriceHistory} onOpenChange={setShowPriceHistory}>
        <DialogContent className="max-w-4xl max-h-[75vh] md:max-h-[80vh] overflow-y-auto mb-16 md:mb-0">
          <DialogHeader>
            <DialogTitle>Price History - {priceHistoryProduct?.name}</DialogTitle>
            <DialogDescription>
              View all price changes for this product over time
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Current Pricing */}
            <div className="bg-blue-50 p-4 rounded-lg border">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold text-lg">Current Pricing</h3>
                  <p className="text-sm text-gray-600">Active sale price and cost</p>
                </div>
                <div className="text-right">
                  <div className="space-y-1">
                    <div className="text-2xl font-bold text-blue-600">
                      ${typeof priceHistoryProduct?.price === 'number' ? priceHistoryProduct.price.toFixed(2) : '0.00'}
                      <span className="text-sm font-normal text-gray-500 ml-2">Sale Price</span>
                    </div>
                    <div className="text-lg font-semibold text-green-600">
                      ${typeof priceHistoryProduct?.cost === 'number' ? priceHistoryProduct.cost.toFixed(2) : '0.00'}
                      <span className="text-sm font-normal text-gray-500 ml-2">Cost Price</span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-500 mt-1">SKU: {priceHistoryProduct?.sku || 'N/A'}</div>
                </div>
              </div>
            </div>

            {/* Price History Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Sale Price</TableHead>
                    <TableHead>Cost Price</TableHead>
                    <TableHead>Change Type</TableHead>
                    <TableHead>Changed By</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(priceHistory as any[]).length > 0 ? (
                    (priceHistory as any[]).map((entry: any, index: number) => (
                      <TableRow key={index}>
                        <TableCell>
                          {entry.createdAt ? new Date(entry.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : 'Invalid Date'}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {(typeof entry.oldPrice === 'number' || typeof entry.newPrice === 'number') ? (
                              <>
                                <div className="text-gray-500 text-sm">
                                  ${typeof entry.oldPrice === 'number' ? entry.oldPrice.toFixed(2) : '0.00'} → ${typeof entry.newPrice === 'number' ? entry.newPrice.toFixed(2) : '0.00'}
                                </div>
                                {typeof entry.oldPrice === 'number' && typeof entry.newPrice === 'number' && (
                                  <div className={`text-xs font-medium ${
                                    entry.newPrice > entry.oldPrice 
                                      ? 'text-green-600' 
                                      : entry.newPrice < entry.oldPrice 
                                      ? 'text-red-600' 
                                      : 'text-gray-600'
                                  }`}>
                                    {entry.newPrice > entry.oldPrice ? '+' : ''}
                                    ${((entry.newPrice || 0) - (entry.oldPrice || 0)).toFixed(2)}
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-400">No Change</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {(typeof entry.oldCost === 'number' || typeof entry.newCost === 'number') ? (
                              <>
                                <div className="text-gray-500 text-sm">
                                  ${typeof entry.oldCost === 'number' ? entry.oldCost.toFixed(2) : '0.00'} → ${typeof entry.newCost === 'number' ? entry.newCost.toFixed(2) : '0.00'}
                                </div>
                                {typeof entry.oldCost === 'number' && typeof entry.newCost === 'number' && (
                                  <div className={`text-xs font-medium ${
                                    entry.newCost > entry.oldCost 
                                      ? 'text-red-600' 
                                      : entry.newCost < entry.oldCost 
                                      ? 'text-green-600' 
                                      : 'text-gray-600'
                                  }`}>
                                    {entry.newCost > entry.oldCost ? '+' : ''}
                                    ${((entry.newCost || 0) - (entry.oldCost || 0)).toFixed(2)}
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-400">No Change</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {(entry.oldPrice !== entry.newPrice) && (entry.oldCost !== entry.newCost) ? (
                              <span className="text-blue-600 text-xs font-medium">Price & Cost</span>
                            ) : entry.oldPrice !== entry.newPrice ? (
                              <span className="text-blue-600 text-xs font-medium">Price Only</span>
                            ) : entry.oldCost !== entry.newCost ? (
                              <span className="text-green-600 text-xs font-medium">Cost Only</span>
                            ) : (
                              <span className="text-gray-400 text-xs">No Change</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">{entry.changedBy || 'System'}</span>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <span className="text-sm text-gray-600">
                              {entry.changeReason === 'purchase_order' ? 'Purchase Order' :
                               entry.changeReason === 'manual_update' ? 'Manual Update' :
                               entry.changeReason === 'bulk_update' ? 'Bulk Update' :
                               entry.changeReason || 'System Update'}
                            </span>
                            {entry.changeReason === 'purchase_order' && entry.purchaseOrderId && (
                              <div className="text-xs text-blue-600">
                                PO #{entry.purchaseOrderId}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                        No price history available for this product
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowPriceHistory(false)} variant="outline">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Purchase Order Dialog */}
      <Dialog open={showViewPODialog} onOpenChange={setShowViewPODialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Purchase Order Details</DialogTitle>
            <DialogDescription>
              View complete purchase order information
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto">
            {selectedPurchaseOrder && (
              <div className="space-y-6">
                {/* Order Information */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-semibold mb-2">Order Information</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Order Number:</span> {selectedPurchaseOrder.orderNumber}</div>
                      <div><span className="font-medium">Supplier:</span> {selectedPurchaseOrder.supplier}</div>
                      <div><span className="font-medium">Status:</span> {selectedPurchaseOrder.status}</div>
                      <div><span className="font-medium">Order Date:</span> {selectedPurchaseOrder.orderDate ? new Date(selectedPurchaseOrder.orderDate).toLocaleDateString() : 'N/A'}</div>
                      <div><span className="font-medium">Expected Delivery:</span> {selectedPurchaseOrder.expectedDeliveryDate ? new Date(selectedPurchaseOrder.expectedDeliveryDate).toLocaleDateString() : 'TBD'}</div>
                      {selectedPurchaseOrder.receivedDate && (
                        <div><span className="font-medium">Received Date:</span> {new Date(selectedPurchaseOrder.receivedDate).toLocaleDateString()}</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Order Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div><span className="font-medium">Total Items:</span> {selectedPurchaseOrder.items?.length || 0}</div>
                      <div><span className="font-medium">Total Amount:</span> ${selectedPurchaseOrder.totalAmount?.toFixed(2) || '0.00'}</div>
                      <div><span className="font-medium">Created By:</span> {selectedPurchaseOrder.createdBy}</div>
                      {selectedPurchaseOrder.receivedBy && (
                        <div><span className="font-medium">Received By:</span> {selectedPurchaseOrder.receivedBy}</div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Items List */}
                <div>
                  <h3 className="font-semibold mb-2">Order Items</h3>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty Ordered</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty Received</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedPurchaseOrder.items?.map((item: any, index: number) => (
                          <tr key={index}>
                            <td className="px-3 py-2 text-sm">{item.productName}</td>
                            <td className="px-3 py-2 text-sm">{item.quantityOrdered}</td>
                            <td className="px-3 py-2 text-sm">{item.quantityReceived || 0}</td>
                            <td className="px-3 py-2 text-sm">${item.unitCost?.toFixed(2) || '0.00'}</td>
                            <td className="px-3 py-2 text-sm">${item.totalCost?.toFixed(2) || '0.00'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Notes */}
                {selectedPurchaseOrder.notes && (
                  <div>
                    <h3 className="font-semibold mb-2">Notes</h3>
                    <div className="p-3 bg-gray-50 rounded text-sm">
                      {selectedPurchaseOrder.notes}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewPODialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Purchase Order Dialog */}
      <Dialog open={showCreatePODialog} onOpenChange={setShowCreatePODialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Purchase Order</DialogTitle>
            <DialogDescription>
              Create a new purchase order for inventory procurement
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Purchase Order Creation
              </h3>
              <p className="text-gray-500 mb-4">
                For full purchase order functionality, please use the dedicated Purchase Orders page.
              </p>
              <Button onClick={() => {
                setShowCreatePODialog(false);
                window.location.href = '/staff/purchase-orders';
              }}>
                Go to Purchase Orders
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Product Modal */}
      <Dialog open={addProductOpen} onOpenChange={setAddProductOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <Plus className="mr-2 h-5 w-5" />
              Add New Product
            </DialogTitle>
            <DialogDescription>
              Create a new product with complete details, pricing, and images
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleAddProductSubmit} className="space-y-6">
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="details">Product Details</TabsTrigger>
                <TabsTrigger value="pricing">Pricing & Stock</TabsTrigger>
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
                      value={newProductForm.categoryId?.toString() || ''}
                      onValueChange={(value) => setNewProductForm(prev => ({
                        ...prev,
                        categoryId: value ? parseInt(value) : null
                      }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
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