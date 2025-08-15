import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AppLayout } from '@/layout/AppLayout';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Package, Plus, Upload, Camera } from 'lucide-react';
import BarcodeScanner from '@/components/BarcodeScanner';

// Product form schema - simplified for staff
const productSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  description: z.string().optional(),
  sku: z.string().optional(),
  price: z.number().min(0, 'Price must be a positive number'),
  categoryId: z.number().optional(),
  stock: z.number().min(0, 'Stock must be a positive number'),
  imageUrl: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function StaffAddProductPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  // Check if user has permission (staff or admin)
  const hasPermission = !!(user?.isAdmin || user?.is_admin || user?.isEmployee || user?.is_employee);

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/categories'],
    enabled: hasPermission,
  });

  // Fetch products for duplicate checking
  const { data: products = [] } = useQuery<any[]>({
    queryKey: ['/api/admin/products'],
    enabled: hasPermission,
  });

  // SKU duplicate check function
  const checkSkuDuplicate = (sku: string): boolean => {
    if (!sku.trim()) return false;
    return products.some(product => 
      product.sku?.toLowerCase() === sku.toLowerCase()
    );
  };

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      sku: '',
      price: 0,
      categoryId: undefined,
      stock: 0,
      imageUrl: '',
    },
  });

  // Add product mutation
  const addProductMutation = useMutation({
    mutationFn: async (productData: ProductFormData) => {
      // Check for duplicate SKU before submitting
      if (productData.sku && checkSkuDuplicate(productData.sku)) {
        throw new Error(`Product with SKU "${productData.sku}" already exists. Please use a different SKU.`);
      }
      
      // Use staff endpoint for product creation
      return await apiRequest('POST', '/api/staff/products', productData);
    },
    onSuccess: () => {
      toast({
        title: 'Product Added',
        description: 'New product has been successfully added to the inventory.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/staff/products'] });
      form.reset();
      setLocation('/staff/products');
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to Add Product',
        description: error.message || 'There was an error adding the product.',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = async (data: ProductFormData) => {
    setIsSubmitting(true);
    try {
      await addProductMutation.mutateAsync(data);
    } catch (error) {
      console.error('Error adding product:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle barcode scan result
  const handleBarcodeScan = (barcode: string) => {
    form.setValue('sku', barcode);
    setIsScannerOpen(false);
    toast({
      title: "Barcode Scanned",
      description: `SKU set to: ${barcode}`,
    });
  };

  if (!hasPermission) {
    return (
      <AppLayout title="Unauthorized">
        <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
          <Package className="w-16 h-16 text-red-500 mb-4" />
          <h1 className="text-2xl font-bold text-center mb-2">Staff Access Required</h1>
          <p className="text-gray-600 text-center mb-6">You need staff privileges to add products.</p>
          <Button onClick={() => setLocation('/')}>Return to Dashboard</Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Add New Product">
      <div className="container px-4 py-6 mx-auto max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            onClick={() => setLocation('/staff/dashboard')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Add New Product</h1>
            <p className="text-gray-600">Add a new product to the inventory</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              Product Information
            </CardTitle>
            <CardDescription>
              Fill in the details for the new product
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Product Name */}
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter product name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* SKU with Barcode Scanner */}
                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU / Barcode</FormLabel>
                        <FormControl>
                          <div className="flex gap-2">
                            <div className="flex-1 relative">
                              <Input 
                                placeholder="Enter SKU or scan barcode" 
                                {...field}
                                className={field.value && checkSkuDuplicate(field.value) ? 
                                  "border-red-500 focus:border-red-500 focus:ring-red-500" : ""}
                                onKeyDown={(e) => {
                                  // Prevent form submission when Enter is pressed (barcode scanner auto-submits)
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    e.stopPropagation();
                                  }
                                }}
                              />
                              {field.value && checkSkuDuplicate(field.value) && (
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                                  <span className="text-red-500 text-sm">⚠️</span>
                                </div>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => setIsScannerOpen(true)}
                              disabled={isSubmitting}
                            >
                              <Camera className="h-4 w-4" />
                            </Button>
                          </div>
                        </FormControl>
                        {field.value && checkSkuDuplicate(field.value) && (
                          <p className="text-sm text-red-600 mt-1">
                            SKU "{field.value}" already exists. Please use a different SKU.
                          </p>
                        )}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Price */}
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            {...field}
                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Stock */}
                  <FormField
                    control={form.control}
                    name="stock"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Stock Quantity *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="0"
                            {...field}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Category */}
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {categories
                              .sort((a: any, b: any) => a.name.localeCompare(b.name))
                              .map((category: any) => (
                                <SelectItem key={category.id} value={category.id.toString()}>
                                  {category.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Image URL */}
                  <FormField
                    control={form.control}
                    name="imageUrl"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Image URL</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter image URL" {...field} />
                        </FormControl>
                        <FormDescription>Optional: URL to product image</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Enter product description"
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Submit Buttons */}
                <div className="flex gap-4 pt-6">
                  <Button
                    type="submit"
                    disabled={isSubmitting || addProductMutation.isPending}
                    className="flex-1"
                  >
                    {isSubmitting || addProductMutation.isPending ? (
                      <>
                        <Upload className="w-4 h-4 mr-2 animate-spin" />
                        Adding Product...
                      </>
                    ) : (
                      <>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Product
                      </>
                    )}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setLocation('/staff/dashboard')}
                    disabled={isSubmitting || addProductMutation.isPending}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Barcode Scanner Component */}
        {isScannerOpen && (
          <BarcodeScanner
            onScan={handleBarcodeScan}
            onClose={() => setIsScannerOpen(false)}
            isOpen={isScannerOpen}
          />
        )}
      </div>
    </AppLayout>
  );
}