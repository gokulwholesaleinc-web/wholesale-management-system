import React, { useState, useEffect } from 'react';
import { listAll, listPending, syncQueuedSales, type QueuedTicket } from '../posQueue';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Wifi, WifiOff, Clock, CheckCircle, AlertCircle } from 'lucide-react';

export function OfflineSyncStatus() {
  const [tickets, setTickets] = useState<QueuedTicket[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);

  const refreshTickets = () => {
    const allTickets = listAll();
    const pending = listPending();
    setTickets(allTickets);
    setPendingCount(pending.length);
  };

  useEffect(() => {
    refreshTickets();
    
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync when coming back online
      handleSync();
    };
    
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSync = async () => {
    if (!isOnline || syncing) return;
    
    setSyncing(true);
    try {
      await syncQueuedSales();
      refreshTickets();
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  const getStatusIcon = (status: QueuedTicket['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-orange-500" />;
      case 'synced':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return null;
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-5 w-5 text-green-500" />
            ) : (
              <WifiOff className="h-5 w-5 text-red-500" />
            )}
            Offline Sync Status
          </span>
          <Badge variant={pendingCount > 0 ? "destructive" : "default"}>
            {pendingCount} pending
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Sync Controls */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Connection: {isOnline ? 'Online' : 'Offline'}
          </div>
          <Button 
            size="sm" 
            onClick={handleSync}
            disabled={!isOnline || syncing || pendingCount === 0}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync Now'}
          </Button>
        </div>

        {/* Tickets List */}
        {tickets.length > 0 ? (
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {tickets.map((ticket) => (
              <div key={ticket.ticketId} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  {getStatusIcon(ticket.status)}
                  <div className="text-sm">
                    <div className="font-medium">
                      {ticket.status === 'synced' && ticket.invoiceNo 
                        ? `Invoice #${ticket.invoiceNo}` 
                        : `Ticket ${ticket.ticketId.split('-').pop()}`}
                    </div>
                    <div className="text-gray-500">
                      {new Date(ticket.createdAt).toLocaleString()}
                    </div>
                  </div>
                </div>
                
                <div className="text-right text-sm">
                  <div className="font-medium">
                    ${ticket.payload?.total?.toFixed(2) || '0.00'}
                  </div>
                  <Badge 
                    variant={
                      ticket.status === 'synced' ? 'default' : 
                      ticket.status === 'error' ? 'destructive' : 
                      'secondary'
                    }
                    className="text-xs"
                  >
                    {ticket.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 py-4">
            No offline tickets
          </div>
        )}

        {/* Error Messages */}
        {tickets.some(t => t.status === 'error') && (
          <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
            Some tickets failed to sync. Check connection and try again.
          </div>
        )}
      </CardContent>
    </Card>
  );
}