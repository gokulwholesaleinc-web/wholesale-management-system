import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Printer, 
  DollarSign, 
  Settings, 
  TestTube, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  Receipt
} from 'lucide-react';
import { printerService, type ReceiptData, type PrinterConfig } from '@/services/printerService';
import { useToast } from '@/hooks/use-toast';

interface PrinterControlsProps {
  orderData?: any;
  onPrintComplete?: (success: boolean) => void;
}

export function PrinterControls({ orderData, onPrintComplete }: PrinterControlsProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isTestingPrinter, setIsTestingPrinter] = useState(false);
  const [isOpeningDrawer, setIsOpeningDrawer] = useState(false);
  const [lastPrintResult, setLastPrintResult] = useState<{ success: boolean; method: string; message?: string } | null>(null);
  
  // Printer configuration
  const [config, setConfig] = useState<PrinterConfig>({
    printerName: 'EPSON',
    paperWidth: 42,
    cashdrawerPin: 'pin2',
    encoding: 'utf-8'
  });
  
  const { toast } = useToast();

  const handleTestPrinter = async () => {
    setIsTestingPrinter(true);
    try {
      const result = await printerService.testPrinter();
      setLastPrintResult({ 
        success: result.success, 
        method: result.success ? 'test' : 'failed',
        message: result.message 
      });
      setIsConnected(result.success);
      
      toast({
        title: result.success ? "Printer Test Successful" : "Printer Test Failed",
        description: result.message,
        variant: result.success ? "default" : "destructive"
      });
    } finally {
      setIsTestingPrinter(false);
    }
  };

  const handlePrintReceipt = async () => {
    if (!orderData) {
      toast({
        title: "No Order Selected",
        description: "Please select an order to print a receipt.",
        variant: "destructive"
      });
      return;
    }

    setIsPrinting(true);
    try {
      // Convert order data to receipt format
      const receiptData: ReceiptData = {
        storeName: "Gokul Wholesale",
        storeAddress: "1141 W Bryn Mawr Ave, Itasca, IL 60143",
        storePhone: "(630) 540-9910",
        orderId: orderData.id,
        cashier: "POS System",
        items: orderData.items?.map((item: any) => ({
          name: item.product?.name || item.productName || 'Product',
          quantity: item.quantity,
          price: item.price,
          total: item.quantity * item.price
        })) || [],
        subtotal: orderData.items?.reduce((sum: number, item: any) => 
          sum + (item.quantity * item.price), 0) || 0,
        total: orderData.total,
        paymentMethod: orderData.paymentMethod || 'Cash',
        amountTendered: orderData.amountTendered,
        change: orderData.change,
        loyaltyPointsUsed: orderData.loyaltyPointsRedeemed,
        loyaltyPointsEarned: Math.floor(orderData.total * 0.02), // 2% back in points
        timestamp: new Date(orderData.createdAt || Date.now())
      };

      const result = await printerService.printReceipt(receiptData);
      setLastPrintResult(result);
      setIsConnected(result.success);
      
      toast({
        title: result.success ? "Receipt Printed" : "Print Failed",
        description: result.success 
          ? `Printed via ${result.method}` 
          : result.error || "Failed to print receipt",
        variant: result.success ? "default" : "destructive"
      });

      onPrintComplete?.(result.success);
    } catch (error) {
      toast({
        title: "Print Error",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
      onPrintComplete?.(false);
    } finally {
      setIsPrinting(false);
    }
  };

  const handleOpenDrawer = async () => {
    setIsOpeningDrawer(true);
    try {
      const result = await printerService.openCashDrawer();
      
      toast({
        title: result.success ? "Cash Drawer Opened" : "Failed to Open Drawer",
        description: result.success 
          ? `Opened via ${result.method}` 
          : result.error || "Failed to open cash drawer",
        variant: result.success ? "default" : "destructive"
      });
    } finally {
      setIsOpeningDrawer(false);
    }
  };

  const updateConfig = (key: keyof PrinterConfig, value: any) => {
    const newConfig = { ...config, [key]: value };
    setConfig(newConfig);
    // Update printer service config
    Object.assign(printerService, { config: newConfig });
  };

  return (
    <Card className="w-full max-w-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Printer className="w-5 h-5" />
          Printer & Cash Drawer
          {isConnected && <Badge variant="outline" className="text-green-600">Connected</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Status Display */}
        {lastPrintResult && (
          <Alert className={lastPrintResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
            {lastPrintResult.success ? <CheckCircle className="w-4 h-4 text-green-600" /> : <AlertCircle className="w-4 h-4 text-red-600" />}
            <AlertDescription className={lastPrintResult.success ? "text-green-700" : "text-red-700"}>
              {lastPrintResult.message || (lastPrintResult.success ? "Operation completed successfully" : "Operation failed")}
            </AlertDescription>
          </Alert>
        )}

        {/* Main Controls */}
        <div className="grid grid-cols-2 gap-3">
          <Button 
            onClick={handlePrintReceipt} 
            disabled={isPrinting || !orderData}
            className="flex items-center gap-2"
          >
            {isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
            Print Receipt
          </Button>
          
          <Button 
            onClick={handleOpenDrawer}
            disabled={isOpeningDrawer}
            variant="outline"
            className="flex items-center gap-2"
          >
            {isOpeningDrawer ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
            Open Drawer
          </Button>
        </div>

        <Separator />

        {/* Test & Configuration */}
        <div className="space-y-3">
          <Button 
            onClick={handleTestPrinter}
            disabled={isTestingPrinter}
            variant="secondary"
            className="w-full flex items-center gap-2"
          >
            {isTestingPrinter ? <Loader2 className="w-4 h-4 animate-spin" /> : <TestTube className="w-4 h-4" />}
            Test Printer
          </Button>

          {/* Configuration Section */}
          <details className="space-y-3">
            <summary className="flex items-center gap-2 cursor-pointer text-sm font-medium">
              <Settings className="w-4 h-4" />
              Printer Settings
            </summary>
            
            <div className="pl-6 space-y-3 border-l-2 border-gray-100">
              <div>
                <Label htmlFor="printerName" className="text-xs">Printer Name</Label>
                <Input
                  id="printerName"
                  value={config.printerName || ''}
                  onChange={(e) => updateConfig('printerName', e.target.value)}
                  placeholder="EPSON TM-T20II"
                  className="text-xs h-8"
                />
              </div>
              
              <div>
                <Label htmlFor="paperWidth" className="text-xs">Paper Width (characters)</Label>
                <Select value={config.paperWidth?.toString()} onValueChange={(value) => updateConfig('paperWidth', parseInt(value))}>
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue placeholder="Select width" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="32">32 characters (58mm)</SelectItem>
                    <SelectItem value="42">42 characters (80mm)</SelectItem>
                    <SelectItem value="48">48 characters (80mm wide)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="cashdrawerPin" className="text-xs">Cash Drawer Pin</Label>
                <Select value={config.cashdrawerPin} onValueChange={(value: 'pin2' | 'pin5') => updateConfig('cashdrawerPin', value)}>
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pin2">Pin 2 (Standard MMF)</SelectItem>
                    <SelectItem value="pin5">Pin 5 (Alternative)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </details>
        </div>

        {/* Connection Methods Info */}
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription className="text-xs">
            <strong>Connection Methods:</strong>
            <br />• USB: Install local print service
            <br />• Serial: Use Chrome's Web Serial API
            <br />• Network: Configure IP printer
            <br />• Fallback: Download receipt file
          </AlertDescription>
        </Alert>
        
      </CardContent>
    </Card>
  );
}

export default PrinterControls;