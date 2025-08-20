import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Wifi, WifiOff, Clock, CheckCircle, XCircle, RotateCcw } from 'lucide-react';

interface QueuedTransaction {
  id: string;
  timestamp: Date;
  total: number;
  items: number;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retries: number;
}

export default function OfflineQueueManager() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [queuedTransactions, setQueuedTransactions] = useState<QueuedTransaction[]>([]);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  // Network status monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncPendingTransactions();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: "Offline Mode",
        description: "Transactions will be queued for sync when connection is restored",
        variant: "destructive",
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load queued transactions on mount
    loadQueuedTransactions();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadQueuedTransactions = async () => {
    try {
      const db = await openOfflineDB();
      const tx = db.transaction(['transactions'], 'readonly');
      const store = tx.objectStore('transactions');
      const allTransactions = await store.getAll();

      const queuedTxns = allTransactions
        .filter(t => t.status === 'pending' || t.status === 'failed')
        .map(t => ({
          id: t.id,
          timestamp: new Date(t.timestamp),
          total: t.total,
          items: t.items.length,
          status: t.status,
          retries: t.retries || 0
        }));

      setQueuedTransactions(queuedTxns);
    } catch (error) {
      console.error('Failed to load queued transactions:', error);
    }
  };

  const syncPendingTransactions = async () => {
    if (!isOnline || syncing) return;

    setSyncing(true);
    try {
      const db = await openOfflineDB();
      const tx = db.transaction(['transactions'], 'readonly');
      const store = tx.objectStore('transactions');
      const pendingTransactions = await store.getAll();

      const unsyncedTransactions = pendingTransactions.filter(t => 
        t.status === 'pending' || t.status === 'failed'
      );

      if (unsyncedTransactions.length === 0) {
        setSyncing(false);
        return;
      }

      // Sync transactions in batches
      const response = await fetch('/api/pos/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({ transactions: unsyncedTransactions })
      });

      if (response.ok) {
        const result = await response.json();
        
        // Update transaction statuses
        const updateTx = db.transaction(['transactions'], 'readwrite');
        const updateStore = updateTx.objectStore('transactions');
        
        for (const txnResult of result.results) {
          const transaction = unsyncedTransactions.find(t => t.id === txnResult.transaction_id);
          if (transaction) {
            transaction.status = txnResult.success ? 'synced' : 'failed';
            transaction.retries = (transaction.retries || 0) + 1;
            await updateStore.put(transaction);
          }
        }

        toast({
          title: "Sync Complete",
          description: `${result.synced} transactions synced successfully`,
        });

        // Reload queue
        await loadQueuedTransactions();

      } else {
        throw new Error('Sync request failed');
      }

    } catch (error) {
      console.error('Sync failed:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync offline transactions. Will retry automatically.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const retryTransaction = async (transactionId: string) => {
    try {
      const db = await openOfflineDB();
      const tx = db.transaction(['transactions'], 'readwrite');
      const store = tx.objectStore('transactions');
      const transaction = await store.get(transactionId);
      
      if (transaction) {
        transaction.status = 'pending';
        await store.put(transaction);
        await loadQueuedTransactions();
        
        if (isOnline) {
          await syncPendingTransactions();
        }
      }
    } catch (error) {
      console.error('Failed to retry transaction:', error);
      toast({
        title: "Retry Failed",
        description: "Could not retry transaction",
        variant: "destructive",
      });
    }
  };

  const clearSyncedTransactions = async () => {
    try {
      const db = await openOfflineDB();
      const tx = db.transaction(['transactions'], 'readwrite');
      const store = tx.objectStore('transactions');
      
      const allTransactions = await store.getAll();
      const syncedTransactions = allTransactions.filter(t => t.status === 'synced');
      
      for (const transaction of syncedTransactions) {
        await store.delete(transaction.id);
      }
      
      await loadQueuedTransactions();
      
      toast({
        title: "Cleanup Complete",
        description: `${syncedTransactions.length} synced transactions cleared`,
      });
    } catch (error) {
      console.error('Failed to clear synced transactions:', error);
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'syncing': return <RotateCcw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'synced': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed': return <XCircle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      pending: 'default',
      syncing: 'default',
      synced: 'default',
      failed: 'destructive'
    } as const;
    
    return (
      <Badge variant={variants[status as keyof typeof variants] || 'outline'}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOnline ? <Wifi className="h-5 w-5 text-green-500" /> : <WifiOff className="h-5 w-5 text-red-500" />}
            Offline Queue Manager
          </div>
          <div className="flex gap-2">
            {isOnline && queuedTransactions.some(t => t.status === 'pending' || t.status === 'failed') && (
              <Button 
                size="sm" 
                onClick={syncPendingTransactions}
                disabled={syncing}
              >
                {syncing ? <RotateCcw className="h-4 w-4 mr-1 animate-spin" /> : null}
                Sync Now
              </Button>
            )}
            <Button 
              size="sm" 
              variant="outline" 
              onClick={clearSyncedTransactions}
            >
              Clear Synced
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span>Connection Status:</span>
            <Badge variant={isOnline ? "default" : "destructive"}>
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span>Queued Transactions:</span>
            <span className="font-medium">{queuedTransactions.length}</span>
          </div>

          {queuedTransactions.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Transaction Queue</h4>
              <div className="max-h-64 overflow-y-auto space-y-2">
                {queuedTransactions.map(transaction => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(transaction.status)}
                      <div>
                        <div className="font-medium text-sm">
                          ${transaction.total.toFixed(2)} • {transaction.items} items
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {transaction.timestamp.toLocaleString()}
                          {transaction.retries > 0 && ` • ${transaction.retries} retries`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(transaction.status)}
                      {transaction.status === 'failed' && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => retryTransaction(transaction.id)}
                        >
                          Retry
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {queuedTransactions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p>All transactions synced</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}