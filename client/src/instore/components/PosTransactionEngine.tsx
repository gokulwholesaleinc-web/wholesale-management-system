import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ShoppingCart, Wifi, WifiOff, CreditCard, Banknote } from 'lucide-react';

interface Product {
  id: number;
  name: string;
  price: number;
  sku: string;
  category: string;
}

interface CartItem {
  product: Product;
  quantity: number;
  price: number;
  lineTotal: number;
}

interface Transaction {
  id: string;
  items: CartItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'credit' | 'debit';
  timestamp: Date;
  status: 'pending' | 'completed' | 'synced' | 'failed';
  offline: boolean;
}

export default function PosTransactionEngine() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [processing, setProcessing] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<'cash' | 'credit' | 'debit'>('cash');
  const [cashReceived, setCashReceived] = useState<number>(0);
  const { toast } = useToast();

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: "Back Online",
        description: "Connection restored. Syncing offline transactions...",
      });
      syncOfflineTransactions();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Offline Mode",
        description: "Operating in offline mode. Transactions will be queued.",
        variant: "destructive",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const subtotal = cart.reduce((sum, item) => sum + item.lineTotal, 0);
  const tax = subtotal * 0.08; // 8% tax rate
  const total = subtotal + tax;

  const addToCart = (product: Product, quantity: number = 1) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity, lineTotal: (item.quantity + quantity) * item.price }
            : item
        );
      }
      return [...prev, {
        product,
        quantity,
        price: product.price,
        lineTotal: product.price * quantity
      }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateQuantity = (productId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart(prev => prev.map(item =>
      item.product.id === productId
        ? { ...item, quantity, lineTotal: quantity * item.price }
        : item
    ));
  };

  const processTransaction = async () => {
    if (cart.length === 0) {
      toast({
        title: "Empty Cart",
        description: "Add items to cart before processing transaction",
        variant: "destructive",
      });
      return;
    }

    if (selectedPayment === 'cash' && cashReceived < total) {
      toast({
        title: "Insufficient Cash",
        description: `Received $${cashReceived.toFixed(2)}, need $${total.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }

    setProcessing(true);

    const transaction: Transaction = {
      id: `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      items: cart,
      subtotal,
      tax,
      total,
      paymentMethod: selectedPayment,
      timestamp: new Date(),
      status: 'pending',
      offline: !isOnline
    };

    try {
      if (isOnline) {
        // Process online transaction
        await processOnlineTransaction(transaction);
        toast({
          title: "Transaction Complete",
          description: `Payment of $${total.toFixed(2)} processed successfully`,
        });
      } else {
        // Queue offline transaction
        await queueOfflineTransaction(transaction);
        toast({
          title: "Transaction Queued",
          description: "Transaction saved offline. Will sync when connection restored.",
        });
      }

      // Clear cart and reset
      setCart([]);
      setCashReceived(0);
      setSelectedPayment('cash');

    } catch (error) {
      console.error('Transaction processing error:', error);
      toast({
        title: "Transaction Failed",
        description: "Please try again or contact support",
        variant: "destructive",
      });
    } finally {
      setProcessing(false);
    }
  };

  const processOnlineTransaction = async (transaction: Transaction): Promise<void> => {
    const response = await fetch('/api/pos/transaction', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
      },
      body: JSON.stringify(transaction)
    });

    if (!response.ok) {
      throw new Error('Failed to process transaction');
    }

    transaction.status = 'completed';
  };

  const queueOfflineTransaction = async (transaction: Transaction): Promise<void> => {
    // Store in IndexedDB for offline processing
    const db = await openOfflineDB();
    const tx = db.transaction(['transactions'], 'readwrite');
    const store = tx.objectStore('transactions');
    await store.add(transaction);
    transaction.status = 'pending';
  };

  const syncOfflineTransactions = async () => {
    try {
      const db = await openOfflineDB();
      const tx = db.transaction(['transactions'], 'readonly');
      const store = tx.objectStore('transactions');
      const pendingTransactions = await store.getAll();

      const unsyncedTransactions = pendingTransactions.filter(t => t.status === 'pending');

      for (const transaction of unsyncedTransactions) {
        try {
          await processOnlineTransaction(transaction);
          
          // Mark as synced in IndexedDB
          const updateTx = db.transaction(['transactions'], 'readwrite');
          const updateStore = updateTx.objectStore('transactions');
          transaction.status = 'synced';
          await updateStore.put(transaction);

        } catch (error) {
          console.error('Failed to sync transaction:', transaction.id, error);
          transaction.status = 'failed';
        }
      }

      if (unsyncedTransactions.length > 0) {
        toast({
          title: "Sync Complete",
          description: `${unsyncedTransactions.length} offline transactions synced`,
        });
      }

    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync offline transactions. Will retry later.",
        variant: "destructive",
      });
    }
  };

  const openOfflineDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('POSOfflineDB', 1);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('transactions')) {
          const store = db.createObjectStore('transactions', { keyPath: 'id' });
          store.createIndex('status', 'status', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
      {/* Product Selection - Mock for now */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Products
            <Badge variant={isOnline ? "default" : "destructive"} className="ml-auto">
              {isOnline ? <Wifi className="h-3 w-3 mr-1" /> : <WifiOff className="h-3 w-3 mr-1" />}
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Mock products for demonstration */}
            {[
              { id: 1, name: 'Energy Drink', price: 2.99, sku: 'ED001', category: 'Beverages' },
              { id: 2, name: 'Cigarettes', price: 8.50, sku: 'CIG001', category: 'Tobacco' },
              { id: 3, name: 'Candy Bar', price: 1.25, sku: 'CB001', category: 'Snacks' },
              { id: 4, name: 'Gum Pack', price: 1.99, sku: 'GUM001', category: 'Snacks' },
              { id: 5, name: 'Water Bottle', price: 1.50, sku: 'WB001', category: 'Beverages' },
              { id: 6, name: 'Lottery Ticket', price: 2.00, sku: 'LT001', category: 'Gaming' },
            ].map(product => (
              <Button
                key={product.id}
                variant="outline"
                className="h-24 flex flex-col justify-center p-2"
                onClick={() => addToCart(product)}
              >
                <div className="font-medium text-sm">{product.name}</div>
                <div className="text-xs text-muted-foreground">${product.price}</div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Cart and Checkout */}
      <Card>
        <CardHeader>
          <CardTitle>Cart ({cart.length} items)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Cart Items */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {cart.map(item => (
              <div key={item.product.id} className="flex items-center justify-between p-2 border rounded">
                <div className="flex-1">
                  <div className="font-medium text-sm">{item.product.name}</div>
                  <div className="text-xs text-muted-foreground">
                    ${item.price.toFixed(2)} × {item.quantity}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.product.id, parseInt(e.target.value) || 0)}
                    className="w-16 h-8"
                    min="0"
                  />
                  <div className="font-medium">${item.lineTotal.toFixed(2)}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="space-y-2 pt-4 border-t">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax (8%):</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span>${total.toFixed(2)}</span>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-3">
            <div className="text-sm font-medium">Payment Method:</div>
            <div className="grid grid-cols-3 gap-2">
              <Button
                variant={selectedPayment === 'cash' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPayment('cash')}
              >
                <Banknote className="h-4 w-4 mr-1" />
                Cash
              </Button>
              <Button
                variant={selectedPayment === 'credit' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPayment('credit')}
              >
                <CreditCard className="h-4 w-4 mr-1" />
                Credit
              </Button>
              <Button
                variant={selectedPayment === 'debit' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPayment('debit')}
              >
                <CreditCard className="h-4 w-4 mr-1" />
                Debit
              </Button>
            </div>

            {selectedPayment === 'cash' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Cash Received:</label>
                <Input
                  type="number"
                  step="0.01"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
                {cashReceived > total && (
                  <div className="text-sm">
                    Change: <span className="font-medium">${(cashReceived - total).toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Process Transaction */}
          <Button
            onClick={processTransaction}
            disabled={processing || cart.length === 0}
            className="w-full"
            size="lg"
          >
            {processing ? 'Processing...' : `Charge $${total.toFixed(2)}`}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}