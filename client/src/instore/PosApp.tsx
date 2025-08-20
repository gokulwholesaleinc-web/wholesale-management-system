import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Download, Smartphone, HardDrive } from 'lucide-react';
import { triggerInstall, getStorageEstimate, isPWAInstalled } from './pwa';

// Import your existing POS component
import InstorePOS from '@/pages/InstorePOS';

// Styled for the staged PWA
const queryClient = new QueryClient();

function PosAppHeader() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [storage, setStorage] = useState<any>(null);

  useEffect(() => {
    setIsInstalled(isPWAInstalled());
    
    // Set up install prompt detection
    (window as any).__showInstallButton = () => setCanInstall(true);
    
    // Get storage info
    getStorageEstimate().then(setStorage);
  }, []);

  const handleInstall = async () => {
    const success = await triggerInstall();
    if (success) {
      setCanInstall(false);
      setIsInstalled(true);
    }
  };

  return (
    <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-bold">In‑Store POS (Staged)</h1>
        {isInstalled && <Badge variant="secondary">PWA Installed</Badge>}
        <Badge variant="outline" className="text-yellow-400 border-yellow-400">
          Staging Environment
        </Badge>
      </div>
      
      <div className="flex items-center gap-2">
        {storage && (
          <div className="text-sm text-gray-300 flex items-center gap-1">
            <HardDrive className="w-4 h-4" />
            {Math.round((storage.usage || 0) / 1024 / 1024)}MB / 
            {Math.round((storage.quota || 0) / 1024 / 1024)}MB
          </div>
        )}
        
        {canInstall && !isInstalled && (
          <Button
            onClick={handleInstall}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Install POS
          </Button>
        )}
        
        {isInstalled && (
          <div className="text-sm text-green-400 flex items-center gap-1">
            <Smartphone className="w-4 h-4" />
            App Installed
          </div>
        )}
      </div>
    </div>
  );
}

function StagedPosApp() {
  const isReadOnly = (import.meta as any).env.VITE_POS_READONLY === 'true';

  return (
    <div className="h-screen flex flex-col">
      <PosAppHeader />
      
      {isReadOnly && (
        <Card className="m-4 border-yellow-200 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full" />
              <span className="text-sm font-medium text-yellow-800">
                Read-Only Mode: Transaction writing is disabled in staging environment
              </span>
            </div>
          </CardContent>
        </Card>
      )}
      
      <div className="flex-1 overflow-hidden">
        <InstorePOS />
      </div>
    </div>
  );
}

// Mount the PWA app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <QueryClientProvider client={queryClient}>
      <StagedPosApp />
    </QueryClientProvider>
  );
}