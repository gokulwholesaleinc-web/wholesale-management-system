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
  flatTaxIds?: string[];
  isDraft?: boolean;
  isVisible?: boolean;
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
  taxPercentage: number;
  flatTaxIds: string[];
  isDraft: boolean;
  isVisible: boolean;
}

export default function AdminProductManagement() {
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
    featured: false,
    taxPercentage: 0,
    flatTaxIds: [] as string[]
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
    featured: false,
    taxPercentage: 0,
    flatTaxIds: [],
    isDraft: true,
    isVisible: false
  });

  // Draft/Live management state
  const [viewMode, setViewMode] = useState<'all' | 'live' | 'draft'>('all');

  // Fetch data based on view mode
  const getProductsEndpoint = () => {
    switch (viewMode) {
      case 'live':
        return '/api/admin/products/visible';
      case 'draft':
        return '/api/admin/products/drafts';
      default:
        return '/api/admin/products';
    }
  };

  const { data: products = [], isLoading: productsLoading, refetch: refetchProducts } = useQuery<Product[]>({
    queryKey: [getProductsEndpoint()],
  });

  const { data: categories = [] } = useQuery<{id: number; name: string}[]>({
    queryKey: ['/api/admin/categories'],
  });

  const { data: flatTaxes = [] } = useQuery<{id: string; name: string; amount: number; taxType: string; countyName?: string}[]>({
    queryKey: ['/api/admin/tax/flat-taxes'],
  });

  // Price history query
  const { data: priceHistory = [], isLoading: priceHistoryLoading, error: priceHistoryError } = useQuery<any[]>({
    queryKey: [`/api/admin/products/${selectedProductForHistory?.id}/price-history`],
    enabled: !!selectedProductForHistory?.id,
  });



  // Input change handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Handle tax percentage change with auto-calculation
    if (name === 'taxPercentage') {
      handleTaxPercentageChange(Number(value), false);
      return;
    }
    
    setProductForm(prev => ({
      ...prev,
      [name]: ['price', 'stock', 'cost', 'price1', 'price2', 'price3', 'price4', 'price5', 'taxPercentage'].includes(name) ? Number(value) : 
              name === 'categoryId' ? (value === '' || value === null ? null : Number(value)) : value
    }));
  };

  const handleNewProductChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    // Handle tax percentage change with auto-calculation
    if (name === 'taxPercentage') {
      handleTaxPercentageChange(Number(value), true);
      return;
    }
    
    setNewProductForm(prev => ({
      ...prev,
      [name]: ['price', 'stock', 'basePrice', 'cost', 'price1', 'price2', 'price3', 'price4', 'price5', 'taxPercentage'].includes(name) 
        ? Number(value) : value
    }));
  };

  // Flat tax handlers
  const handleFlatTaxChange = (flatTaxId: string, checked: boolean) => {
    setNewProductForm(prev => {
      const currentIds = prev.flatTaxIds || [];
      const updatedIds = checked 
        ? [...currentIds.filter(id => id !== flatTaxId), flatTaxId] // Remove duplicates before adding
        : currentIds.filter(id => id !== flatTaxId);
      
      return {
        ...prev,
        flatTaxIds: [...new Set(updatedIds)] // Ensure uniqueness
      };
    });
  };

  const handleEditProductFlatTaxChange = (flatTaxId: string, checked: boolean) => {
    setProductForm(prev => {
      const currentIds = prev.flatTaxIds || [];
      const updatedIds = checked 
        ? [...currentIds.filter(id => id !== flatTaxId), flatTaxId] // Remove duplicates before adding
        : currentIds.filter(id => id !== flatTaxId);
      
      return {
        ...prev,
        flatTaxIds: [...new Set(updatedIds)] // Ensure uniqueness
      };
    });
  };

  // SKU duplicate check function
  const checkSkuDuplicate = (sku: string, excludeId?: number): boolean => {
    if (!sku.trim()) return false;
    return products.some(product => 
      product.sku?.toLowerCase() === sku.toLowerCase() && 
      product.id !== excludeId
    );
  };

  // Add product mutation
  const addProductMutation = useMutation({
    mutationFn: async () => {
      // Check for duplicate SKU before submitting
      if (newProductForm.sku && checkSkuDuplicate(newProductForm.sku)) {
        throw new Error(`Product with SKU "${newProductForm.sku}" already exists. Please use a different SKU.`);
      }
      
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
        featured: false,
        taxPercentage: 0,
        flatTaxIds: []
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
      
      // Check for duplicate SKU before updating (excluding current product)
      if (productForm.sku && checkSkuDuplicate(productForm.sku, selectedProduct.id)) {
        throw new Error(`Product with SKU "${productForm.sku}" already exists. Please use a different SKU.`);
      }
      
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
      if (selectedProduct && updatedProduct) {
        const freshProduct = {
          ...selectedProduct,
          ...updatedProduct,
          // Ensure flatTaxIds is properly synchronized from backend
          flatTaxIds: updatedProduct.flatTaxIds || [],
          price: productForm.price,
          stock: productForm.stock,
          name: productForm.name,
          description: productForm.description
        };
        setSelectedProduct(freshProduct);
        
        // Update the form state with the actual saved data from backend
        setProductForm(prev => ({
          ...prev,
          flatTaxIds: (updatedProduct.flatTaxIds || []).map(id => String(id)),
          // Ensure other fields match what was actually saved
          price: updatedProduct.price || prev.price,
          stock: updatedProduct.stock || prev.stock,
          name: updatedProduct.name || prev.name,
          description: updatedProduct.description || prev.description,
          taxPercentage: updatedProduct.taxPercentage || prev.taxPercentage
        }));
      }
      
      setEditMode(false);
      setEditProductOpen(false);
      
      // Restore scroll position after a brief delay to allow DOM updates
      setTimeout(() => {
        window.scrollTo({
          top: scrollPosition,
          behavior: 'smooth'
        });
      }, 100);
      
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
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products/visible'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products/drafts'] });
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

  // Update product visibility mutation
  const updateVisibilityMutation = useMutation({
    mutationFn: async ({ productId, isVisible, isDraft }: { productId: number; isVisible: boolean; isDraft: boolean }) => {
      return await apiRequest('PUT', `/api/admin/products/${productId}/visibility`, { isVisible, isDraft });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products/visible'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products/drafts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      refetchProducts();
      
      toast({
        title: "Product status updated",
        description: "The product visibility has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error updating product status",
        description: error.message || "Failed to update product status. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Select product for editing
  const handleSelectProduct = (product: Product) => {
    // Save current scroll position before opening modal
    setScrollPosition(window.scrollY);
    
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
      featured: product.featured || false,
      taxPercentage: (product as any).taxPercentage || 0,
      flatTaxIds: (product.flatTaxIds || []).map(id => String(id))
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

  // Product Actions Menu handlers
  const handleViewAnalytics = (productId: number) => {
    toast({
      title: "Analytics Coming Soon",
      description: "Product analytics feature will be available soon.",
    });
  };

  const handleDuplicate = (product: Product) => {
    setNewProductForm({
      name: `${product.name} (Copy)`,
      description: product.description || '',
      sku: `${product.sku}-COPY`,
      basePrice: product.price || 0,
      cost: product.cost || 0,
      price: product.price || 0,
      price1: product.price1 || 0,
      price2: product.price2 || 0,
      price3: product.price3 || 0,
      price4: product.price4 || 0,
      price5: product.price5 || 0,
      imageUrl: product.imageUrl || '',
      stock: 0, // Reset stock for duplicate
      categoryId: product.categoryId || null,
      featured: false,
      taxPercentage: (product as any).taxPercentage || 0,
      flatTaxIds: (product.flatTaxIds || []).map(id => String(id)),
      isDraft: true,
      isVisible: false
    });
    setAddProductOpen(true);
  };

  const handleToggleFeatured = async (productId: number, featured: boolean) => {
    try {
      await apiRequest('PUT', `/api/admin/products/${productId}`, { featured });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      refetchProducts();
      toast({
        title: featured ? "Product featured" : "Product unfeatured",
        description: `Product has been ${featured ? 'added to' : 'removed from'} featured products.`,
      });
    } catch (error: any) {
      toast({
        title: "Error updating product",
        description: error.message || "Failed to update featured status.",
        variant: "destructive",
      });
    }
  };

  const handleViewPriceHistory = (productId: number) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setSelectedProductForHistory(product);
    }
  };

  const handleAddToCart = async (productId: number) => {
    try {
      await apiRequest('POST', '/api/cart/add', { productId, quantity: 1 });
      toast({
        title: "Added to cart",
        description: "Product has been added to your cart.",
      });
    } catch (error: any) {
      toast({
        title: "Error adding to cart",
        description: error.message || "Failed to add product to cart.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateStock = (productId: number) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      handleSelectProduct(product);
    }
  };

  const handleArchive = (productId: number) => {
    toast({
      title: "Archive Coming Soon",
      description: "Product archiving feature will be available soon.",
    });
  };

  const handleDelete = (productId: number) => {
    deleteProductMutation.mutate(productId);
  };

  // Image upload functions
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeImagePreview = () => {
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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

  // Tax calculation function: cost + tax% = new cost
  const calculateCostWithTax = (baseCost: number, taxPercentage: number) => {
    return baseCost * (1 + taxPercentage / 100);
  };

  // Profit margin calculation function - now considers tax as part of cost
  const calculateProfit = (salePrice: number, baseCost: number, taxPercentage: number = 0) => {
    if (salePrice === 0) return 0;
    const actualCost = calculateCostWithTax(baseCost, taxPercentage);
    if (actualCost === 0) return 0;
    return ((salePrice - actualCost) / actualCost) * 100;
  };

  // Handle tax percentage change and auto-calculate new cost
  const handleTaxPercentageChange = (taxPercentage: number, isNewProduct: boolean = false) => {
    if (isNewProduct) {
      const baseCost = newProductForm.cost;
      if (baseCost > 0 && taxPercentage > 0) {
        const newCost = calculateCostWithTax(baseCost, taxPercentage);
        setNewProductForm(prev => ({
          ...prev,
          taxPercentage,
          price: parseFloat(newCost.toFixed(2)) // Update sale price to new cost + tax
        }));
      } else {
        setNewProductForm(prev => ({
          ...prev,
          taxPercentage
        }));
      }
    } else {
      const baseCost = productForm.cost;
      if (baseCost > 0 && taxPercentage > 0) {
        const newCost = calculateCostWithTax(baseCost, taxPercentage);
        setProductForm(prev => ({
          ...prev,
          taxPercentage,
          price: parseFloat(newCost.toFixed(2)) // Update sale price to new cost + tax
        }));
      } else {
        setProductForm(prev => ({
          ...prev,
          taxPercentage
        }));
      }
    }
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

        {/* Draft/Live Management Tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Eye className="mr-2 h-5 w-5" />
              Product Status Management
            </CardTitle>
            <CardDescription>
              Switch between viewing all products, only live products visible to customers, or draft products
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={viewMode} onValueChange={(value) => setViewMode(value as 'all' | 'live' | 'draft')}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="all" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  All Products ({products.length})
                </TabsTrigger>
                <TabsTrigger value="live" className="flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  Live Products
                </TabsTrigger>
                <TabsTrigger value="draft" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Draft Products
                </TabsTrigger>
              </TabsList>
            </Tabs>
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
                {filteredAndSortedProducts.map((product) => (
                  <Card key={product.id} className="border border-gray-200 hover:shadow-md transition-shadow overflow-hidden">
                    <CardContent className="p-0">
                      {/* Large Image Section */}
                      <div className="relative h-32 bg-gray-100 overflow-hidden">
                        {product.imageUrl ? (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name}
                            className="w-full h-full object-contain"
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
                        
                        {/* Draft/Live Status Badge */}
                        <div className="absolute top-2 right-2">
                          {product.isDraft ? (
                            <span className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded-full flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Draft
                            </span>
                          ) : product.isVisible ? (
                            <span className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              Live
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Hidden
                            </span>
                          )}
                        </div>
                      </div>
                      
                      {/* Compact Content Section */}
                      <div className="p-3">
                        <div className="mb-2">
                          <h3 className="text-sm font-semibold text-gray-900 line-clamp-1 mb-1">{product.name || 'Unnamed Product'}</h3>
                          <div className="flex justify-between items-center">
                            <p className="text-xs text-gray-500">SKU: {product.sku || 'N/A'}</p>
                            <p className="text-xs text-gray-400">ID: {product.id}</p>
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            Added: {product.createdAt ? new Date(product.createdAt).toLocaleDateString() : 'Unknown'}
                            <span className="ml-2 text-gray-500">
                              by {product.createdByUsername || product.createdBy || 'Unknown'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center mb-3">
                          <div className="text-lg font-bold text-green-600">
                            ${(product.price || 0).toFixed(2)}
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
                        
                        {/* Product Actions - Quick Edit Button + Visibility Controls */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSelectProduct(product)}
                              className="flex items-center gap-1 bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200"
                            >
                              <Edit className="h-3 w-3" />
                              Edit
                            </Button>
                            <ProductActionsMenu
                              product={product}
                              onEdit={(product) => handleSelectProduct(product)}
                              onViewSalesAnalytics={() => handleViewAnalytics(product.id)}
                              onToggleFeatured={(productId, featured) => handleToggleFeatured(productId, featured)}
                              onViewPriceHistory={() => handleViewPriceHistory(product.id)}
                              onDuplicate={(product) => handleDuplicate(product)}
                              onAddToCart={() => handleAddToCart(product.id)}
                              onArchive={() => handleArchive(product.id)}
                              onDelete={() => handleDelete(product.id)}
                            />
                          </div>
                          
                          {/* Visibility Control Buttons */}
                          <div className="flex gap-1">
                            {product.isDraft ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateVisibilityMutation.mutate({
                                  productId: product.id,
                                  isDraft: false,
                                  isVisible: true
                                })}
                                disabled={updateVisibilityMutation.isPending}
                                className="flex-1 text-xs bg-green-50 text-green-600 hover:bg-green-100 border-green-200"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Make Live
                              </Button>
                            ) : product.isVisible ? (
                              <>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateVisibilityMutation.mutate({
                                    productId: product.id,
                                    isDraft: true,
                                    isVisible: false
                                  })}
                                  disabled={updateVisibilityMutation.isPending}
                                  className="flex-1 text-xs bg-amber-50 text-amber-600 hover:bg-amber-100 border-amber-200"
                                >
                                  <Clock className="h-3 w-3 mr-1" />
                                  Make Draft
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => updateVisibilityMutation.mutate({
                                    productId: product.id,
                                    isDraft: false,
                                    isVisible: false
                                  })}
                                  disabled={updateVisibilityMutation.isPending}
                                  className="flex-1 text-xs bg-gray-50 text-gray-600 hover:bg-gray-100 border-gray-200"
                                >
                                  Hide
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => updateVisibilityMutation.mutate({
                                  productId: product.id,
                                  isDraft: false,
                                  isVisible: true
                                })}
                                disabled={updateVisibilityMutation.isPending}
                                className="flex-1 text-xs bg-green-50 text-green-600 hover:bg-green-100 border-green-200"
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Make Live
                              </Button>
                            )}
                          </div>
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
                    <div className="relative">
                      <Input
                        id="new-sku"
                        name="sku"
                        value={newProductForm.sku}
                        onChange={handleNewProductChange}
                        onKeyDown={(e) => {
                          // Prevent form submission when Enter is pressed (barcode scanner auto-submits)
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            e.stopPropagation();
                          }
                        }}
                        placeholder="Enter SKU or scan barcode"
                        className={newProductForm.sku && checkSkuDuplicate(newProductForm.sku) ? 
                          "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
                        required
                      />
                      {newProductForm.sku && checkSkuDuplicate(newProductForm.sku) && (
                        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                          <span className="text-red-500 text-sm">⚠️</span>
                        </div>
                      )}
                    </div>
                    {newProductForm.sku && checkSkuDuplicate(newProductForm.sku) && (
                      <p className="text-sm text-red-600">
                        SKU "{newProductForm.sku}" already exists. Please use a different SKU.
                      </p>
                    )}
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
                    <Label htmlFor="new-cost">Cost Price</Label>
                    <Input
                      id="new-cost"
                      name="cost"
                      type="number"
                      step="0.01"
                      value={newProductForm.cost}
                      onChange={handleNewProductChange}
                      placeholder="0.00"
                    />
                    <p className="text-xs text-gray-500">What you pay for this product</p>
                    {newProductForm.cost > 0 && newProductForm.taxPercentage > 0 && (
                      <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                        <div className="font-medium">Cost + Tax: ${calculateCostWithTax(newProductForm.cost, newProductForm.taxPercentage).toFixed(2)}</div>
                        <div className="text-blue-500">Use this as your minimum selling price</div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new-price">Sale Price *</Label>
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
                    <p className="text-xs text-gray-500">Main selling price to customers</p>
                  </div>
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
                    className="w-full md:w-1/2"
                  />
                </div>
                
                {/* Tax Percentage Section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <Label htmlFor="new-tax-percentage">Tax Percentage (%)</Label>
                      <Input
                        id="new-tax-percentage"
                        name="taxPercentage"
                        type="number"
                        step="0.01"
                        value={newProductForm.taxPercentage}
                        onChange={handleNewProductChange}
                        placeholder="0.00"
                        min="0"
                        max="100"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Add tax percentage to base cost to calculate new cost for pricing
                      </p>
                    </div>
                    {newProductForm.cost > 0 && newProductForm.taxPercentage > 0 && (
                      <div className="text-sm bg-blue-50 p-3 rounded border">
                        <div className="font-medium text-blue-900">Tax Calculation:</div>
                        <div className="text-blue-700 space-y-1">
                          <div>Base Cost: ${newProductForm.cost.toFixed(2)}</div>
                          <div>Tax ({newProductForm.taxPercentage}%): ${(calculateCostWithTax(newProductForm.cost, newProductForm.taxPercentage) - newProductForm.cost).toFixed(2)}</div>
                          <div className="font-medium border-t pt-1">
                            New Cost: ${calculateCostWithTax(newProductForm.cost, newProductForm.taxPercentage).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Customer Level Pricing */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-3">Customer Tier Pricing (Optional)</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="new-price1">Level 1 Price</Label>
                      <Input
                        id="new-price1"
                        name="price1"
                        type="number"
                        step="0.01"
                        value={newProductForm.price1}
                        onChange={handleNewProductChange}
                        placeholder="0.00"
                      />
                      <p className="text-xs text-gray-500">New customers</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="new-price2">Level 2 Price</Label>
                      <Input
                        id="new-price2"
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
                      <Label htmlFor="new-price3">Level 3 Price</Label>
                      <Input
                        id="new-price3"
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
                      <Label htmlFor="new-price4">Level 4 Price</Label>
                      <Input
                        id="new-price4"
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
                      <Label htmlFor="new-price5">Level 5 Price</Label>
                      <Input
                        id="new-price5"
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

                {/* Flat Taxes Section */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-3">Flat Tax Assignment</h4>
                  <p className="text-xs text-gray-500 mb-3">Select which flat taxes should be applied to this product</p>
                  {flatTaxes.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {flatTaxes.map((tax) => (
                        <div key={tax.id} className="flex items-start space-x-2">
                          <input
                            type="checkbox"
                            id={`new-flat-tax-${tax.id}`}
                            checked={newProductForm.flatTaxIds.some(id => String(id) === String(tax.id))}
                            onChange={(e) => handleFlatTaxChange(tax.id.toString(), e.target.checked)}
                            className="mt-1"
                          />
                          <div className="flex-1">
                            <label 
                              htmlFor={`new-flat-tax-${tax.id}`}
                              className="text-sm font-medium cursor-pointer"
                            >
                              {tax.name}
                            </label>
                            <div className="text-xs text-gray-500">
                              {tax.taxType === 'percentage' ? `${tax.taxAmount || 0}%` : `$${(tax.taxAmount || 0).toFixed(2)}`}
                              {tax.countyRestriction && ` • ${tax.countyRestriction}`}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
                      No flat taxes available. Create them in the Tax Management section first.
                    </div>
                  )}
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
                </div>

                {/* Draft/Live Status Controls */}
                <div className="border-t pt-4">
                  <h4 className="text-sm font-semibold mb-3">Product Status & Visibility</h4>
                  <p className="text-xs text-gray-500 mb-3">Control whether this product is visible to customers or saved as a draft</p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="new-isDraft"
                        checked={newProductForm.isDraft}
                        onChange={(e) => setNewProductForm(prev => ({
                          ...prev,
                          isDraft: e.target.checked,
                          isVisible: e.target.checked ? false : prev.isVisible
                        }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <Label htmlFor="new-isDraft" className="text-sm">
                        Save as Draft (not visible to customers)
                      </Label>
                    </div>
                    
                    {!newProductForm.isDraft && (
                      <div className="flex items-center space-x-3 ml-6">
                        <input
                          type="checkbox"
                          id="new-isVisible"
                          checked={newProductForm.isVisible}
                          onChange={(e) => setNewProductForm(prev => ({
                            ...prev,
                            isVisible: e.target.checked
                          }))}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <Label htmlFor="new-isVisible" className="text-sm">
                          Make visible to customers immediately
                        </Label>
                      </div>
                    )}
                    
                    <div className="text-xs text-gray-400 bg-gray-50 p-2 rounded">
                      {newProductForm.isDraft 
                        ? "📝 This product will be saved as a draft. You can make it live later from the product management interface."
                        : newProductForm.isVisible 
                          ? "👁️ This product will be immediately visible to customers in the catalog."
                          : "🔒 This product will be saved but hidden from customers until you make it visible."
                      }
                    </div>
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
              Update product details and pricing information (Product ID: {selectedProduct?.id})
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={(e) => {
            e.preventDefault();
            updateProductMutation.mutate();
          }} onKeyDown={(e) => {
            // Submit form when Enter is pressed (except for specific inputs like SKU and textarea)
            if (e.key === 'Enter' && !e.shiftKey) {
              const target = e.target as HTMLElement;
              if (target.tagName !== 'TEXTAREA' && target.getAttribute('name') !== 'sku' && target.getAttribute('name') !== 'description') {
                e.preventDefault();
                updateProductMutation.mutate();
              }
            }
          }}>
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
                  <div className="relative">
                    <Input
                      id="edit-sku"
                      name="sku"
                      value={productForm.sku}
                      onChange={handleInputChange}
                      onKeyDown={(e) => {
                        // Prevent form submission when Enter is pressed (barcode scanner auto-submits)
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                        }
                      }}
                      placeholder="Enter SKU or scan barcode"
                      className={productForm.sku && checkSkuDuplicate(productForm.sku, selectedProduct?.id) ? 
                        "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
                      required
                    />
                    {productForm.sku && checkSkuDuplicate(productForm.sku, selectedProduct?.id) && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        <span className="text-red-500 text-sm">⚠️</span>
                      </div>
                    )}
                  </div>
                  {productForm.sku && checkSkuDuplicate(productForm.sku, selectedProduct?.id) && (
                    <p className="text-sm text-red-600">
                      SKU "{productForm.sku}" already exists. Please use a different SKU.
                    </p>
                  )}
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
                  <Label htmlFor="edit-price">Main Sale Price *</Label>
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
                  {productForm.cost > 0 && productForm.price > 0 && (
                    <div className="text-xs text-gray-500 space-y-1">
                      <div className="flex items-center gap-1">
                        <span>Cost + Tax: ${calculateCostWithTax(productForm.cost, productForm.taxPercentage).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span>Profit: ${(productForm.price - calculateCostWithTax(productForm.cost, productForm.taxPercentage)).toFixed(2)}</span>
                        <span className={`px-1 py-0.5 rounded text-xs ${
                          calculateProfit(productForm.price, productForm.cost, productForm.taxPercentage) >= 20
                            ? 'bg-green-100 text-green-700'
                            : calculateProfit(productForm.price, productForm.cost, productForm.taxPercentage) >= 10
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                        }`}>
                          {calculateProfit(productForm.price, productForm.cost, productForm.taxPercentage).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-cost">Cost Price (Base)</Label>
                  <Input
                    id="edit-cost"
                    name="cost"
                    type="number"
                    step="0.01"
                    value={productForm.cost}
                    onChange={handleInputChange}
                    placeholder="0.00"
                  />
                  {productForm.cost > 0 && productForm.taxPercentage > 0 && (
                    <div className="text-xs text-blue-600 bg-blue-50 p-2 rounded">
                      <div className="font-medium">Cost + Tax: ${calculateCostWithTax(productForm.cost, productForm.taxPercentage).toFixed(2)}</div>
                      <div className="text-blue-500">Use this as your minimum selling price</div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Tax Percentage Section */}
              <div className="space-y-2">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label htmlFor="edit-tax-percentage">Tax Percentage (%)</Label>
                    <Input
                      id="edit-tax-percentage"
                      name="taxPercentage"
                      type="number"
                      step="0.01"
                      value={productForm.taxPercentage}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      min="0"
                      max="100"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Add tax percentage to base cost to calculate new cost for pricing
                    </p>
                  </div>
                  {productForm.cost > 0 && productForm.taxPercentage > 0 && (
                    <div className="text-sm bg-blue-50 p-3 rounded border">
                      <div className="font-medium text-blue-900">Tax Calculation:</div>
                      <div className="text-blue-700 space-y-1">
                        <div>Base Cost: ${productForm.cost.toFixed(2)}</div>
                        <div>Tax ({productForm.taxPercentage}%): ${(calculateCostWithTax(productForm.cost, productForm.taxPercentage) - productForm.cost).toFixed(2)}</div>
                        <div className="font-medium border-t pt-1">
                          New Cost: ${calculateCostWithTax(productForm.cost, productForm.taxPercentage).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Customer Tier Pricing</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                    {productForm.cost > 0 && productForm.price1 > 0 && (
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <span>Profit: ${(productForm.price1 - calculateCostWithTax(productForm.cost, productForm.taxPercentage)).toFixed(2)}</span>
                        <span className={`px-1 py-0.5 rounded text-xs ${
                          calculateProfit(productForm.price1, productForm.cost, productForm.taxPercentage) >= 20
                            ? 'bg-green-100 text-green-700'
                            : calculateProfit(productForm.price1, productForm.cost, productForm.taxPercentage) >= 10
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                        }`}>
                          {calculateProfit(productForm.price1, productForm.cost, productForm.taxPercentage).toFixed(1)}%
                        </span>
                      </div>
                    )}
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
                    {productForm.cost > 0 && productForm.price2 > 0 && (
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <span>Profit: ${(productForm.price2 - calculateCostWithTax(productForm.cost, productForm.taxPercentage)).toFixed(2)}</span>
                        <span className={`px-1 py-0.5 rounded text-xs ${
                          calculateProfit(productForm.price2, productForm.cost, productForm.taxPercentage) >= 20
                            ? 'bg-green-100 text-green-700'
                            : calculateProfit(productForm.price2, productForm.cost, productForm.taxPercentage) >= 10
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                        }`}>
                          {calculateProfit(productForm.price2, productForm.cost, productForm.taxPercentage).toFixed(1)}%
                        </span>
                      </div>
                    )}
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
                    {productForm.cost > 0 && productForm.price3 > 0 && (
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <span>Profit: ${(productForm.price3 - calculateCostWithTax(productForm.cost, productForm.taxPercentage)).toFixed(2)}</span>
                        <span className={`px-1 py-0.5 rounded text-xs ${
                          calculateProfit(productForm.price3, productForm.cost, productForm.taxPercentage) >= 20
                            ? 'bg-green-100 text-green-700'
                            : calculateProfit(productForm.price3, productForm.cost, productForm.taxPercentage) >= 10
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                        }`}>
                          {calculateProfit(productForm.price3, productForm.cost, productForm.taxPercentage).toFixed(1)}%
                        </span>
                      </div>
                    )}
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
                    {productForm.cost > 0 && productForm.price4 > 0 && (
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <span>Profit: ${(productForm.price4 - calculateCostWithTax(productForm.cost, productForm.taxPercentage)).toFixed(2)}</span>
                        <span className={`px-1 py-0.5 rounded text-xs ${
                          calculateProfit(productForm.price4, productForm.cost, productForm.taxPercentage) >= 20
                            ? 'bg-green-100 text-green-700'
                            : calculateProfit(productForm.price4, productForm.cost, productForm.taxPercentage) >= 10
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                        }`}>
                          {calculateProfit(productForm.price4, productForm.cost, productForm.taxPercentage).toFixed(1)}%
                        </span>
                      </div>
                    )}
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
                    {productForm.cost > 0 && productForm.price5 > 0 && (
                      <div className="text-xs text-gray-500 flex items-center gap-1">
                        <span>Profit: ${(productForm.price5 - calculateCostWithTax(productForm.cost, productForm.taxPercentage)).toFixed(2)}</span>
                        <span className={`px-1 py-0.5 rounded text-xs ${
                          calculateProfit(productForm.price5, productForm.cost, productForm.taxPercentage) >= 20
                            ? 'bg-green-100 text-green-700'
                            : calculateProfit(productForm.price5, productForm.cost, productForm.taxPercentage) >= 10
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-red-100 text-red-700'
                        }`}>
                          {calculateProfit(productForm.price5, productForm.cost, productForm.taxPercentage).toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Product Settings</Label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="edit-featured"
                    name="featured"
                    checked={productForm.featured || false}
                    onChange={(e) => setProductForm(prev => ({
                      ...prev,
                      featured: e.target.checked
                    }))}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <Label htmlFor="edit-featured" className="text-sm">
                    Feature this product in recommendations
                  </Label>
                </div>
              </div>

              {/* Flat Taxes Section */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold mb-3">Flat Tax Assignment</h4>
                <p className="text-xs text-gray-500 mb-3">Select which flat taxes should be applied to this product</p>
                {flatTaxes.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {flatTaxes.map((tax) => (
                      <div key={tax.id} className="flex items-start space-x-2">
                        <input
                          type="checkbox"
                          id={`edit-flat-tax-${tax.id}`}
                          checked={productForm.flatTaxIds.some(id => String(id) === String(tax.id))}
                          onChange={(e) => handleEditProductFlatTaxChange(tax.id.toString(), e.target.checked)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <label 
                            htmlFor={`edit-flat-tax-${tax.id}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            {tax.name}
                          </label>
                          <div className="text-xs text-gray-500">
                            {tax.taxType === 'percentage' ? `${tax.taxAmount || 0}%` : `$${(tax.taxAmount || 0).toFixed(2)}`}
                            {tax.countyRestriction && ` • ${tax.countyRestriction}`}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
                    No flat taxes available. Create them in the Tax Management section first.
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Image & Category Tab */}
            <TabsContent value="image" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Image Upload Section */}
                <div className="space-y-4">
                  <div className="border-t pt-4">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Camera className="mr-2 h-5 w-5" />
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
                              <Trash2 className="h-3 w-3 mr-1" />
                              Remove Preview
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Upload Options */}
                    <div className="space-y-3">
                      {/* File Upload */}
                      <div>
                        <Label className="text-sm font-medium mb-2 block">Upload from Device</Label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept="image/*"
                            className="hidden"
                            id="image-upload"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center space-x-2"
                          >
                            <Upload className="h-4 w-4" />
                            <span>Choose File</span>
                          </Button>
                          
                          {/* Camera Capture */}
                          <Button
                            type="button"
                            variant="outline"
                            onClick={isCameraActive ? stopCamera : startCamera}
                            className="flex items-center space-x-2"
                          >
                            <Camera className="h-4 w-4" />
                            <span>{isCameraActive ? 'Stop Camera' : 'Open Camera'}</span>
                          </Button>
                        </div>
                      </div>

                      {/* Camera Preview */}
                      {isCameraActive && (
                        <div className="mt-4">
                          <Label className="text-sm font-medium mb-2 block">Camera Preview</Label>
                          <div className="relative">
                            <video
                              ref={videoRef}
                              autoPlay
                              playsInline
                              className="w-full max-w-sm h-48 object-cover border border-gray-300 rounded-lg"
                            />
                            <Button
                              type="button"
                              onClick={capturePhoto}
                              className="mt-2 bg-blue-600 hover:bg-blue-700"
                            >
                              <Camera className="h-4 w-4 mr-2" />
                              Capture Photo
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Hidden canvas for photo capture */}
                      <canvas ref={canvasRef} className="hidden" />

                      {/* Upload Button */}
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
                              <Upload className="h-4 w-4 mr-2" />
                              Upload Image
                            </>
                          )}
                        </Button>
                      )}

                      {/* Manual URL Input */}
                      <div className="pt-4 border-t">
                        <Label htmlFor="edit-imageUrl" className="text-sm font-medium mb-2 block">
                          Or Enter Image URL
                        </Label>
                        <Input
                          id="edit-imageUrl"
                          name="imageUrl"
                          value={productForm.imageUrl}
                          onChange={handleInputChange}
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Category Selection */}
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
                      {categories.map((category) => (
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
              type="submit"
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
          </form>
        </DialogContent>
      </Dialog>

      {/* Price History Modal */}
      <Dialog open={!!selectedProductForHistory} onOpenChange={() => setSelectedProductForHistory(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
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
                  <p>Error loading price history: {priceHistoryError.message}</p>
                </div>
              ) : Array.isArray(priceHistory) && priceHistory.length > 0 ? (
                <div className="space-y-3">
                  {priceHistory.map((entry: any, index: number) => (
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
                            {(entry.oldPrice !== null && entry.newPrice !== null) && (
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
                            {(entry.oldCost !== null && entry.newCost !== null) && (
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
    </AppLayout>
  );
}