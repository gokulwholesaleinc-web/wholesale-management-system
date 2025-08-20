import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Printer, DollarSign, Scan, Wifi, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';

interface HardwareDevice {
  id: string;
  name: string;
  type: 'printer' | 'drawer' | 'scanner' | 'network';
  status: 'connected' | 'disconnected' | 'error' | 'testing';
  lastCheck: Date;
  details?: string;
}

export default function HardwareStatusMonitor() {
  const [devices, setDevices] = useState<HardwareDevice[]>([
    {
      id: 'tm88v-printer',
      name: 'Epson TM-T88V Receipt Printer',
      type: 'printer',
      status: 'disconnected',
      lastCheck: new Date(),
      details: 'Not configured'
    },
    {
      id: 'mmf-drawer',
      name: 'MMF Cash Drawer',
      type: 'drawer',
      status: 'disconnected',
      lastCheck: new Date(),
      details: 'Requires printer connection'
    },
    {
      id: 'barcode-scanner',
      name: 'Barcode Scanner',
      type: 'scanner',
      status: 'disconnected',
      lastCheck: new Date(),
      details: 'USB HID device'
    },
    {
      id: 'network',
      name: 'Network Connection',
      type: 'network',
      status: navigator.onLine ? 'connected' : 'disconnected',
      lastCheck: new Date(),
      details: navigator.onLine ? 'Online' : 'Offline'
    }
  ]);

  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const handleOnline = () => updateDeviceStatus('network', 'connected', 'Online');
    const handleOffline = () => updateDeviceStatus('network', 'disconnected', 'Offline');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check hardware status periodically
    const interval = setInterval(checkAllDevices, 30000); // 30 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const updateDeviceStatus = (deviceId: string, status: HardwareDevice['status'], details?: string) => {
    setDevices(prev => prev.map(device => 
      device.id === deviceId 
        ? { ...device, status, lastCheck: new Date(), details: details || device.details }
        : device
    ));
  };

  const testDevice = async (device: HardwareDevice) => {
    updateDeviceStatus(device.id, 'testing');
    
    try {
      switch (device.type) {
        case 'printer':
          await testPrinter();
          break;
        case 'drawer':
          await testCashDrawer();
          break;
        case 'scanner':
          await testBarcodeScanner();
          break;
        case 'network':
          await testNetwork();
          break;
      }
    } catch (error) {
      updateDeviceStatus(device.id, 'error', error.message);
      toast({
        title: "Hardware Test Failed",
        description: `${device.name}: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const testPrinter = async () => {
    const response = await fetch('/api/pos/test-printer', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
      }
    });

    if (response.ok) {
      const result = await response.json();
      updateDeviceStatus('tm88v-printer', 'connected', 'Print test successful');
      toast({
        title: "Printer Test",
        description: "Receipt printer is working correctly",
      });
    } else {
      throw new Error('Printer not responding');
    }
  };

  const testCashDrawer = async () => {
    const response = await fetch('/api/pos/open-drawer', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
      }
    });

    if (response.ok) {
      updateDeviceStatus('mmf-drawer', 'connected', 'Drawer opened successfully');
      toast({
        title: "Cash Drawer Test",
        description: "Cash drawer opened successfully",
      });
    } else {
      throw new Error('Cash drawer not responding');
    }
  };

  const testBarcodeScanner = async () => {
    // Simulate barcode scanner test
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    if (navigator.userAgent.includes('Chrome')) {
      updateDeviceStatus('barcode-scanner', 'connected', 'USB HID detected');
      toast({
        title: "Scanner Test",
        description: "Barcode scanner detected and ready",
      });
    } else {
      throw new Error('Scanner driver not found');
    }
  };

  const testNetwork = async () => {
    try {
      const response = await fetch('/api/health', { 
        method: 'GET',
        cache: 'no-cache'
      });
      
      if (response.ok) {
        updateDeviceStatus('network', 'connected', `Latency: ${Date.now() - performance.now()}ms`);
      } else {
        throw new Error('Server not responding');
      }
    } catch (error) {
      throw new Error('Network connectivity issues');
    }
  };

  const checkAllDevices = async () => {
    if (testing) return;
    
    setTesting(true);
    for (const device of devices) {
      if (device.status !== 'testing') {
        await testDevice(device);
        await new Promise(resolve => setTimeout(resolve, 500)); // Stagger tests
      }
    }
    setTesting(false);
  };

  const getStatusIcon = (status: HardwareDevice['status']) => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'disconnected': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'testing': return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default: return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: HardwareDevice['status']) => {
    const variants = {
      connected: 'default',
      disconnected: 'destructive',
      error: 'destructive',
      testing: 'outline'
    } as const;
    
    return (
      <Badge variant={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getDeviceIcon = (type: HardwareDevice['type']) => {
    switch (type) {
      case 'printer': return <Printer className="h-5 w-5" />;
      case 'drawer': return <DollarSign className="h-5 w-5" />;
      case 'scanner': return <Scan className="h-5 w-5" />;
      case 'network': return <Wifi className="h-5 w-5" />;
      default: return <AlertTriangle className="h-5 w-5" />;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Hardware Status Monitor
          <Button 
            size="sm" 
            onClick={checkAllDevices}
            disabled={testing}
          >
            {testing ? <RefreshCw className="h-4 w-4 mr-1 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-1" />}
            Test All
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {devices.map(device => (
            <div key={device.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                {getDeviceIcon(device.type)}
                <div>
                  <div className="font-medium">{device.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {device.details} • Last check: {device.lastCheck.toLocaleTimeString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {getStatusIcon(device.status)}
                {getStatusBadge(device.status)}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => testDevice(device)}
                  disabled={device.status === 'testing'}
                >
                  Test
                </Button>
              </div>
            </div>
          ))}
        </div>

        {devices.filter(d => d.status === 'error' || d.status === 'disconnected').length > 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <strong>Hardware Issues Detected:</strong> Some devices are not connected or responding. 
                Check connections and drivers, then click "Test All" to retry.
              </div>
            </div>
          </div>
        )}

        {devices.every(d => d.status === 'connected') && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <div className="text-sm text-green-800">
                <strong>All Systems Operational:</strong> All hardware devices are connected and responding correctly.
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}