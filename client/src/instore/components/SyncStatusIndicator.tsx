import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Wifi, WifiOff, RotateCcw, Database } from 'lucide-react';

interface SyncStatusIndicatorProps {
  className?: string;
}

export default function SyncStatusIndicator({ className = '' }: SyncStatusIndicatorProps) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [storageUsed, setStorageUsed] = useState<string>('');

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check storage usage
    updateStorageInfo();
    
    // Check pending transactions
    updatePendingCount();

    // Set up periodic checks
    const interval = setInterval(() => {
      updatePendingCount();
      updateStorageInfo();
    }, 10000); // Check every 10 seconds

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const updateStorageInfo = async () => {
    try {
      if ((navigator as any).storage?.estimate) {
        const estimate = await (navigator as any).storage.estimate();
        const usedMB = (estimate.usage / (1024 * 1024)).toFixed(1);
        setStorageUsed(`${usedMB}MB`);
      }
    } catch (error) {
      console.error('Failed to get storage estimate:', error);
    }
  };

  const updatePendingCount = async () => {
    try {
      const db = await openOfflineDB();
      const tx = db.transaction(['transactions'], 'readonly');
      const store = tx.objectStore('transactions');
      const allTransactions = await store.getAll();
      
      const pending = allTransactions.filter(t => 
        t.status === 'pending' || t.status === 'failed'
      ).length;
      
      setPendingCount(pending);

      // Get last successful sync
      const synced = allTransactions
        .filter(t => t.status === 'synced')
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      if (synced.length > 0) {
        setLastSync(new Date(synced[0].timestamp));
      }
    } catch (error) {
      console.error('Failed to check pending transactions:', error);
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

  const getConnectionBadge = () => {
    if (isOnline) {
      return (
        <Badge variant="default" className="flex items-center gap-1">
          <Wifi className="h-3 w-3" />
          Online
        </Badge>
      );
    } else {
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <WifiOff className="h-3 w-3" />
          Offline
        </Badge>
      );
    }
  };

  return (
    <div className={`flex items-center gap-3 text-sm ${className}`}>
      {getConnectionBadge()}
      
      {pendingCount > 0 && (
        <Badge variant="outline" className="flex items-center gap-1">
          <RotateCcw className="h-3 w-3" />
          {pendingCount} pending
        </Badge>
      )}
      
      {storageUsed && (
        <Badge variant="outline" className="flex items-center gap-1">
          <Database className="h-3 w-3" />
          {storageUsed}
        </Badge>
      )}
      
      {lastSync && (
        <span className="text-xs text-muted-foreground">
          Last sync: {lastSync.toLocaleTimeString()}
        </span>
      )}
    </div>
  );
}