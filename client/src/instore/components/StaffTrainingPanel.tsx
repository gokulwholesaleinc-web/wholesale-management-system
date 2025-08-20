import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BookOpen, Keyboard, Shield, Users, CreditCard, AlertTriangle, CheckCircle, Download } from 'lucide-react';
import { HOTKEY_REFERENCE } from './HotkeyHandler';

export default function StaffTrainingPanel() {
  const [completedModules, setCompletedModules] = useState<string[]>([]);

  const trainingModules = [
    {
      id: 'basics',
      title: 'POS Basics',
      icon: <BookOpen className="h-5 w-5" />,
      duration: '15 min',
      topics: [
        'System navigation',
        'Product selection',
        'Cart management',
        'Payment processing',
        'Receipt generation'
      ]
    },
    {
      id: 'hotkeys',
      title: 'Keyboard Shortcuts',
      icon: <Keyboard className="h-5 w-5" />,
      duration: '10 min',
      topics: [
        'Function key shortcuts',
        'Ctrl combinations',
        'Alt combinations',
        'Navigation keys',
        'Emergency shortcuts'
      ]
    },
    {
      id: 'security',
      title: 'Security & Overrides',
      icon: <Shield className="h-5 w-5" />,
      duration: '20 min',
      topics: [
        'Manager override procedures',
        'Authorization levels',
        'Void transaction process',
        'Security best practices',
        'Audit trail importance'
      ]
    },
    {
      id: 'credit',
      title: 'Credit Management',
      icon: <CreditCard className="h-5 w-5" />,
      duration: '25 min',
      topics: [
        'Customer lookup process',
        'Credit limit verification',
        'Credit approval workflow',
        'Payment processing',
        'Account hold procedures'
      ]
    },
    {
      id: 'troubleshooting',
      title: 'Troubleshooting',
      icon: <AlertTriangle className="h-5 w-5" />,
      duration: '30 min',
      topics: [
        'Common issues',
        'Hardware problems',
        'Network connectivity',
        'Offline mode operation',
        'Emergency procedures'
      ]
    }
  ];

  const markModuleComplete = (moduleId: string) => {
    if (!completedModules.includes(moduleId)) {
      setCompletedModules([...completedModules, moduleId]);
    }
  };

  const downloadQuickReference = () => {
    const content = `
GOKUL WHOLESALE POS - QUICK REFERENCE CARD

=== KEYBOARD SHORTCUTS ===
${Object.entries(HOTKEY_REFERENCE).map(([key, action]) => `${key.padEnd(12)} - ${action}`).join('\n')}

=== EMERGENCY PROCEDURES ===
• Lost Connection: System works offline, transactions auto-sync when reconnected
• Cash Drawer Stuck: Use manual key override, call manager
• Printer Issues: Check power, paper, USB connection
• System Freeze: Press Ctrl+F5 to refresh, transactions are saved

=== MANAGER OVERRIDE REQUIRED FOR ===
• Transaction voids over $50
• Price overrides
• Refunds without receipt
• Opening cash drawer outside transaction
• Credit limit overrides

=== CREDIT AT COUNTER PROCESS ===
1. Select Credit payment or click Customer button
2. Search customer by name/email/ID
3. Verify credit limit and current balance
4. Check customer status (Good/Caution/Hold)
5. Process transaction if approved

=== CONTACT INFORMATION ===
• Technical Support: ext. 101
• Manager Override: ext. 102
• Emergency: 911
    `.trim();

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'POS-Quick-Reference.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Staff Training Center
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {completedModules.length}/{trainingModules.length} Complete
              </Badge>
              <Button size="sm" onClick={downloadQuickReference}>
                <Download className="h-4 w-4 mr-2" />
                Quick Reference
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Training Overview</TabsTrigger>
              <TabsTrigger value="modules">Training Modules</TabsTrigger>
              <TabsTrigger value="reference">Quick Reference</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {trainingModules.map(module => (
                  <Card key={module.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {module.icon}
                          <span className="font-medium">{module.title}</span>
                        </div>
                        {completedModules.includes(module.id) && (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Duration: {module.duration}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="text-sm space-y-1 mb-4">
                        {module.topics.map((topic, index) => (
                          <li key={index} className="flex items-center gap-2">
                            <div className="w-1 h-1 bg-gray-400 rounded-full" />
                            {topic}
                          </li>
                        ))}
                      </ul>
                      <Button 
                        size="sm" 
                        className="w-full"
                        variant={completedModules.includes(module.id) ? "outline" : "default"}
                        onClick={() => markModuleComplete(module.id)}
                      >
                        {completedModules.includes(module.id) ? "Review" : "Start Training"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="modules" className="space-y-6">
              {trainingModules.map(module => (
                <Card key={module.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {module.icon}
                      {module.title}
                      {completedModules.includes(module.id) && (
                        <Badge variant="outline" className="ml-auto">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Complete
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {module.id === 'hotkeys' && (
                      <div className="space-y-4">
                        <h4 className="font-medium">Keyboard Shortcuts Reference</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.entries(HOTKEY_REFERENCE).map(([key, action]) => (
                            <div key={key} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <kbd className="px-2 py-1 bg-gray-200 rounded text-sm font-mono">{key}</kbd>
                              <span className="text-sm">{action}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {module.id === 'security' && (
                      <div className="space-y-4">
                        <h4 className="font-medium">Security Procedures</h4>
                        <div className="space-y-3">
                          <div className="p-3 border-l-4 border-orange-400 bg-orange-50">
                            <strong>Manager Override Required:</strong>
                            <ul className="mt-2 text-sm space-y-1">
                              <li>• Transaction voids over $50</li>
                              <li>• Price adjustments</li>
                              <li>• Refunds without receipt</li>
                              <li>• Cash drawer opens outside transactions</li>
                            </ul>
                          </div>
                          <div className="p-3 border-l-4 border-red-400 bg-red-50">
                            <strong>Never share:</strong> Manager passwords, override codes, or customer credit information
                          </div>
                        </div>
                      </div>
                    )}

                    {module.id === 'credit' && (
                      <div className="space-y-4">
                        <h4 className="font-medium">Credit Processing Steps</h4>
                        <ol className="space-y-2 text-sm">
                          <li className="flex gap-2">
                            <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs">1</span>
                            Customer selects credit payment or click "Customer" button
                          </li>
                          <li className="flex gap-2">
                            <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs">2</span>
                            Search customer by name, email, or customer ID
                          </li>
                          <li className="flex gap-2">
                            <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs">3</span>
                            Verify credit limit and current account balance
                          </li>
                          <li className="flex gap-2">
                            <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs">4</span>
                            Check customer status badge (Good/Caution/High/Hold)
                          </li>
                          <li className="flex gap-2">
                            <span className="bg-blue-100 text-blue-800 rounded-full w-6 h-6 flex items-center justify-center text-xs">5</span>
                            Process transaction if approved, deny if on hold
                          </li>
                        </ol>
                      </div>
                    )}

                    {module.id === 'troubleshooting' && (
                      <div className="space-y-4">
                        <h4 className="font-medium">Common Issues & Solutions</h4>
                        <div className="space-y-3">
                          <div className="p-3 border rounded">
                            <strong className="text-sm">Network Connection Lost</strong>
                            <p className="text-sm text-muted-foreground mt-1">
                              System automatically switches to offline mode. Transactions are saved locally and sync when connection returns.
                            </p>
                          </div>
                          <div className="p-3 border rounded">
                            <strong className="text-sm">Receipt Printer Not Working</strong>
                            <p className="text-sm text-muted-foreground mt-1">
                              Check power, paper level, and USB connection. Press F5 to test printer connection.
                            </p>
                          </div>
                          <div className="p-3 border rounded">
                            <strong className="text-sm">Cash Drawer Won't Open</strong>
                            <p className="text-sm text-muted-foreground mt-1">
                              Try F5 hotkey or manual key. If stuck, call manager for assistance.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="mt-6 flex gap-2">
                      <Button 
                        onClick={() => markModuleComplete(module.id)}
                        disabled={completedModules.includes(module.id)}
                      >
                        {completedModules.includes(module.id) ? "Completed" : "Mark Complete"}
                      </Button>
                      {module.id === 'hotkeys' && (
                        <Button variant="outline" onClick={downloadQuickReference}>
                          Download Reference Card
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            <TabsContent value="reference" className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Emergency Contacts</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between">
                      <span>Technical Support:</span>
                      <span className="font-mono">ext. 101</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Manager Override:</span>
                      <span className="font-mono">ext. 102</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Emergency:</span>
                      <span className="font-mono">911</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">System Status</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span>Network:</span>
                      <Badge variant={navigator.onLine ? "default" : "destructive"}>
                        {navigator.onLine ? "Online" : "Offline"}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Training Progress:</span>
                      <Badge variant="outline">
                        {completedModules.length}/{trainingModules.length}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}