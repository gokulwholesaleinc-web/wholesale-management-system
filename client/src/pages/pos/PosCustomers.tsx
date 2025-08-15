import React, { useState } from 'react';
import { ArrowLeft, User, Search, Star, Phone, Mail, CreditCard, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';

interface Customer {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone?: string;
  loyaltyPoints?: number;
  creditLimit?: number;
  currentCredit?: number;
  customerLevel?: number;
  customerTier?: number;
  isActive?: boolean;
  registrationDate?: string;
}

export const PosCustomers: React.FC = () => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isLoyaltyModalOpen, setIsLoyaltyModalOpen] = useState(false);
  const [pointsToAdjust, setPointsToAdjust] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState('');

  // Fetch customers
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ['/api/users'],
    select: (data: any) => {
      // Handle both direct array and wrapped response formats
      const users = Array.isArray(data) ? data : (data?.users || data || []);
      // Filter to only customers (exclude admin/employee accounts) 
      const customers = users.filter((user: any) => 
        user.customerLevel >= 1 || (!user.role || user.role === 'customer')
      );
      return customers;
    }
  });

  const handleBack = () => {
    setLocation('/dashboard');
  };

  const filteredCustomers = customers.filter((customer: any) =>
    customer.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (customer.firstName && customer.firstName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (customer.lastName && customer.lastName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (customer.phone && customer.phone.includes(searchTerm))
  );

  const getCustomerDisplayName = (customer: any) => {
    if (customer.firstName && customer.lastName) {
      return `${customer.firstName} ${customer.lastName}`;
    }
    return customer.username;
  };

  const getTierName = (tier?: number) => {
    switch (tier) {
      case 1: return 'Bronze';
      case 2: return 'Silver'; 
      case 3: return 'Gold';
      case 4: return 'Platinum';
      case 5: return 'Diamond';
      default: return 'Standard';
    }
  };

  const getTierColor = (tier?: number) => {
    switch (tier) {
      case 1: return 'bg-orange-100 text-orange-800';
      case 2: return 'bg-gray-100 text-gray-800';
      case 3: return 'bg-yellow-100 text-yellow-800';
      case 4: return 'bg-purple-100 text-purple-800';
      case 5: return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-600';
    }
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
          <h1 className="text-xl font-bold text-gray-900">Customer Management</h1>
          <div></div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-80px)]">
        {/* Customer List */}
        <div className="w-1/2 p-6 border-r bg-white">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="h-4 bg-gray-200 rounded mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded"></div>
                    </CardContent>
                  </Card>
                ))
              ) : (
                filteredCustomers.map((customer: any) => (
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
                          <div className="flex items-center justify-center w-10 h-10 bg-gray-100 rounded-full">
                            <User className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">{getCustomerDisplayName(customer)}</p>
                            <p className="text-sm text-gray-500">{customer.email || customer.username}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-1 rounded-full text-xs ${getTierColor(customer.customerLevel)}`}>
                                {getTierName(customer.customerLevel)}
                              </span>
                              {customer.loyaltyPoints && customer.loyaltyPoints > 0 && (
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 text-yellow-500" />
                                  <span className="text-xs text-gray-600">{customer.loyaltyPoints}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className={`text-sm ${
                            customer.isActive !== false ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {customer.isActive !== false ? 'Active' : 'Inactive'}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {filteredCustomers.length === 0 && !isLoading && (
              <div className="text-center py-8">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No customers found</p>
              </div>
            )}
          </div>
        </div>

        {/* Customer Details */}
        <div className="flex-1 p-6">
          {!selectedCustomer ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <User className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-900 mb-2">Select a Customer</h3>
                <p className="text-gray-500">Choose a customer from the list to view their details</p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Customer Header */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {getCustomerDisplayName(selectedCustomer)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">Username</p>
                      <p className="font-medium">{selectedCustomer.username}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Customer Tier</p>
                      <span className={`inline-flex px-2 py-1 rounded-full text-xs ${getTierColor(selectedCustomer.customerLevel)}`}>
                        {getTierName(selectedCustomer.customerLevel)}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-gray-400" />
                        <p className="font-medium">{selectedCustomer.email}</p>
                      </div>
                    </div>
                    {selectedCustomer.phone && (
                      <div>
                        <p className="text-sm text-gray-500">Phone</p>
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-400" />
                          <p className="font-medium">{selectedCustomer.phone}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Loyalty & Credit Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Loyalty Points */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      Loyalty Points
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-2">
                        {selectedCustomer.loyaltyPoints || 0}
                      </div>
                      <p className="text-sm text-gray-500">Available Points</p>
                      <Button 
                        className="w-full mt-4" 
                        variant="outline"
                        onClick={() => {
                          setIsLoyaltyModalOpen(true);
                          setPointsToAdjust(0);
                          setAdjustmentReason('');
                        }}
                      >
                        Manage Points
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Credit Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CreditCard className="h-5 w-5 text-green-500" />
                      Credit Account
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Credit Limit:</span>
                        <span className="font-medium">
                          ${(selectedCustomer.creditLimit || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Current Balance:</span>
                        <span className="font-medium">
                          ${(selectedCustomer.currentCredit || 0).toFixed(2)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-500">Available Credit:</span>
                        <span className="font-medium text-green-600">
                          ${((selectedCustomer.creditLimit || 0) - (selectedCustomer.currentCredit || 0)).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setLocation('/sale');
                        // In real implementation, would pre-select this customer
                        toast({
                          title: "New Sale Started",
                          description: `Customer ${getCustomerDisplayName(selectedCustomer)} selected`,
                        });
                      }}
                    >
                      Start New Sale
                    </Button>
                    <Button variant="outline">
                      View Order History
                    </Button>
                    <Button variant="outline">
                      Update Information
                    </Button>
                    <Button variant="outline">
                      Send Message
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Loyalty Points Management Modal */}
      <Dialog open={isLoyaltyModalOpen} onOpenChange={setIsLoyaltyModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Loyalty Points</DialogTitle>
            <DialogDescription>
              Adjust loyalty points for {selectedCustomer ? getCustomerDisplayName(selectedCustomer) : 'customer'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedCustomer && (
            <div className="space-y-4">
              {/* Current Points Display */}
              <div className="bg-blue-50 p-4 rounded-lg text-center">
                <div className="text-sm text-gray-600 mb-1">Current Points</div>
                <div className="text-3xl font-bold text-blue-600">{selectedCustomer.loyaltyPoints || 0}</div>
                <div className="text-xs text-gray-500">
                  Value: ${((selectedCustomer.loyaltyPoints || 0) * 0.01).toFixed(2)}
                </div>
              </div>

              {/* Points Adjustment */}
              <div className="space-y-3">
                <Label htmlFor="points-adjustment">Points Adjustment</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPointsToAdjust(pointsToAdjust - 100)}
                    disabled={pointsToAdjust <= -500}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Input
                    id="points-adjustment"
                    type="number"
                    value={pointsToAdjust}
                    onChange={(e) => setPointsToAdjust(Number(e.target.value))}
                    className="text-center"
                    placeholder="0"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPointsToAdjust(pointsToAdjust + 100)}
                    disabled={pointsToAdjust >= 1000}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPointsToAdjust(100)}
                    className="flex-1"
                  >
                    +100
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPointsToAdjust(500)}
                    className="flex-1"
                  >
                    +500
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPointsToAdjust(-100)}
                    className="flex-1"
                  >
                    -100
                  </Button>
                </div>
              </div>

              {/* Reason Input */}
              <div className="space-y-2">
                <Label htmlFor="adjustment-reason">Reason for Adjustment</Label>
                <Textarea
                  id="adjustment-reason"
                  value={adjustmentReason}
                  onChange={(e) => setAdjustmentReason(e.target.value)}
                  placeholder="Enter reason for points adjustment..."
                  className="min-h-[80px]"
                />
              </div>

              {/* Preview */}
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between items-center text-sm">
                  <span>New Balance:</span>
                  <span className="font-bold">
                    {Math.max(0, (selectedCustomer.loyaltyPoints || 0) + pointsToAdjust)} points
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-gray-600">
                  <span>Value Change:</span>
                  <span className={pointsToAdjust >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {pointsToAdjust >= 0 ? '+' : ''}${(pointsToAdjust * 0.01).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsLoyaltyModalOpen(false);
                    setPointsToAdjust(0);
                    setAdjustmentReason('');
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    if (pointsToAdjust !== 0 && adjustmentReason.trim()) {
                      // In real implementation, would make API call to adjust points
                      setIsLoyaltyModalOpen(false);
                      toast({
                        title: "Points Adjusted",
                        description: `${pointsToAdjust >= 0 ? 'Added' : 'Removed'} ${Math.abs(pointsToAdjust)} points for ${getCustomerDisplayName(selectedCustomer)}`,
                      });
                      setPointsToAdjust(0);
                      setAdjustmentReason('');
                    }
                  }}
                  disabled={pointsToAdjust === 0 || !adjustmentReason.trim()}
                  className="flex-1"
                >
                  Apply Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};