import React, { useState } from 'react';
import { ArrowLeft, Star, Gift, Plus, Minus, Search, User, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { posApiRequest } from '@/lib/posQueryClient';
import { usePosAuth } from '@/pages/pos/PosAuthContext';

interface Customer {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email: string;
  loyaltyPoints?: number;
}

interface LoyaltyTransaction {
  id: string;
  userId: string;
  type: 'earn' | 'redeem' | 'manual_adjust';
  points: number;
  description: string;
  createdAt: string;
  orderId?: string;
}

export const PosLoyalty: React.FC = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = usePosAuth();
  const queryClient = useQueryClient();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  const [manualAdjustment, setManualAdjustment] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');

  // Fetch all customers
  const { data: customers = [] } = useQuery({
    queryKey: ['/api/users'],
    enabled: true,
    select: (data: any) => data?.users || []
  });

  // Fetch customer loyalty transactions
  const { data: transactions = [] } = useQuery({
    queryKey: ['/api/users/loyalty/transactions', selectedCustomer?.id],
    enabled: !!selectedCustomer?.id,
  }) as { data: LoyaltyTransaction[] };

  // Redeem points mutation
  const redeemPointsMutation = useMutation({
    mutationFn: async ({ userId, points }: { userId: string; points: number }) => {
      return posApiRequest(`/api/users/loyalty/redeem`, {
        method: 'POST',
        body: JSON.stringify({ userId, points })
      });
    },
    onSuccess: () => {
      toast({
        title: "Points Redeemed",
        description: `Successfully redeemed ${pointsToRedeem} points`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/loyalty/transactions'] });
      setPointsToRedeem(0);
    },
    onError: (error: any) => {
      toast({
        title: "Redemption Failed",
        description: error.message || "Failed to redeem points",
        variant: "destructive"
      });
    }
  });

  // Manual adjust points mutation (admin only)
  const manualAdjustMutation = useMutation({
    mutationFn: async ({ userId, points, reason }: { userId: string; points: number; reason: string }) => {
      return posApiRequest(`/api/admin/loyalty/manual-adjust`, {
        method: 'POST',
        body: JSON.stringify({ userId, points, reason })
      });
    },
    onSuccess: () => {
      toast({
        title: "Points Adjusted",
        description: `Successfully adjusted points by ${manualAdjustment}`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/users/loyalty/transactions'] });
      setManualAdjustment(0);
      setAdjustmentReason('');
    },
    onError: (error: any) => {
      toast({
        title: "Adjustment Failed",
        description: error.message || "Failed to adjust points",
        variant: "destructive"
      });
    }
  });

  const handleBack = () => {
    setLocation('/dashboard');
  };

  const filteredCustomers = customers.filter((customer: Customer) => 
    customer.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.firstName && customer.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (customer.lastName && customer.lastName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleRedeemPoints = () => {
    if (!selectedCustomer || pointsToRedeem <= 0) {
      toast({
        title: "Invalid Redemption",
        description: "Please select a customer and enter valid points amount",
        variant: "destructive"
      });
      return;
    }

    if (pointsToRedeem > (selectedCustomer.loyaltyPoints || 0)) {
      toast({
        title: "Insufficient Points",
        description: "Customer doesn't have enough points for this redemption",
        variant: "destructive"
      });
      return;
    }

    redeemPointsMutation.mutate({ 
      userId: selectedCustomer.id, 
      points: pointsToRedeem 
    });
  };

  const handleManualAdjust = () => {
    if (!selectedCustomer || manualAdjustment === 0 || !adjustmentReason.trim()) {
      toast({
        title: "Invalid Adjustment",
        description: "Please select a customer, enter adjustment amount, and provide a reason",
        variant: "destructive"
      });
      return;
    }

    manualAdjustMutation.mutate({ 
      userId: selectedCustomer.id, 
      points: manualAdjustment,
      reason: adjustmentReason.trim()
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <h1 className="text-xl font-bold text-gray-900">Loyalty Management</h1>
          <div></div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Customer Search & Selection */}
        <div className="w-1/3 p-6 border-r bg-white">
          <div className="space-y-4">
            <div>
              <Label htmlFor="search">Search Customers</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Search by name, username, or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
              {filteredCustomers.map((customer: Customer) => (
                <Card 
                  key={customer.id} 
                  className={`cursor-pointer transition-colors ${
                    selectedCustomer?.id === customer.id ? 'ring-2 ring-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedCustomer(customer)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-full">
                          <User className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {customer.firstName && customer.lastName 
                              ? `${customer.firstName} ${customer.lastName}`
                              : customer.username
                            }
                          </p>
                          <p className="text-xs text-gray-500">{customer.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span className="font-bold text-blue-600">
                            {customer.loyaltyPoints || 0}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500">points</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>

        {/* Loyalty Actions */}
        <div className="flex-1 p-6">
          {!selectedCustomer ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a Customer</h3>
                <p className="text-gray-500">Choose a customer to manage their loyalty points</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Customer Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    Customer Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-gray-500">Name</Label>
                      <p className="font-medium">
                        {selectedCustomer.firstName && selectedCustomer.lastName 
                          ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}`
                          : selectedCustomer.username
                        }
                      </p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500">Email</Label>
                      <p className="font-medium">{selectedCustomer.email}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500">Username</Label>
                      <p className="font-medium">{selectedCustomer.username}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-500">Loyalty Points</Label>
                      <div className="flex items-center gap-2">
                        <Star className="h-5 w-5 text-yellow-500" />
                        <span className="text-xl font-bold text-blue-600">
                          {selectedCustomer.loyaltyPoints || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Redeem Points */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5" />
                    Redeem Points
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="redeemPoints">Points to Redeem</Label>
                      <Input
                        id="redeemPoints"
                        type="number"
                        min="0"
                        max={selectedCustomer.loyaltyPoints || 0}
                        value={pointsToRedeem}
                        onChange={(e) => setPointsToRedeem(Math.max(0, parseInt(e.target.value) || 0))}
                        placeholder="Enter points to redeem"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button 
                        onClick={handleRedeemPoints}
                        disabled={redeemPointsMutation.isPending || pointsToRedeem <= 0}
                        className="w-full"
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        {redeemPointsMutation.isPending ? 'Processing...' : 'Redeem Points'}
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    Available points: {selectedCustomer.loyaltyPoints || 0}
                  </p>
                </CardContent>
              </Card>

              {/* Manual Adjustment (Admin Only) */}
              {user?.isAdmin && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Plus className="h-5 w-5" />
                      Manual Point Adjustment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="adjustPoints">Point Adjustment</Label>
                        <Input
                          id="adjustPoints"
                          type="number"
                          value={manualAdjustment}
                          onChange={(e) => setManualAdjustment(parseInt(e.target.value) || 0)}
                          placeholder="Enter adjustment (+/-)"
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          Use positive numbers to add points, negative to subtract
                        </p>
                      </div>
                      <div>
                        <Label htmlFor="adjustReason">Reason</Label>
                        <Input
                          id="adjustReason"
                          value={adjustmentReason}
                          onChange={(e) => setAdjustmentReason(e.target.value)}
                          placeholder="Reason for adjustment"
                        />
                      </div>
                    </div>
                    <Button 
                      onClick={handleManualAdjust}
                      disabled={manualAdjustMutation.isPending || manualAdjustment === 0 || !adjustmentReason.trim()}
                      variant="outline"
                      className="w-full"
                    >
                      {manualAdjustMutation.isPending ? 'Processing...' : 'Apply Adjustment'}
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Recent Transactions */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Loyalty Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {transactions.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No transactions found</p>
                    ) : (
                      transactions.map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div>
                            <p className="text-sm font-medium">{transaction.description}</p>
                            <p className="text-xs text-gray-500">
                              {new Date(transaction.createdAt).toLocaleDateString()} at{' '}
                              {new Date(transaction.createdAt).toLocaleTimeString()}
                            </p>
                          </div>
                          <div className={`text-right ${
                            transaction.type === 'redeem' ? 'text-red-600' : 'text-green-600'
                          }`}>
                            <span className="font-bold">
                              {transaction.type === 'redeem' ? '-' : '+'}{transaction.points}
                            </span>
                            <p className="text-xs text-gray-500">points</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};