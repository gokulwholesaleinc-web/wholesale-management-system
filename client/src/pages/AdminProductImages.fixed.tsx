import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
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
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, Image, XCircle, CheckCircle, Camera, RefreshCw, Smartphone } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  description: string;
  imageUrl?: string;
  price: number;
  categoryId: number;
  sku?: string;
}

interface Category {
  id: number;
  name: string;
  departmentId: number;
}

export default function AdminProductImages() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);
  const [filter, setFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('url');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);

  // Fetch categories for filtering
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
  
  // Parse categories
  const categoryId = categoryFilter ? parseInt(categoryFilter) : null;

  // Fetch all products for admin image management
  const { 
    data: products = [], 
    isLoading: isLoadingProducts,
    refetch: refetchProducts,
    error
  } = useQuery<Product[]>({
    queryKey: ['/api/admin/products/images'], // Use the specialized endpoint
    // Always enabled since we have a dedicated endpoint for image management
    enabled: true,
  });
  
  // Log any errors for debugging
  useEffect(() => {
    if (error) {
      console.error("Error fetching products for image management:", error);
    }
  }, [error]);

  // Filter products by search term and category
  const filteredProducts = products
    .filter((product: Product) => 
      (categoryId === null || product.categoryId === categoryId) &&
      (filter === '' || 
        product.name.toLowerCase().includes(filter.toLowerCase()) ||
        product.description.toLowerCase().includes(filter.toLowerCase()) ||
        (product.sku && product.sku.toLowerCase().includes(filter.toLowerCase())))
    )
    .sort((a: Product, b: Product) => a.name.localeCompare(b.name));

  // Update product image URL mutation
  const updateImageMutation = useMutation({
    mutationFn: async () => {
      if (!selectedProduct || !imageUrl.trim()) {
        throw new Error("Product and image URL are required");
      }
      return await apiRequest('PATCH', `/api/admin/products/${selectedProduct}/image`, { imageUrl });
    },
    onSuccess: () => {
      toast({
        title: "Image updated successfully",
        description: "The product image has been updated.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setImageUrl('');
      setSelectedProduct(null);
      setImagePreview(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update image",
        description: error.message || "There was an error updating the product image.",
        variant: "destructive",
      });
    },
  });
  
  // Upload product image file mutation
  const uploadImageMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      if (!selectedProduct) {
        throw new Error("No product selected");
      }
      
      const response = await fetch(`/api/admin/products/${selectedProduct}/upload`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload image");
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Image uploaded successfully",
        description: "The product image has been uploaded and updated.",
        variant: "default",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      setSelectedProduct(null);
      setImagePreview(null);
      
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    },
    onError: (error: any) => {
      toast({
        title: "Failed to upload image",
        description: error.message || "There was an error uploading the product image.",
        variant: "destructive",
      });
    },
  });

  // Handle image update via URL
  const handleUpdateImage = (e: React.FormEvent) => {
    e.preventDefault();
    updateImageMutation.mutate();
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
    
    uploadImageMutation.mutate(formData);
  };

  // Handle clicking on a product row to select it
  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product.id);
    setImageUrl(product.imageUrl || '');
    setImagePreview(null);
    setCapturedImage(null);
    
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  // Start the camera when the camera tab is selected
  const startCamera = async () => {
    try {
      // Stop any existing stream
      if (cameraStream) {
        stopCamera();
      }
      
      // Request camera access - prefer the environment-facing camera on mobile
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: { ideal: 'environment' } },
        audio: false 
      });
      
      // Set the stream to the video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setCameraStream(stream);
      setIsCameraActive(true);
      setCapturedImage(null);
      
      toast({
        title: "Camera activated",
        description: "Your device's camera is now ready to use.",
      });
    } catch (error: any) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera access failed",
        description: error.message || "Couldn't access your camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };
  
  // Stop the camera
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setIsCameraActive(false);
  };
  
  // Capture an image from the video stream
  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw the current video frame to the canvas
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Convert canvas to data URL
      const imageDataUrl = canvas.toDataURL('image/jpeg');
      setCapturedImage(imageDataUrl);
    }
  };
  
  // Upload captured image
  const uploadCapturedImage = async () => {
    if (!capturedImage || !selectedProduct) {
      toast({
        title: "Upload failed",
        description: "Need both a captured image and selected product",
        variant: "destructive",
      });
      return;
    }
    
    try {
      // Convert the base64 data URL to a Blob
      const res = await fetch(capturedImage);
      const blob = await res.blob();
      
      // Create a File object from the Blob
      const file = new File([blob], `camera_capture_${Date.now()}.jpg`, { type: 'image/jpeg' });
      
      // Create FormData and append the file
      const formData = new FormData();
      formData.append('image', file);
      
      // Upload using the existing mutation
      uploadImageMutation.mutate(formData);
      
      // Reset camera state
      setCapturedImage(null);
    } catch (error: any) {
      toast({
        title: "Upload failed",
        description: error.message || "Failed to process and upload the captured image",
        variant: "destructive",
      });
    }
  };
  
  // Cleanup camera on tab change or component unmount
  useEffect(() => {
    if (activeTab !== 'camera' && cameraStream) {
      stopCamera();
    }
    
    return () => {
      stopCamera();
    };
  }, [activeTab]);

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
    <AppLayout title="Product Image Management" description="Admin panel for managing product images">
      <div className="container mx-auto px-4 py-8">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Update Product Images</CardTitle>
            <CardDescription>
              Select a product from the table below and update its image.
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Tabs defaultValue="url" onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="url">Image URL</TabsTrigger>
                <TabsTrigger value="upload">Upload Image</TabsTrigger>
                <TabsTrigger value="camera">Use Camera</TabsTrigger>
              </TabsList>
              
              <TabsContent value="url" className="mt-0">
                <form onSubmit={handleUpdateImage} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="product">Selected Product</Label>
                      <Input 
                        id="product" 
                        value={selectedProduct ? 
                          products.find((p: Product) => p.id === selectedProduct)?.name || 'Unknown product' 
                          : 'No product selected'
                        } 
                        disabled 
                      />
                    </div>
                    <div>
                      <Label htmlFor="imageUrl">Image URL</Label>
                      <Input 
                        id="imageUrl" 
                        value={imageUrl} 
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        disabled={!selectedProduct}
                      />
                    </div>
                  </div>
                  
                  {imageUrl && (
                    <div className="mt-4 flex justify-center">
                      <div className="border rounded-md overflow-hidden w-48 h-48 flex items-center justify-center bg-gray-50">
                        <img 
                          src={imageUrl} 
                          alt="Preview" 
                          className="max-w-full max-h-full object-contain" 
                          onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/150?text=Invalid+Image')}
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={!selectedProduct || !imageUrl.trim() || updateImageMutation.isPending}
                    >
                      {updateImageMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                          Updating...
                        </>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" /> 
                          Update Image URL
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="upload" className="mt-0">
                <form onSubmit={handleFileUpload} className="space-y-4">
                  <div>
                    <Label htmlFor="product-upload">Selected Product</Label>
                    <Input 
                      id="product-upload" 
                      value={selectedProduct ? 
                        products.find((p: Product) => p.id === selectedProduct)?.name || 'Unknown product' 
                        : 'No product selected'
                      } 
                      disabled 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="file-upload">Select Image File</Label>
                    <div className="flex items-center space-x-2">
                      <Input
                        id="file-upload"
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        onChange={handleFileChange}
                        disabled={!selectedProduct || uploadImageMutation.isPending}
                        className="flex-1"
                      />
                    </div>
                    <p className="text-xs text-gray-500">
                      Supported formats: JPG, PNG, GIF, WebP. Max file size: 5MB.
                    </p>
                  </div>
                  
                  {imagePreview && (
                    <div className="mt-4 flex justify-center">
                      <div className="border rounded-md overflow-hidden w-48 h-48 flex items-center justify-center bg-gray-50">
                        <img 
                          src={imagePreview} 
                          alt="Preview" 
                          className="max-w-full max-h-full object-contain" 
                        />
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={!selectedProduct || !fileInputRef.current?.files?.length || uploadImageMutation.isPending}
                    >
                      {uploadImageMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                          Uploading...
                        </>
                      ) : (
                        <>
                          <Camera className="mr-2 h-4 w-4" /> 
                          Upload Image
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </TabsContent>
              
              <TabsContent value="camera" className="mt-0">
                <form onSubmit={(e) => { e.preventDefault(); uploadCapturedImage(); }} className="space-y-4">
                  <div>
                    <Label htmlFor="product-camera">Selected Product</Label>
                    <Input 
                      id="product-camera" 
                      value={selectedProduct ? 
                        products.find((p: Product) => p.id === selectedProduct)?.name || 'Unknown product' 
                        : 'No product selected'
                      } 
                      disabled 
                    />
                  </div>
                  
                  <div className="space-y-4">
                    {!isCameraActive && !capturedImage && (
                      <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                        <Smartphone className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                        <p className="text-gray-600 mb-4">Tap the button below to access your device's camera</p>
                        <Button 
                          type="button" 
                          onClick={startCamera}
                          disabled={!selectedProduct}
                        >
                          <Camera className="mr-2 h-4 w-4" />
                          Open Camera
                        </Button>
                      </div>
                    )}
                    
                    {isCameraActive && !capturedImage && (
                      <div className="space-y-3">
                        <div className="relative overflow-hidden rounded-lg border bg-black aspect-[4/3] flex items-center justify-center">
                          <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline
                            className="max-w-full max-h-full"
                          />
                          <canvas ref={canvasRef} className="hidden" />
                        </div>
                        
                        <div className="flex justify-center space-x-3">
                          <Button 
                            type="button" 
                            variant="default" 
                            onClick={captureImage}
                          >
                            <Camera className="mr-2 h-4 w-4" />
                            Capture Photo
                          </Button>
                          <Button 
                            type="button" 
                            variant="secondary" 
                            onClick={stopCamera}
                          >
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancel
                          </Button>
                        </div>
                        
                        <p className="text-xs text-center text-gray-500 italic">
                          Position your product in good lighting for the best quality image
                        </p>
                      </div>
                    )}
                    
                    {capturedImage && (
                      <div className="space-y-3">
                        <div className="border rounded-md overflow-hidden w-full max-w-md mx-auto flex items-center justify-center bg-gray-50">
                          <img 
                            src={capturedImage} 
                            alt="Captured" 
                            className="max-w-full max-h-[300px] object-contain" 
                          />
                        </div>
                        
                        <div className="flex justify-center space-x-3">
                          <Button 
                            type="submit" 
                            disabled={uploadImageMutation.isPending}
                          >
                            {uploadImageMutation.isPending ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Upload className="mr-2 h-4 w-4" /> 
                                Upload Image
                              </>
                            )}
                          </Button>
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              setCapturedImage(null);
                              startCamera();
                            }}
                          >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Retake
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-500 mt-4 px-3 py-2 bg-gray-50 rounded-md">
                    <p className="font-medium mb-1">Tips for best results:</p>
                    <ul className="list-disc list-inside space-y-1 pl-2">
                      <li>Use good lighting - natural daylight works best</li>
                      <li>Keep the product centered in frame</li>
                      <li>Hold your device steady when capturing</li>
                      <li>Use a neutral background for clean product images</li>
                    </ul>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Product Listing</CardTitle>
            <CardDescription>
              Browse and manage product images. Click on a product to select it for updating.
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
                    {categories.map((category: Category) => (
                      <SelectItem key={category.id} value={category.id.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {isLoadingProducts ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              </div>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Image</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Image Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                          No products found matching your filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product: Product) => {
                        const category = categories.find((c: Category) => c.id === product.categoryId);
                        const hasImage = !!product.imageUrl && product.imageUrl.trim() !== '';
                        
                        return (
                          <TableRow 
                            key={product.id}
                            onClick={() => handleSelectProduct(product)}
                            className={selectedProduct === product.id ? 
                              "bg-blue-50 hover:bg-blue-100 cursor-pointer" : 
                              "hover:bg-gray-50 cursor-pointer"
                            }
                          >
                            <TableCell>
                              <div className="h-12 w-12 relative bg-gray-100 rounded-md overflow-hidden flex items-center justify-center">
                                {product.imageUrl ? (
                                  <img 
                                    src={product.imageUrl} 
                                    alt={product.name}
                                    className="h-full w-full object-contain" 
                                    onError={(e) => {
                                      e.currentTarget.src = 'https://via.placeholder.com/150?text=No+Image';
                                    }}
                                  />
                                ) : (
                                  <div className="text-center">
                                    <Image className="h-6 w-6 text-gray-400 mx-auto" />
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{product.name}</p>
                                <p className="text-sm text-gray-500 truncate max-w-[250px]">
                                  {product.description}
                                </p>
                              </div>
                            </TableCell>
                            <TableCell>{category?.name || 'Uncategorized'}</TableCell>
                            <TableCell>
                              {hasImage ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  <CheckCircle className="w-3 h-3 mr-1" /> Has image
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                  <XCircle className="w-3 h-3 mr-1" /> Missing image
                                </span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="text-sm text-gray-500">
              {filteredProducts.length} products found
            </div>
            <Button 
              variant="outline" 
              onClick={() => refetchProducts()}
              disabled={isLoadingProducts}
            >
              {isLoadingProducts ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="ml-2">Refresh</span>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </AppLayout>
  );
}
