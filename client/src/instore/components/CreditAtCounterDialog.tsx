import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { CreditCard, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';

interface Customer {
  id: string;
  name: string;
  email: string;
  tier: number;
  creditLimit: number;
  currentBalance: number;
  onCreditHold: boolean;
}

interface CreditAtCounterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: (customer: Customer, creditAmount: number) => void;
  transactionTotal: number;
}

export default function CreditAtCounterDialog({
  isOpen,
  onClose,
  onApprove,
  transactionTotal
}: CreditAtCounterDialogProps) {
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [creditAmount, setCreditAmount] = useState(transactionTotal);
  const [loading, setLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const { toast } = useToast();

  // Search for customers
  useEffect(() => {
    if (customerSearch.length < 2) {
      setSearchResults([]);
      return;
    }

    const searchCustomers = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/customers/search?q=${encodeURIComponent(customerSearch)}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
          }
        });

        if (response.ok) {
          const customers = await response.json();
          setSearchResults(customers);
        }
      } catch (error) {
        console.error('Customer search error:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchCustomers, 300);
    return () => clearTimeout(debounceTimer);
  }, [customerSearch]);

  // Reset form when dialog opens
  useEffect(() => {
    if (isOpen) {
      setCustomerSearch('');
      setSelectedCustomer(null);
      setCreditAmount(transactionTotal);
      setSearchResults([]);
    }
  }, [isOpen, transactionTotal]);

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setSearchResults([]);
  };

  const handleApprove = () => {
    if (!selectedCustomer) {
      toast({
        title: "No Customer Selected",
        description: "Please select a customer for credit approval",
        variant: "destructive",
      });
      return;
    }

    if (creditAmount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Credit amount must be greater than zero",
        variant: "destructive",
      });
      return;
    }

    const availableCredit = selectedCustomer.creditLimit - selectedCustomer.currentBalance;
    
    if (creditAmount > availableCredit && !selectedCustomer.onCreditHold) {
      toast({
        title: "Credit Limit Exceeded",
        description: `Available credit: $${availableCredit.toFixed(2)}`,
        variant: "destructive",
      });
      return;
    }

    if (selectedCustomer.onCreditHold) {
      toast({
        title: "Customer on Credit Hold",
        description: "This customer's account is on credit hold",
        variant: "destructive",
      });
      return;
    }

    onApprove(selectedCustomer, creditAmount);
    onClose();
  };

  const getCreditStatus = (customer: Customer) => {
    const availableCredit = customer.creditLimit - customer.currentBalance;
    const utilization = (customer.currentBalance / customer.creditLimit) * 100;

    if (customer.onCreditHold) {
      return { status: 'hold', color: 'destructive', text: 'Credit Hold' };
    } else if (utilization >= 90) {
      return { status: 'high', color: 'destructive', text: 'High Utilization' };
    } else if (utilization >= 75) {
      return { status: 'warning', color: 'default', text: 'Caution' };
    } else {
      return { status: 'good', color: 'default', text: 'Good Standing' };
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Credit at Counter
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Transaction Total</span>
            </div>
            <div className="text-2xl font-bold text-blue-900">
              ${transactionTotal.toFixed(2)}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="customer-search">Customer Search</Label>
            <Input
              id="customer-search"
              type="text"
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              placeholder="Search by name, email, or customer ID"
            />
            
            {loading && (
              <div className="text-sm text-muted-foreground">Searching...</div>
            )}

            {searchResults.length > 0 && (
              <div className="border rounded-lg divide-y max-h-40 overflow-y-auto">
                {searchResults.map(customer => (
                  <div
                    key={customer.id}
                    className="p-3 hover:bg-gray-50 cursor-pointer"
                    onClick={() => handleCustomerSelect(customer)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-muted-foreground">{customer.email}</div>
                        <div className="text-xs text-muted-foreground">
                          Tier {customer.tier} • Balance: ${customer.currentBalance.toFixed(2)}
                        </div>
                      </div>
                      <Badge variant={getCreditStatus(customer).color as any}>
                        {getCreditStatus(customer).text}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedCustomer && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <h4 className="font-medium mb-3">Selected Customer</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Name:</span>
                  <span className="font-medium">{selectedCustomer.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Credit Limit:</span>
                  <span className="font-medium">${selectedCustomer.creditLimit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Current Balance:</span>
                  <span className="font-medium">${selectedCustomer.currentBalance.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Available Credit:</span>
                  <span className="font-medium text-green-600">
                    ${(selectedCustomer.creditLimit - selectedCustomer.currentBalance).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Status:</span>
                  <Badge variant={getCreditStatus(selectedCustomer).color as any}>
                    {getCreditStatus(selectedCustomer).text}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="credit-amount">Credit Amount</Label>
            <Input
              id="credit-amount"
              type="number"
              step="0.01"
              min="0"
              value={creditAmount}
              onChange={(e) => setCreditAmount(parseFloat(e.target.value) || 0)}
            />
          </div>

          {selectedCustomer && creditAmount > (selectedCustomer.creditLimit - selectedCustomer.currentBalance) && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-red-700">
                <strong>Warning:</strong> This amount exceeds the customer's available credit limit.
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleApprove}
              disabled={!selectedCustomer || creditAmount <= 0}
              className="flex-1"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve Credit
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}