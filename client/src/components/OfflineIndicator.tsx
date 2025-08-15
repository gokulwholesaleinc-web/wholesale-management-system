import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Cloud, CloudOff, RotateCcw, CheckCircle } from 'lucide-react';
import { offlineManager } from '@/lib/offlineManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingOperations, setPendingOperations] = useState({ orders: 0, inventory: 0, cart: 0 });
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      updatePendingOperations();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Update pending operations count every 30 seconds
    const interval = setInterval(updatePendingOperations, 30000);
    updatePendingOperations();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const updatePendingOperations = async () => {
    try {
      const counts = await offlineManager.getPendingOperationsCount();
      setPendingOperations(counts);
    } catch (error) {
      console.error('Failed to get pending operations count:', error);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await offlineManager.syncPendingChanges();
      setLastSyncTime(new Date());
      await updatePendingOperations();
    } catch (error) {
      console.error('Manual sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const totalPending = pendingOperations.orders + pendingOperations.inventory + pendingOperations.cart;

  if (isOnline && totalPending === 0) {
    return (
      <div className="fixed bottom-4 left-4 z-40">
        <div className="flex items-center space-x-2 bg-green-100 text-green-800 px-2 py-1 rounded-lg shadow-sm">
          <Cloud className="h-3 w-3" />
          <span className="text-xs font-medium">Online</span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 left-4 z-40">
      <Card className={`shadow-lg ${isOnline ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
        <CardContent className="p-3">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {isOnline ? (
                <Wifi className="h-5 w-5 text-blue-600" />
              ) : (
                <WifiOff className="h-5 w-5 text-orange-600" />
              )}
              <span className={`font-medium ${isOnline ? 'text-blue-800' : 'text-orange-800'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>

            {totalPending > 0 && (
              <div className="flex items-center space-x-2">
                <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                  isOnline ? 'bg-blue-100 text-blue-800' : 'bg-orange-100 text-orange-800'
                }`}>
                  {totalPending} pending
                </div>
                
                {isOnline && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSync}
                    disabled={isSyncing}
                    className="h-7 px-2"
                  >
                    {isSyncing ? (
                      <RotateCcw className="h-3 w-3 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3 w-3" />
                    )}
                    <span className="ml-1 text-xs">Sync</span>
                  </Button>
                )}
              </div>
            )}
          </div>

          {totalPending > 0 && (
            <div className="mt-2 text-xs text-gray-600">
              <div className="flex flex-wrap gap-2">
                {pendingOperations.orders > 0 && (
                  <span>Orders: {pendingOperations.orders}</span>
                )}
                {pendingOperations.inventory > 0 && (
                  <span>Inventory: {pendingOperations.inventory}</span>
                )}
                {pendingOperations.cart > 0 && (
                  <span>Cart: {pendingOperations.cart}</span>
                )}
              </div>
            </div>
          )}

          {lastSyncTime && (
            <div className="mt-2 flex items-center space-x-1 text-xs text-green-600">
              <CheckCircle className="h-3 w-3" />
              <span>Last sync: {lastSyncTime.toLocaleTimeString()}</span>
            </div>
          )}

          {!isOnline && (
            <div className="mt-2 text-xs text-orange-600">
              Changes will sync when connection is restored
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}