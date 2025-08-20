import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Monitor, Users, ShoppingCart, Settings } from 'lucide-react';
import PosTransactionEngine from './components/PosTransactionEngine';
import OfflineQueueManager from './components/OfflineQueueManager';
import SyncStatusIndicator from './components/SyncStatusIndicator';
import HardwareStatusMonitor from './components/HardwareStatusMonitor';
import StaffTrainingPanel from './components/StaffTrainingPanel';
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
  const [activeTab, setActiveTab] = useState('pos');

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b px-6 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">In-Store POS (Staged)</h1>
              <p className="text-sm text-gray-600">Phase 4: Production Deployment + Hardware Monitoring</p>
            </div>
            <div className="flex items-center gap-4">
              <SyncStatusIndicator />
              <Badge variant="outline">Phase 4</Badge>
            </div>
          </div>
        </header>

        <main className="container mx-auto p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="pos" className="flex items-center gap-2">
                <ShoppingCart className="h-4 w-4" />
                POS Terminal
              </TabsTrigger>
              <TabsTrigger value="hardware" className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                Hardware
              </TabsTrigger>
              <TabsTrigger value="training" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Training
              </TabsTrigger>
              <TabsTrigger value="settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Settings
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pos" className="mt-0">
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
            </TabsContent>

            <TabsContent value="hardware" className="mt-0">
              <div className="space-y-6">
                <HardwareStatusMonitor />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* System Performance Card */}
                  <div className="bg-white rounded-lg border p-6">
                    <h3 className="font-semibold mb-4">System Performance</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>CPU Usage:</span>
                        <Badge variant="outline">Normal</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Memory:</span>
                        <Badge variant="outline">32% Used</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Storage:</span>
                        <Badge variant="outline">58% Used</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Uptime:</span>
                        <Badge variant="outline">2h 15m</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Network Status Card */}
                  <div className="bg-white rounded-lg border p-6">
                    <h3 className="font-semibold mb-4">Network Status</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Connection:</span>
                        <Badge variant={navigator.onLine ? "default" : "destructive"}>
                          {navigator.onLine ? "Online" : "Offline"}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Speed:</span>
                        <Badge variant="outline">High Speed</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Latency:</span>
                        <Badge variant="outline">&lt; 50ms</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span>Sync Status:</span>
                        <Badge variant="default">Up to Date</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="training" className="mt-0">
              <StaffTrainingPanel />
            </TabsContent>

            <TabsContent value="settings" className="mt-0">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* POS Configuration */}
                <div className="bg-white rounded-lg border p-6">
                  <h3 className="font-semibold mb-4">POS Configuration</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Hotkeys Enabled</span>
                      <Badge variant="default">On</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Offline Mode</span>
                      <Badge variant="default">Enabled</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Auto-sync</span>
                      <Badge variant="default">30s</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Receipt Printer</span>
                      <Badge variant="outline">TM-T88V</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Cash Drawer</span>
                      <Badge variant="outline">MMF</Badge>
                    </div>
                  </div>
                </div>

                {/* Security Settings */}
                <div className="bg-white rounded-lg border p-6">
                  <h3 className="font-semibold mb-4">Security Settings</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Manager Override</span>
                      <Badge variant="default">Required</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Session Timeout</span>
                      <Badge variant="outline">8 hours</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Activity Logging</span>
                      <Badge variant="default">Enabled</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Credit Verification</span>
                      <Badge variant="default">Real-time</Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Audit Trail</span>
                      <Badge variant="default">Complete</Badge>
                    </div>
                  </div>
                </div>

                {/* About */}
                <div className="bg-white rounded-lg border p-6 lg:col-span-2">
                  <h3 className="font-semibold mb-4">System Information</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm text-muted-foreground">Version</div>
                      <div className="font-medium">Phase 4.0</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Build</div>
                      <div className="font-medium">2025.08.20</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Environment</div>
                      <div className="font-medium">Production Staging</div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">Platform</div>
                      <div className="font-medium">Gokul Wholesale</div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
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