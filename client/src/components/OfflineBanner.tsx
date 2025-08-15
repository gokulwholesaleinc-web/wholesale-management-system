import React, { useState, useEffect } from 'react';
import { AlertTriangle, X, RotateCcw } from 'lucide-react';
import { offlineManager } from '@/lib/offlineManager';
import { Button } from '@/components/ui/button';

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      updatePendingCount();
    };

    const handleOffline = () => {
      setIsOnline(false);
      setIsVisible(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    updatePendingCount();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    setIsVisible(!isOnline || pendingCount > 0);
  }, [isOnline, pendingCount]);

  const updatePendingCount = async () => {
    try {
      const counts = await offlineManager.getPendingOperationsCount();
      const total = counts.orders + counts.inventory + counts.cart;
      setPendingCount(total);
    } catch (error) {
      console.error('Failed to get pending count:', error);
    }
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await offlineManager.syncPendingChanges();
      await updatePendingCount();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`w-full px-4 py-3 text-sm font-medium text-white transition-colors ${
      isOnline ? 'bg-blue-600' : 'bg-orange-600'
    }`}>
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" />
          <span>
            {isOnline 
              ? `${pendingCount} changes waiting to sync`
              : 'You are offline - changes will be saved locally'
            }
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          {isOnline && pendingCount > 0 && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleSync}
              disabled={isSyncing}
              className="text-white hover:bg-white/20 h-7 px-3"
            >
              {isSyncing ? (
                <RotateCcw className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <RotateCcw className="h-3 w-3 mr-1" />
              )}
              Sync Now
            </Button>
          )}
          
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsVisible(false)}
            className="text-white hover:bg-white/20 h-7 w-7 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}