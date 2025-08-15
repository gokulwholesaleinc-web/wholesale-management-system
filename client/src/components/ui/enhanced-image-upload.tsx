import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { 
  Camera, 
  Upload, 
  Smartphone, 
  Monitor, 
  Image as ImageIcon, 
  X, 
  CheckCircle,
  Loader2,
  FileImage
} from 'lucide-react';

interface EnhancedImageUploadProps {
  isOpen: boolean;
  onClose: () => void;
  onImageSelect: (file: File) => void;
  onImageCapture?: (imageData: string) => void;
  currentImageUrl?: string;
  isLoading?: boolean;
  title?: string;
  description?: string;
}

export function EnhancedImageUpload({
  isOpen,
  onClose,
  onImageSelect,
  onImageCapture,
  currentImageUrl,
  isLoading = false,
  title = "Upload Product Image",
  description = "Choose how you'd like to add an image"
}: EnhancedImageUploadProps) {
  const [uploadMethod, setUploadMethod] = useState<'select' | 'camera' | 'phone'>('select');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('image/')) {
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        onImageSelect(file);
      } else {
        toast({
          title: "Invalid file type",
          description: "Please select an image file (JPG, PNG, etc.)",
          variant: "destructive"
        });
      }
    }
  };

  const handlePhoneCapture = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      onImageSelect(file);
    }
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera access denied",
        description: "Please allow camera access to take photos",
        variant: "destructive"
      });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0);
        
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
            const url = URL.createObjectURL(file);
            setPreviewUrl(url);
            onImageSelect(file);
            stopCamera();
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };

  const resetUpload = () => {
    setPreviewUrl(null);
    setUploadMethod('select');
    stopCamera();
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (cameraInputRef.current) cameraInputRef.current.value = '';
  };

  const handleClose = () => {
    resetUpload();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            {title}
          </DialogTitle>
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </DialogHeader>

        {/* Current Image Preview */}
        {currentImageUrl && !previewUrl && (
          <Card className="mb-4">
            <CardHeader>
              <CardTitle className="text-sm">Current Image</CardTitle>
            </CardHeader>
            <CardContent>
              <img 
                src={currentImageUrl} 
                alt="Current product" 
                className="w-full h-32 object-cover rounded-lg"
              />
            </CardContent>
          </Card>
        )}

        {/* Upload Method Selection */}
        {!previewUrl && !isCameraActive && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Desktop File Upload */}
            <Card 
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <CardHeader className="text-center">
                <Monitor className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <CardTitle className="text-sm">Desktop Upload</CardTitle>
                <CardDescription className="text-xs">
                  Select from computer
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Phone Camera */}
            <Card 
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={() => cameraInputRef.current?.click()}
            >
              <CardHeader className="text-center">
                <Smartphone className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <CardTitle className="text-sm">Phone Camera</CardTitle>
                <CardDescription className="text-xs">
                  Take photo with phone
                </CardDescription>
              </CardHeader>
            </Card>

            {/* Live Camera */}
            <Card 
              className="cursor-pointer hover:bg-accent transition-colors"
              onClick={startCamera}
            >
              <CardHeader className="text-center">
                <Camera className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <CardTitle className="text-sm">Live Camera</CardTitle>
                <CardDescription className="text-xs">
                  Use device camera
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        )}

        {/* Camera View */}
        {isCameraActive && (
          <div className="space-y-4">
            <div className="relative">
              <video 
                ref={videoRef} 
                className="w-full h-64 bg-black rounded-lg"
                autoPlay 
                playsInline 
              />
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                <Button onClick={capturePhoto} size="lg" className="rounded-full">
                  <Camera className="h-5 w-5" />
                </Button>
                <Button onClick={stopCamera} variant="outline" size="lg" className="rounded-full">
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Preview */}
        {previewUrl && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Image Preview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="w-full h-48 object-cover rounded-lg"
                />
              </CardContent>
            </Card>
            
            <div className="flex justify-between">
              <Button variant="outline" onClick={resetUpload}>
                <X className="h-4 w-4 mr-2" />
                Choose Different Image
              </Button>
              <Button onClick={handleClose} disabled={isLoading}>
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                {isLoading ? 'Uploading...' : 'Confirm Upload'}
              </Button>
            </div>
          </div>
        )}

        {/* Hidden File Inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handlePhoneCapture}
          className="hidden"
        />
        
        {/* Hidden Canvas for Camera Capture */}
        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}