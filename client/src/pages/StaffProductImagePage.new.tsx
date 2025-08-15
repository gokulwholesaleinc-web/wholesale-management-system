import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'wouter';
import { AppLayout } from '@/layout/AppLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, ArrowLeft, Camera, Upload, Check, X, Image as ImageIcon, Trash2, Link as LinkIcon, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  price1: number;
  stock?: number;
  size?: string;
  imageUrl?: string;
}

export default function StaffProductImagePage() {
  const { id } = useParams();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState<boolean>(false);
  const [imageUrl, setImageUrl] = useState<string>('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  
  // Fetch product details
  const { data: product, isLoading } = useQuery<Product>({
    queryKey: [`/api/products/${id}`],
    enabled: !!id,
  });

  // Set initial values from product data
  useEffect(() => {
    if (product) {
      setImageUrl(product.imageUrl || '');
    }
  }, [product]);

  // Mutation for updating product image via file upload
  const updateImageMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      return await fetch(`/api/staff/products/${id}/image`, {
        method: 'POST',
        body: formData,
      });
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Product image has been updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: [`/api/products/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      
      // Reset selected file and preview
      setSelectedFile(null);
      setImagePreview(null);
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update product image',
        variant: 'destructive',
      });
    },
  });

  // Mutation for deleting a product
  const deleteProductMutation = useMutation({
    mutationFn: async () => {
      try {
        // Get token directly to ensure it's available
        const token = sessionStorage.getItem('authToken');
        if (!token) {
          throw new Error('Authentication token not found');
        }

        // Make a direct fetch request to ensure headers are set correctly
        const response = await fetch(`/api/staff/products/${id}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-auth-token': token
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Error deleting product: ${response.status}`, errorText);
          throw new Error(`Failed to delete product: ${response.status} ${errorText}`);
        }

        return await response.json();
      } catch (error) {
        console.error('Delete product error:', error);
        throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Product has been deleted successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      // Navigate back to products page
      navigate('/staff/products');
    },
    onError: (error) => {
      console.error('Product deletion error:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete product. Please try again or check your permissions.',
        variant: 'destructive',
      });
    },
  });

  // Handle file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImagePreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle file upload submit
  const handleFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile) {
      toast({
        title: 'Error',
        description: 'Please select an image file',
        variant: 'destructive',
      });
      return;
    }
    
    const formData = new FormData();
    formData.append('image', selectedFile);
    updateImageMutation.mutate(formData);
  };

  // Handle URL submit
  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!imageUrl.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter an image URL',
        variant: 'destructive',
      });
      return;
    }
    
    // Get token directly to ensure it's available
    const token = sessionStorage.getItem('authToken');
    
    // Use direct fetch for image URL update - more reliable
    fetch(`/api/staff/products/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : '',
        'x-auth-token': token || ''
      },
      body: JSON.stringify({ imageUrl: imageUrl.trim() })
    })
    .then(response => {
      if (!response.ok) {
        return response.json().then(data => {
          throw new Error(data.message || "Failed to update image URL");
        });
      }
      return response.json();
    })
    .then(data => {
      toast({
        title: 'Success',
        description: 'Product image URL has been updated successfully',
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: [`/api/products/${id}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      
      // Force refresh the page to show updated image
      setTimeout(() => {
        window.location.reload();
      }, 500);
    })
    .catch(error => {
      console.error('Image URL update error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update product image URL',
        variant: 'destructive',
      });
    });
  };
  
  // Handle product deletion
  const handleDeleteProduct = () => {
    deleteProductMutation.mutate();
  };
  
  // Start camera
  const startCamera = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraStream(stream);
          setShowCamera(true);
        }
      } else {
        toast({
          title: 'Error',
          description: 'Camera not supported in your browser',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: 'Error',
        description: 'Unable to access camera',
        variant: 'destructive',
      });
    }
  };
  
  // Stop camera
  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
    setShowCamera(false);
  };
  
  // Capture photo
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `product-${id}-photo.jpg`, { type: 'image/jpeg' });
            setSelectedFile(file);
            setImagePreview(canvas.toDataURL('image/jpeg'));
            stopCamera();
          }
        }, 'image/jpeg', 0.95);
      }
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }
    };
  }, [cameraStream]);

  const handleGoBack = () => {
    navigate('/staff/products');
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="container mx-auto py-6">
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!product) {
    return (
      <AppLayout>
        <div className="container mx-auto py-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600">Product Not Found</h2>
            <p className="mt-2">The product you're looking for doesn't exist or you don't have permission to view it.</p>
            <Button className="mt-4" onClick={handleGoBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Products
            </Button>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="container mx-auto py-6 px-4">
        <Button variant="outline" className="mb-4" onClick={handleGoBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Products
        </Button>
        
        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="flex items-center">
                  <ImageIcon className="h-5 w-5 mr-2" />
                  Product Image Manager
                </CardTitle>
                <CardDescription>{product.name}</CardDescription>
              </div>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => setDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Product
              </Button>
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-6">
              {/* Product Details (View-Only) */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Product Details</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Product Name</h4>
                      <p className="mt-1">{product.name}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Price</h4>
                      <p className="mt-1">${product.price.toFixed(2)}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-gray-500">Description</h4>
                    <p className="mt-1">{product.description || 'No description available'}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Stock</h4>
                      <p className="mt-1">{product.stock || 'Not specified'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500">Size</h4>
                      <p className="mt-1">{product.size || 'Not specified'}</p>
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded p-3 text-blue-700 text-sm">
                    <p>To update product details like price, name, or description, please use the main Products page.</p>
                    <p className="mt-1">This page is for image management only.</p>
                  </div>
                </div>
              </div>
              
              {/* Current Image Display */}
              <div>
                <h3 className="text-lg font-medium mb-4">Current Image</h3>
                <div className="border rounded p-4 flex items-center justify-center bg-gray-50 h-64">
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.name} 
                      className="max-h-full object-contain"
                    />
                  ) : (
                    <div className="flex flex-col items-center text-gray-400">
                      <ImageIcon className="h-16 w-16 mb-2" />
                      <p>No image available</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Image Upload Options */}
              <div>
                <h3 className="text-lg font-medium mb-4">Update Image</h3>
                <Tabs defaultValue="url" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="url">Image URL</TabsTrigger>
                    <TabsTrigger value="upload">Upload File</TabsTrigger>
                    <TabsTrigger value="camera">Take Photo</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="url" className="space-y-4 p-4 border rounded-md mt-2">
                    <form onSubmit={handleUrlSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="imageUrl">Image URL</Label>
                        <Input 
                          id="imageUrl" 
                          value={imageUrl} 
                          onChange={(e) => setImageUrl(e.target.value)} 
                          placeholder="https://example.com/image.jpg"
                        />
                      </div>
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={!imageUrl.trim()}
                      >
                        <LinkIcon className="h-4 w-4 mr-2" />
                        Update Image URL
                      </Button>
                    </form>
                  </TabsContent>
                  
                  <TabsContent value="upload" className="space-y-4 p-4 border rounded-md mt-2">
                    <form onSubmit={handleFileSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="imageFile">Image File</Label>
                        <Input 
                          id="imageFile" 
                          type="file" 
                          accept="image/*" 
                          onChange={handleFileChange}
                          ref={fileInputRef}
                          className="hidden"
                        />
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center cursor-pointer hover:border-gray-400 transition-colors"
                        >
                          <Upload className="h-8 w-8 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500">Click to select a file</p>
                          <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF up to 5MB</p>
                        </div>
                      </div>
                      
                      {selectedFile && !showCamera && (
                        <div className="space-y-2">
                          <Label>Selected File</Label>
                          <div className="text-sm bg-gray-50 p-2 rounded border">
                            {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                          </div>
                        </div>
                      )}
                      
                      <Button 
                        type="submit" 
                        className="w-full"
                        disabled={!selectedFile || updateImageMutation.isPending}
                      >
                        {updateImageMutation.isPending ? (
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
                    </form>
                  </TabsContent>
                  
                  <TabsContent value="camera" className="space-y-4 p-4 border rounded-md mt-2">
                    {!showCamera && !imagePreview ? (
                      <div className="space-y-4">
                        <div className="border-2 border-dashed border-gray-300 rounded-md p-6 flex flex-col items-center">
                          <Camera className="h-8 w-8 text-gray-400 mb-2" />
                          <p className="text-sm text-gray-500">Use your device camera to take a product photo</p>
                        </div>
                        <div className="flex justify-center">
                          <Button 
                            type="button" 
                            onClick={startCamera}
                          >
                            <Camera className="h-5 w-5 mr-2" />
                            Start Camera
                          </Button>
                        </div>
                      </div>
                    ) : showCamera ? (
                      <div className="space-y-4">
                        <div className="relative border rounded overflow-hidden bg-black">
                          <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline
                            className="w-full"
                          />
                          <canvas ref={canvasRef} className="hidden" />
                        </div>
                        <div className="flex justify-between">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={stopCamera}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                          <Button 
                            type="button" 
                            onClick={capturePhoto}
                          >
                            <Camera className="h-5 w-5 mr-2" />
                            Capture Photo
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3 mt-4">
                        <h3 className="text-md font-medium">Preview</h3>
                        <div className="border rounded p-4 flex justify-center bg-gray-50">
                          <img 
                            src={imagePreview || undefined} 
                            alt="Preview" 
                            className="max-h-64 object-contain"
                          />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button 
                            type="button" 
                            variant="outline" 
                            onClick={() => {
                              setSelectedFile(null);
                              setImagePreview(null);
                            }}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                          </Button>
                          <Button 
                            onClick={handleFileSubmit}
                            disabled={updateImageMutation.isPending}
                          >
                            {updateImageMutation.isPending ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Check className="h-4 w-4 mr-2" />
                                Use This Photo
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              Confirm Product Deletion
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{product.name}</span>? This action cannot be undone and will permanently remove the product from the inventory.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteProduct}
              className="bg-red-500 hover:bg-red-600"
            >
              {deleteProductMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Product
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}