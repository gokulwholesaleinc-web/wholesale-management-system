import React, { useRef, useEffect, useState } from 'react';
import { Camera, X, Flashlight, FlashlightOff, RotateCcw, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';

interface BarcodeScannerProps {
  onScanResult: (barcode: string) => void;
  onClose: () => void;
  isOpen: boolean;
}

export function BarcodeScanner({ onScanResult, onClose, isOpen }: BarcodeScannerProps) {
  const [manualCode, setManualCode] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const { toast } = useToast();

  // Start camera for barcode scanning with real detection
  const startCamera = async () => {
    try {
      setCameraError(null);
      setScanning(true);
      
      // Initialize ZXing barcode reader
      if (!readerRef.current) {
        readerRef.current = new BrowserMultiFormatReader();
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setShowCamera(true);
        
        // Start barcode detection
        startBarcodeDetection();
        
        toast({
          title: "Camera Ready",
          description: "Point your camera at a barcode to scan",
        });
      }
    } catch (error: any) {
      console.error('Camera access error:', error);
      setCameraError(error.message);
      setScanning(false);
      
      toast({
        title: "Camera Access Denied",
        description: "Please allow camera access to scan barcodes",
        variant: "destructive",
      });
    }
  };

  // Stop camera and barcode detection
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (readerRef.current) {
      readerRef.current.reset();
    }
    
    setShowCamera(false);
    setScanning(false);
  };

  // Real barcode detection using ZXing
  const startBarcodeDetection = async () => {
    if (!readerRef.current || !videoRef.current) return;
    
    try {
      await readerRef.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, err) => {
          if (result) {
            const barcodeText = result.getText();
            console.log('Barcode detected:', barcodeText);
            
            toast({
              title: "Barcode Detected!",
              description: `Found barcode: ${barcodeText}`,
            });
            
            onScanResult(barcodeText);
            stopCamera();
            onClose();
          }
          
          if (err && !(err instanceof NotFoundException)) {
            console.error('Barcode detection error:', err);
          }
        }
      );
    } catch (error) {
      console.error('Failed to start barcode detection:', error);
      setCameraError('Failed to initialize barcode scanner');
    }
  };

  // Clean up camera when component unmounts or closes
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const handleManualInput = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!manualCode.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a barcode number",
        variant: "destructive",
      });
      return;
    }

    onScanResult(manualCode.trim());
    setManualCode('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Barcode Scanner</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
        
        {/* Camera Scanner Section */}
        {!showCamera && (
          <div className="space-y-4 mb-6">
            <div className="text-center">
              <Button
                onClick={startCamera}
                disabled={scanning}
                className="w-full h-12"
                variant="default"
              >
                {scanning ? (
                  <>
                    <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                    Starting Camera...
                  </>
                ) : (
                  <>
                    <Camera className="mr-2 h-4 w-4" />
                    Start Camera Scan
                  </>
                )}
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                Use your phone camera to scan UPC barcodes
              </p>
            </div>

            {cameraError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">Camera Error: {cameraError}</p>
                <p className="text-xs text-red-500 mt-1">
                  Try manual entry below or check camera permissions
                </p>
              </div>
            )}
          </div>
        )}

        {/* Camera View */}
        {showCamera && (
          <div className="space-y-4 mb-6">
            <div className="relative">
              <video
                ref={videoRef}
                className="w-full h-64 object-cover rounded-lg bg-black"
                autoPlay
                playsInline
                muted
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="border-2 border-white w-48 h-24 rounded-lg opacity-50"></div>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={stopCamera}
                variant="outline"
                className="flex-1"
              >
                <X className="mr-2 h-4 w-4" />
                Stop Camera
              </Button>
            </div>
            
            <p className="text-xs text-center text-gray-500">
              Point camera at barcode - detection is automatic
            </p>
          </div>
        )}

        {/* Manual Entry Section */}
        <div className="border-t pt-4">
          <form onSubmit={handleManualInput} className="space-y-4">
            <div className="flex items-center space-x-2 text-sm text-gray-600 mb-3">
              <Keyboard className="h-4 w-4" />
              <span>Or enter barcode manually:</span>
            </div>
            
            <Input
              type="text"
              placeholder="Enter barcode number (UPC, EAN, etc.)"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              className="w-full"
              disabled={showCamera}
            />
            
            <div className="flex space-x-2">
              <Button
                type="submit"
                className="flex-1"
                disabled={!manualCode.trim() || showCamera}
                variant="outline"
              >
                Search Product
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  stopCamera();
                  onClose();
                }}
                className="px-4"
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Default export for compatibility
export default BarcodeScanner;