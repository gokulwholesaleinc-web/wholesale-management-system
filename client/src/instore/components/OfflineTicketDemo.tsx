import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { WifiOff, Wifi, Receipt, ShoppingCart } from 'lucide-react';
import { submitSaleOrQueue, syncQueuedSales } from '../submitSale';
import { OfflineReceipt } from './OfflineReceipt';
import { OfflineSyncStatus } from './OfflineSyncStatus';

export function OfflineTicketDemo() {
  const [lastSale, setLastSale] = useState<any>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Mock sale data for testing
  const createMockSale = () => ({
    customerId: 'pos-customer',
    customerName: 'Walk-in Customer',
    paymentMethod: 'cash',
    total: 15.47,
    items: [
      { productName: 'Coca Cola 2L', quantity: 2, price: 3.99 },
      { productName: 'Bread Loaf', quantity: 1, price: 2.49 },
      { productName: 'Milk Gallon', quantity: 1, price: 4.99 }
    ],
    createdAt: new Date()
  });

  const simulateOfflineMode = () => {
    setIsOfflineMode(!isOfflineMode);
    // In a real scenario, this would disconnect the network
    console.log(`🔄 Simulated ${isOfflineMode ? 'online' : 'offline'} mode`);
  };

  const processSale = async () => {
    setIsProcessing(true);
    try {
      const sale = createMockSale();
      
      // Simulate offline processing if in offline mode
      if (isOfflineMode) {
        // Temporarily override navigator.onLine for testing
        const originalOnLine = navigator.onLine;
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: false,
        });
        
        const result = await submitSaleOrQueue(sale);
        
        // Restore original value
        Object.defineProperty(navigator, 'onLine', {
          writable: true,
          value: originalOnLine,
        });
        
        setLastSale({ ...sale, ticketId: result.ticketId, queued: true });
      } else {
        const result = await submitSaleOrQueue(sale);
        setLastSale({ 
          ...sale, 
          invoice: result.invoice,
          ticketId: result.ticketId,
          queued: result.queued 
        });
      }
    } catch (error) {
      console.error('Sale processing failed:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const triggerSync = async () => {
    try {
      await syncQueuedSales();
      console.log('Sync completed');
    } catch (error) {
      console.error('Sync failed:', error);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Offline Ticket System Demo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Demo Controls */}
          <div className="flex items-center gap-4">
            <Button
              variant={isOfflineMode ? "destructive" : "default"}
              onClick={simulateOfflineMode}
              className="flex items-center gap-2"
            >
              {isOfflineMode ? (
                <>
                  <WifiOff className="h-4 w-4" />
                  Offline Mode
                </>
              ) : (
                <>
                  <Wifi className="h-4 w-4" />
                  Online Mode
                </>
              )}
            </Button>
            
            <Badge variant={isOfflineMode ? "destructive" : "default"}>
              {isOfflineMode ? "Simulating Offline" : "Online"}
            </Badge>
          </div>

          <Separator />

          {/* Sale Processing */}
          <div className="flex items-center gap-4">
            <Button
              onClick={processSale}
              disabled={isProcessing}
              className="flex items-center gap-2"
            >
              <ShoppingCart className="h-4 w-4" />
              {isProcessing ? 'Processing...' : 'Process Test Sale ($15.47)'}
            </Button>
            
            <Button
              variant="outline"
              onClick={triggerSync}
              disabled={isOfflineMode}
            >
              Sync Offline Sales
            </Button>
          </div>

          {/* Explanation */}
          <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
            <h4 className="font-medium mb-2">How the Offline System Works:</h4>
            <ul className="space-y-1 list-disc list-inside">
              <li><strong>Online:</strong> Sales go directly to server, get official invoice numbers</li>
              <li><strong>Offline:</strong> Sales are stored locally with provisional ticket IDs</li>
              <li><strong>Sync:</strong> When connection returns, queued sales get official invoice numbers</li>
              <li><strong>Idempotency:</strong> Duplicate submissions are prevented by unique ticket IDs</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Last Sale Receipt */}
      {lastSale && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Generated Receipt</CardTitle>
            </CardHeader>
            <CardContent>
              <OfflineReceipt sale={lastSale} />
            </CardContent>
          </Card>

          <div>
            <OfflineSyncStatus />
          </div>
        </div>
      )}
    </div>
  );
}