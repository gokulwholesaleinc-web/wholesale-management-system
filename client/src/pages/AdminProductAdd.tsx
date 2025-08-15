import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/layout/AppLayout';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Save, RefreshCw, Camera } from 'lucide-react';
import BarcodeScanner from '@/components/BarcodeScanner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface Category {
  id: number;
  name: string;
  description: string;
}

interface ProductFormData {
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

export default function AdminProductAdd() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<ProductFormData>({
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

  const [showScanner, setShowScanner] = useState(false);
  
  // Set price1 equal to price and calculate other tiers
  useEffect(() => {
    if (formData.price > 0) {
      const newPrice1 = formData.price;
      setFormData({
        ...formData,
        price1: newPrice1,
        price2: parseFloat((newPrice1 * 0.975).toFixed(2)), // 2.5% discount
        price3: parseFloat((newPrice1 * 0.95).toFixed(2)),  // 5% discount
        price4: parseFloat((newPrice1 * 0.925).toFixed(2)), // 7.5% discount
        price5: parseFloat((newPrice1 * 0.90).toFixed(2))   // 10% discount
      });
    }
  }, [formData.price]);
  
  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['/api/categories'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/categories');
      return response as Category[];
    }
  });
  
  // Create a new product
  const createProductMutation = useMutation({
    mutationFn: async (productData: ProductFormData) => {
      return await apiRequest('POST', '/api/admin/products', productData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      toast({
        title: "Product Created",
        description: "The product has been successfully added to your inventory.",
      });
      // Stay on products page for better workflow
      setLocation('/admin/products');
    },
    onError: (error: any) => {
      toast({
        title: "Error Creating Product",
        description: error.message || "There was an error adding the product. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    setFormData({
      ...formData,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
    });
  };
  
  const handleCategoryChange = (value: string) => {
    setFormData({
      ...formData,
      categoryId: parseInt(value)
    });
  };
  
  const handleFeaturedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      featured: e.target.checked
    });
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProductMutation.mutate(formData);
  };

  const handleBarcodeScanned = (code: string) => {
    setFormData({
      ...formData,
      sku: code
    });
    setShowScanner(false);
    toast({
      title: "Barcode Scanned",
      description: `SKU set to: ${code}`,
    });
  };
  
  // Redirect if not an admin
  if (!isLoading && (!user || !user.isAdmin)) {
    return (
      <AppLayout title="Unauthorized">
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
          <AlertCircle className="w-16 h-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-center mb-2">Admin Access Required</h1>
          <p className="text-gray-600 text-center mb-6">You need administrator privileges to access this page.</p>
          <Button asChild>
            <a href="/">Return to Dashboard</a>
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Add Product">
      <div className="container px-4 py-6 mx-auto max-w-4xl">
        <h1 className="text-3xl font-bold mb-6">Add New Product</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Product Information</CardTitle>
            <CardDescription>Enter the details for the new product</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input 
                    id="name" 
                    name="name" 
                    value={formData.name} 
                    onChange={handleChange} 
                    placeholder="Enter product name" 
                    required 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="sku">SKU / UPC Code</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="sku" 
                      name="sku" 
                      value={formData.sku} 
                      onChange={handleChange} 
                      placeholder="Enter product SKU or UPC code" 
                      className="flex-1"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon"
                      onClick={() => {
                        console.log('[AdminProductAdd] Camera button clicked, opening barcode scanner');
                        setShowScanner(true);
                      }}
                      title="Scan Barcode"
                      className="flex-shrink-0"
                    >
                      <Camera className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  name="description" 
                  value={formData.description} 
                  onChange={handleChange} 
                  placeholder="Enter product description" 
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    onValueChange={handleCategoryChange} 
                    value={formData.categoryId?.toString() || ""}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="stock">Stock Quantity</Label>
                  <Input 
                    id="stock" 
                    name="stock" 
                    type="number" 
                    value={formData.stock} 
                    onChange={handleChange} 
                    min="0" 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="basePrice">Base Cost ($)</Label>
                  <Input 
                    id="basePrice" 
                    name="basePrice" 
                    type="number" 
                    value={formData.basePrice} 
                    onChange={handleChange} 
                    step="0.01" 
                    min="0" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="price">Retail Price ($) *</Label>
                  <Input 
                    id="price" 
                    name="price" 
                    type="number" 
                    value={formData.price} 
                    onChange={handleChange} 
                    step="0.01" 
                    min="0" 
                    required 
                  />
                </div>
              </div>
              
              <h3 className="text-lg font-semibold pt-2">Tier Pricing</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price1">Tier 1 Price ($)</Label>
                  <Input 
                    id="price1" 
                    name="price1" 
                    type="number" 
                    value={formData.price1} 
                    onChange={handleChange} 
                    step="0.01" 
                    min="0" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="price2">Tier 2 Price ($)</Label>
                  <Input 
                    id="price2" 
                    name="price2" 
                    type="number" 
                    value={formData.price2} 
                    onChange={handleChange} 
                    step="0.01" 
                    min="0" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="price3">Tier 3 Price ($)</Label>
                  <Input 
                    id="price3" 
                    name="price3" 
                    type="number" 
                    value={formData.price3} 
                    onChange={handleChange} 
                    step="0.01" 
                    min="0" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="price4">Tier 4 Price ($)</Label>
                  <Input 
                    id="price4" 
                    name="price4" 
                    type="number" 
                    value={formData.price4} 
                    onChange={handleChange} 
                    step="0.01" 
                    min="0" 
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="price5">Tier 5 Price ($)</Label>
                  <Input 
                    id="price5" 
                    name="price5" 
                    type="number" 
                    value={formData.price5} 
                    onChange={handleChange} 
                    step="0.01" 
                    min="0" 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="imageUrl">Image URL</Label>
                  <Input 
                    id="imageUrl" 
                    name="imageUrl" 
                    value={formData.imageUrl} 
                    onChange={handleChange} 
                    placeholder="Enter image URL for the product" 
                  />
                  <p className="text-xs text-gray-500">
                    You can also add/edit images after creating the product
                  </p>
                </div>
                
                <div className="flex items-center space-x-2 h-full pt-6">
                  <input
                    type="checkbox"
                    id="featured"
                    name="featured"
                    checked={formData.featured}
                    onChange={handleFeaturedChange}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                  <Label htmlFor="featured" className="cursor-pointer">Feature this product</Label>
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex justify-between">
              <Button variant="outline" type="button" onClick={() => setLocation('/admin')}>
                Cancel
              </Button>
              <Button type="submit" disabled={createProductMutation.isPending}>
                {createProductMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Product
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          onScanResult={handleBarcodeScanned}
          onClose={() => setShowScanner(false)}
          isOpen={showScanner}
        />
      )}
    </AppLayout>
  );
}