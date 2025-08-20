import React from 'react';
import { createRoot } from 'react-dom/client';
import PosTransactionEngine from './components/PosTransactionEngine';
import OfflineQueueManager from './components/OfflineQueueManager';
import SyncStatusIndicator from './components/SyncStatusIndicator';
import { Toaster } from '@/components/ui/toaster';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import '@/index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (failureCount, error) => {
        // Don't retry on auth errors
        if (error?.message?.includes('401')) return false;
        return failureCount < 3;
      },
    },
  },
});

function PosApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">In-Store POS (Staged)</h1>
              <p className="text-sm text-gray-600">Phase 3: Hotkeys + Manager Override + Credit-at-Counter</p>
            </div>
            <SyncStatusIndicator />
          </div>
        </header>

        <main className="container mx-auto p-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Transaction Engine - Takes up 2/3 width on large screens */}
            <div className="xl:col-span-2">
              <PosTransactionEngine />
            </div>
            
            {/* Offline Queue Manager - Takes up 1/3 width on large screens */}
            <div className="xl:col-span-1">
              <OfflineQueueManager />
            </div>
          </div>
        </main>

        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

// Initialize the app
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<PosApp />);
}