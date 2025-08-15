import React, { useState } from 'react';
import { Calculator, DollarSign, Lock, Unlock, AlertTriangle, Receipt, History, Clock, UserCheck, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface TillSession {
  id: number;
  sessionType: string;
  startingCash: string;
  endingCash?: string;
  variance?: string;
  openedAt: string;
  closedAt?: string;
  isOpen: boolean;
}

export default function TillManagement() {
  const [openingAmount, setOpeningAmount] = useState('');
  const [closingAmount, setClosingAmount] = useState('');
  const [dropAmount, setDropAmount] = useState('');
  const [dropReason, setDropReason] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [showManagerOverride, setShowManagerOverride] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get current till session
  const { data: currentSession, isLoading } = useQuery<TillSession>({
    queryKey: ['/api/pos/till/current-session'],
  });

  // Get till history
  const { data: tillHistory } = useQuery({
    queryKey: ['/api/pos/till/history'],
  });

  // Get cash movements for today
  const { data: cashMovements } = useQuery({
    queryKey: ['/api/pos/till/movements'],
  });

  // Open Till Mutation
  const openTillMutation = useMutation({
    mutationFn: async (data: { startingCash: number; notes?: string }) => {
      return await apiRequest('/api/pos/till/open', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: "Till Opened",
        description: "Cash drawer session started successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/pos/till'] });
      setOpeningAmount('');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to open till: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Close Till Mutation
  const closeTillMutation = useMutation({
    mutationFn: async (data: { endingCash: number; notes?: string; managerOverride?: boolean }) => {
      return await apiRequest('/api/pos/till/close', 'POST', data);
    },
    onSuccess: (result) => {
      const variance = parseFloat(result.variance || '0');
      toast({
        title: "Till Closed",
        description: variance === 0 ? "Perfect balance!" : `Variance: $${Math.abs(variance).toFixed(2)} ${variance > 0 ? 'over' : 'short'}`,
        variant: variance === 0 ? "default" : "destructive",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/pos/till'] });
      setClosingAmount('');
      setManagerPassword('');
      setShowManagerOverride(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to close till: " + error.message,
        variant: "destructive",
      });
    },
  });

  // Cash Drop Mutation
  const cashDropMutation = useMutation({
    mutationFn: async (data: { amount: number; reason: string }) => {
      return await apiRequest('/api/pos/till/cash-drop', 'POST', data);
    },
    onSuccess: () => {
      toast({
        title: "Cash Drop Recorded",
        description: `$${dropAmount} removed from register`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/pos/till'] });
      setDropAmount('');
      setDropReason('');
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to record cash drop: " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleOpenTill = () => {
    const amount = parseFloat(openingAmount);
    if (isNaN(amount) || amount < 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid starting cash amount",
        variant: "destructive",
      });
      return;
    }
    openTillMutation.mutate({ startingCash: amount });
  };

  const handleCloseTill = () => {
    const amount = parseFloat(closingAmount);
    if (isNaN(amount) || amount < 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid ending cash amount",
        variant: "destructive",
      });
      return;
    }

    const expectedCash = currentSession ? parseFloat(currentSession.startingCash) + getTotalCashSales() - getTotalCashDrops() : 0;
    const variance = amount - expectedCash;

    // If variance is significant, require manager override
    if (Math.abs(variance) > 10 && !showManagerOverride) {
      setShowManagerOverride(true);
      return;
    }

    closeTillMutation.mutate({ 
      endingCash: amount,
      managerOverride: showManagerOverride && managerPassword === 'manager123' // In real app, verify against database
    });
  };

  const handleCashDrop = () => {
    const amount = parseFloat(dropAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid drop amount",
        variant: "destructive",
      });
      return;
    }
    if (!dropReason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for the cash drop",
        variant: "destructive",
      });
      return;
    }
    cashDropMutation.mutate({ amount, reason: dropReason });
  };

  // Helper functions for calculations
  const getTotalCashSales = () => {
    // This would come from actual sales data
    return 250.00; // Mock data
  };

  const getTotalCashDrops = () => {
    return cashMovements?.reduce((total: number, movement: any) => {
      return movement.movementType === 'drop' ? total + parseFloat(movement.amount) : total;
    }, 0) || 0;
  };

  const getExpectedCash = () => {
    if (!currentSession) return 0;
    return parseFloat(currentSession.startingCash) + getTotalCashSales() - getTotalCashDrops();
  };

  if (isLoading) {
    return <div className="p-6">Loading till information...</div>;
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Till Management</h1>
          <p className="text-gray-600">Professional cash drawer control</p>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={currentSession?.isOpen ? 'default' : 'secondary'} className="px-3 py-1">
            {currentSession?.isOpen ? (
              <>
                <Unlock className="h-4 w-4 mr-1" />
                Till Open
              </>
            ) : (
              <>
                <Lock className="h-4 w-4 mr-1" />
                Till Closed
              </>
            )}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Current Session */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Current Session
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentSession?.isOpen ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="font-medium">Starting Cash:</label>
                    <div className="text-lg font-bold text-green-600">
                      ${parseFloat(currentSession.startingCash).toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <label className="font-medium">Cash Sales:</label>
                    <div className="text-lg font-bold text-blue-600">
                      ${getTotalCashSales().toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <label className="font-medium">Cash Drops:</label>
                    <div className="text-lg font-bold text-red-600">
                      -${getTotalCashDrops().toFixed(2)}
                    </div>
                  </div>
                  <div>
                    <label className="font-medium">Expected Cash:</label>
                    <div className="text-lg font-bold text-purple-600">
                      ${getExpectedCash().toFixed(2)}
                    </div>
                  </div>
                </div>

                {/* Close Till */}
                <div className="border-t pt-4 space-y-3">
                  <Label htmlFor="closingAmount">Actual Cash Count</Label>
                  <Input
                    id="closingAmount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={closingAmount}
                    onChange={(e) => setClosingAmount(e.target.value)}
                  />
                  
                  {showManagerOverride && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-amber-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="font-medium">Manager Override Required</span>
                      </div>
                      <Input
                        type="password"
                        placeholder="Manager Password"
                        value={managerPassword}
                        onChange={(e) => setManagerPassword(e.target.value)}
                      />
                    </div>
                  )}

                  <Button 
                    onClick={handleCloseTill}
                    className="w-full"
                    disabled={closeTillMutation.isPending}
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Close Till
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Label htmlFor="openingAmount">Starting Cash Amount</Label>
                <Input
                  id="openingAmount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={openingAmount}
                  onChange={(e) => setOpeningAmount(e.target.value)}
                />
                <Button 
                  onClick={handleOpenTill}
                  className="w-full"
                  disabled={openTillMutation.isPending}
                >
                  <Unlock className="h-4 w-4 mr-2" />
                  Open Till
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Cash Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Cash Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentSession?.isOpen ? (
              <>
                {/* Cash Drop */}
                <div className="space-y-3">
                  <Label htmlFor="dropAmount">Cash Drop Amount</Label>
                  <Input
                    id="dropAmount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={dropAmount}
                    onChange={(e) => setDropAmount(e.target.value)}
                  />
                  <Label htmlFor="dropReason">Reason for Drop</Label>
                  <Textarea
                    id="dropReason"
                    placeholder="e.g., Safe deposit, bank run, large bills"
                    value={dropReason}
                    onChange={(e) => setDropReason(e.target.value)}
                    rows={3}
                  />
                  <Button 
                    onClick={handleCashDrop}
                    variant="outline"
                    className="w-full"
                    disabled={cashDropMutation.isPending}
                  >
                    Record Cash Drop
                  </Button>
                </div>

                {/* Today's Movements */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Today's Cash Movements</h4>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {cashMovements && cashMovements.length > 0 ? (
                      cashMovements.map((movement: any) => (
                        <div key={movement.id} className="flex justify-between text-sm">
                          <span>{movement.reason}</span>
                          <span className="font-medium text-red-600">
                            -${parseFloat(movement.amount).toFixed(2)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="text-sm text-gray-500">No movements today</div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Lock className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                <p>Open the till to manage cash</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Till History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Recent Till Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tillHistory && tillHistory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-200">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-4 py-2 text-left">Date</th>
                    <th className="border border-gray-200 px-4 py-2 text-center">Starting Cash</th>
                    <th className="border border-gray-200 px-4 py-2 text-center">Ending Cash</th>
                    <th className="border border-gray-200 px-4 py-2 text-center">Expected</th>
                    <th className="border border-gray-200 px-4 py-2 text-center">Variance</th>
                    <th className="border border-gray-200 px-4 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {tillHistory.slice(0, 10).map((session: any) => (
                    <tr key={session.id}>
                      <td className="border border-gray-200 px-4 py-2">
                        {new Date(session.openedAt).toLocaleDateString()}
                      </td>
                      <td className="border border-gray-200 px-4 py-2 text-center">
                        ${parseFloat(session.startingCash).toFixed(2)}
                      </td>
                      <td className="border border-gray-200 px-4 py-2 text-center">
                        {session.endingCash ? `$${parseFloat(session.endingCash).toFixed(2)}` : '-'}
                      </td>
                      <td className="border border-gray-200 px-4 py-2 text-center">
                        {session.expectedCash ? `$${parseFloat(session.expectedCash).toFixed(2)}` : '-'}
                      </td>
                      <td className="border border-gray-200 px-4 py-2 text-center">
                        {session.variance ? (
                          <span className={`font-semibold ${
                            parseFloat(session.variance) === 0 ? 'text-green-600' :
                            parseFloat(session.variance) > 0 ? 'text-blue-600' : 'text-red-600'
                          }`}>
                            ${parseFloat(session.variance).toFixed(2)}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="border border-gray-200 px-4 py-2 text-center">
                        <Badge variant={session.closedAt ? 'secondary' : 'default'}>
                          {session.closedAt ? 'Closed' : 'Open'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              No till history available
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}