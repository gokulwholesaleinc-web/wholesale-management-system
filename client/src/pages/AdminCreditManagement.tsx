import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { AppLayout } from '@/layout/AppLayout';
import { BreadcrumbNavigation } from '@/components/navigation/BreadcrumbNavigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CreditCard, DollarSign, FileText, Search, AlertTriangle, Users, Filter, History } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CreditTransactionHistory } from '@/components/admin/CreditTransactionHistory';
import { CustomerCreditManager } from '@/components/admin/CustomerCreditManager';
import { availableFrom, fmtUSD, isOverLimit, owedFromBalance, validatePaymentAmount } from '@/lib/credit';

type TxType = 'charge' | 'payment' | 'adjustment';

interface Customer {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  company?: string;
  email?: string;
  phone?: string;
  customerLevel: number;
  creditLimit?: number;     // number, dollars
  currentBalance?: number;  // number, dollars (positive = credit, negative = owed)
}

interface UnpaidInvoice {
  id: number;
  orderId: number;
  customerId: string;
  amount: number;
  status: string;
  createdAt: string;
  dueDate?: string;
  customerName?: string;
}

interface CreditTransaction {
  id: number;
  customerId: string;
  orderId?: number;
  transactionType: TxType;
  amount: number;
  description?: string;
  processedBy: string;
  createdAt: string;
  customerName?: string;
  customerCompany?: string;
  customerUsername?: string;
}

export default function AdminCreditManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [accountStatusFilter, setAccountStatusFilter] = useState<'all' | 'active' | 'inactive' | 'over_limit'>('all');
  const [creditLevelFilter, setCreditLevelFilter] = useState<'all' | '1' | '2' | '3' | '4' | '5'>('all');

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCreditDialog, setShowCreditDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [showCustomerManagerDialog, setShowCustomerManagerDialog] = useState(false);
  const [creditLimitInput, setCreditLimitInput] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'check' | 'electronic'>('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [checkNumber, setCheckNumber] = useState('');

  // Fetch all customers
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/admin/customers'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch unpaid invoices
  const { data: unpaidInvoices = [] } = useQuery<UnpaidInvoice[]>({
    queryKey: ['/api/admin/on-account-orders'],
    refetchInterval: 30000,
  });

  // Fetch all credit transactions
  const { data: allCreditTransactions = [], isLoading: transactionsLoading } = useQuery<CreditTransaction[]>({
    queryKey: ['/api/admin/credit-transactions'],
    refetchInterval: 30000,
  });

  // === Derived statistics (memoized; no extra network) ===
  const creditStats = useMemo(() => {
    const withCredit = customers.filter(c => (c.creditLimit ?? 0) > 0);
    const totalCreditIssued = withCredit.reduce((s, c) => s + (c.creditLimit ?? 0), 0);
    const totalOutstanding = withCredit.reduce((s, c) => s + owedFromBalance(c.currentBalance), 0);
    const averageCreditLimit = withCredit.length ? totalCreditIssued / withCredit.length : 0;
    const unpaidInvoicesTotal = unpaidInvoices.reduce((s, inv) => s + inv.amount, 0);

    return {
      totalCustomersWithCredit: withCredit.length,
      totalCreditIssued,
      totalOutstanding,
      averageCreditLimit,
      unpaidInvoicesCount: unpaidInvoices.length,
      unpaidInvoicesTotal,
    };
  }, [customers, unpaidInvoices]);

  // Mutations
  const updateCreditLimitMutation = useMutation({
    mutationFn: async ({ customerId, creditLimit }: { customerId: string; creditLimit: number }) => {
      return apiRequest('PUT', `/api/admin/customers/${customerId}/credit-limit`, { creditLimit });
    },
    onSuccess: () => {
      toast({ title: 'Credit limit updated', description: 'The customer credit limit has been successfully updated.' });
      // Invalidate all customer-related queries to avoid staleness
      queryClient.invalidateQueries({
        predicate: (q) => {
          const k = q.queryKey as unknown as string[];
          return Array.isArray(k) && k[0]?.startsWith('/api/admin/customers');
        },
      });
      setShowCreditDialog(false);
      setCreditLimitInput('');
    },
    onError: () => {
      toast({ title: 'Error updating credit limit', description: 'Failed to update the credit limit. Please try again.', variant: 'destructive' });
    },
  });

  const processPaymentMutation = useMutation({
    mutationFn: async (paymentData: {
      customerId: string;
      amount: number;
      paymentMethod: 'cash' | 'check' | 'electronic';
      checkNumber?: string;
      notes?: string;
    }) => {
      const requestData = {
        customerId: paymentData.customerId,
        amount: paymentData.amount, // consider sending cents if backend supports it
        paymentMethod: paymentData.paymentMethod,
        paymentNotes: paymentData.notes || (paymentData.checkNumber ? `Check #${paymentData.checkNumber}` : ''),
      };
      return apiRequest('POST', `/api/admin/invoices/process-payment`, requestData);
    },
    onSuccess: () => {
      toast({ title: 'Payment processed', description: 'The payment has been successfully processed.' });
      queryClient.invalidateQueries({
        predicate: (q) => {
          const k = q.queryKey as unknown as string[];
          return Array.isArray(k) && (
            k[0] === '/api/admin/customers' ||
            k[0] === '/api/admin/credit-transactions' ||
            k[0] === '/api/admin/on-account-orders' ||
            k[0]?.startsWith('/api/admin/customers')
          );
        },
      });
      setShowPaymentDialog(false);
      setPaymentAmount('');
      setPaymentNotes('');
      setCheckNumber('');
    },
    onError: () => {
      toast({ title: 'Error processing payment', description: 'Failed to process the payment. Please try again.', variant: 'destructive' });
    },
  });

  // Filters
  const filteredCustomers = customers.filter((customer) => {
    const term = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !term ||
      customer.username.toLowerCase().includes(term) ||
      (customer.firstName ?? '').toLowerCase().includes(term) ||
      (customer.lastName ?? '').toLowerCase().includes(term) ||
      (customer.company ?? '').toLowerCase().includes(term);

    const status =
      accountStatusFilter === 'all' ||
      (accountStatusFilter === 'active' && (customer.creditLimit ?? 0) > 0) ||
      (accountStatusFilter === 'inactive' && (customer.creditLimit ?? 0) === 0) ||
      (accountStatusFilter === 'over_limit' && isOverLimit(customer.creditLimit, customer.currentBalance));

    const level =
      creditLevelFilter === 'all' || customer.customerLevel.toString() === creditLevelFilter;

    return matchesSearch && status && level;
  });

  // UI helpers
  const balanceColor = (balance?: number | null) => {
    const b = balance ?? 0;
    if (b > 0) return 'text-green-600'; // credit
    if (b < 0) return 'text-red-600';   // owed
    return 'text-gray-600';
  };

  const balanceText = (balance?: number | null) => {
    const b = balance ?? 0;
    if (b > 0) return `${fmtUSD(b)} Credit`;
    if (b < 0) return `${fmtUSD(-b)} Owed`;
    return fmtUSD(0);
  };

  // Actions
  const handleUpdateCreditLimit = () => {
    if (!selectedCustomer || !creditLimitInput) return;
    const value = Number(creditLimitInput);
    if (!Number.isFinite(value) || value < 0) {
      toast({ title: 'Invalid amount', description: 'Please enter a valid credit limit amount.', variant: 'destructive' });
      return;
    }
    updateCreditLimitMutation.mutate({ customerId: selectedCustomer.id, creditLimit: value });
  };

  const handleProcessPayment = () => {
    if (!selectedCustomer || !paymentAmount) return;
    const amount = Number(paymentAmount);
    
    const validation = validatePaymentAmount(amount, selectedCustomer.currentBalance);
    if (!validation.isValid) {
      toast({ title: 'Invalid amount', description: validation.error, variant: 'destructive' });
      return;
    }
    
    if (paymentMethod === 'check' && !checkNumber.trim()) {
      toast({ title: 'Check number required', description: 'Please enter a check number for check payments.', variant: 'destructive' });
      return;
    }

    // Optional: Disallow paying more than owed (unless you allow credits)
    // const owed = owedFromBalance(selectedCustomer.currentBalance);
    // if (amount > owed) { ... }

    processPaymentMutation.mutate({
      customerId: selectedCustomer.id,
      amount,
      paymentMethod,
      checkNumber: paymentMethod === 'check' ? checkNumber : undefined,
      notes: paymentNotes,
    });
  };

  return (
    <AppLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <BreadcrumbNavigation />
        
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Credit Management</h1>
          <p className="text-gray-600">Manage customer credit accounts, limits, and payments</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="customer-credits">Customer Credits</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Credit Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Customers</p>
                      <p className="text-2xl font-bold">{customers.length}</p>
                      <p className="text-xs text-gray-500">Active customer accounts</p>
                    </div>
                    <Users className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Credit Accounts</p>
                      <p className="text-2xl font-bold">{creditStats.totalCustomersWithCredit}</p>
                      <p className="text-xs text-gray-500">Customers with credit</p>
                    </div>
                    <CreditCard className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Credit Limit</p>
                      <p className="text-2xl font-bold">{fmtUSD(creditStats.totalCreditIssued)}</p>
                      <p className="text-xs text-gray-500">Total available credit</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Outstanding Balance</p>
                      <p className="text-2xl font-bold">{fmtUSD(creditStats.totalOutstanding)}</p>
                      <p className="text-xs text-gray-500">Total owed amount</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Over Limit</p>
                      <p className="text-2xl font-bold text-red-600">{customers.filter(c => isOverLimit(c.creditLimit, c.currentBalance)).length}</p>
                      <p className="text-xs text-gray-500">Customers over limit</p>
                    </div>
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Credit Account Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Credit Account Status Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-green-50 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-green-600">{customers.filter(c => c.creditLimit && c.creditLimit > 0 && !isOverLimit(c.creditLimit, c.currentBalance)).length}</p>
                    <p className="text-sm text-green-700">Good Standing</p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-yellow-600">{customers.filter(c => c.creditLimit && c.creditLimit > 0 && c.currentBalance && c.currentBalance < 0 && Math.abs(c.currentBalance) < c.creditLimit * 0.8).length}</p>
                    <p className="text-sm text-yellow-700">Near Limit</p>
                  </div>
                  <div className="bg-red-50 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-red-600">{customers.filter(c => isOverLimit(c.creditLimit, c.currentBalance)).length}</p>
                    <p className="text-sm text-red-700">Over Limit</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-center">
                    <p className="text-2xl font-bold text-gray-600">{customers.filter(c => !c.creditLimit || c.creditLimit === 0).length}</p>
                    <p className="text-sm text-gray-700">No Credit</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="customer-credits" className="space-y-6">
            {/* Search & Filter Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Search & Filter Customers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <Label htmlFor="search-customers">Search Customers</Label>
                    <Input
                      id="search-customers"
                      placeholder="Search by name, username, or company..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="account-status">Account Status</Label>
                    <Select value={accountStatusFilter} onValueChange={setAccountStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active Credit</SelectItem>
                        <SelectItem value="inactive">No Credit</SelectItem>
                        <SelectItem value="over_limit">Over Limit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="credit-level">Credit Level</Label>
                    <Select value={creditLevelFilter} onValueChange={setCreditLevelFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Levels" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Levels</SelectItem>
                        <SelectItem value="1">Level 1</SelectItem>
                        <SelectItem value="2">Level 2</SelectItem>
                        <SelectItem value="3">Level 3</SelectItem>
                        <SelectItem value="4">Level 4</SelectItem>
                        <SelectItem value="5">Level 5</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSearchTerm('');
                        setAccountStatusFilter('all');
                        setCreditLevelFilter('all');
                      }}
                      className="w-full"
                    >
                      <Filter className="h-4 w-4 mr-2" />
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Credit Accounts Table */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Credit Accounts ({filteredCustomers.length})</CardTitle>
                <p className="text-sm text-gray-600">Manage individual customer credit limits and view account details</p>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Level</TableHead>
                        <TableHead>Credit Limit</TableHead>
                        <TableHead>Current Balance</TableHead>
                        <TableHead>Available Credit</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((customer) => (
                        <TableRow key={customer.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{customer.firstName} {customer.lastName}</p>
                              <p className="text-sm text-gray-600">@{customer.username}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{customer.company || 'N/A'}</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">Level {customer.customerLevel}</Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">{fmtUSD(customer.creditLimit || 0)}</span>
                          </TableCell>
                          <TableCell>
                            <span className={`font-medium ${balanceColor(customer.currentBalance)}`}>
                              {balanceText(customer.currentBalance)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">
                              {fmtUSD(availableFrom(customer.creditLimit, customer.currentBalance))}
                            </span>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Badge variant={customer.creditLimit && customer.creditLimit > 0 ? 'default' : 'secondary'}>
                                {customer.creditLimit && customer.creditLimit > 0 ? 'Active' : 'No Credit'}
                              </Badge>
                              {isOverLimit(customer.creditLimit, customer.currentBalance) && (
                                <Badge variant="destructive">Over Limit</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedCustomer(customer);
                                  setShowCustomerManagerDialog(true);
                                }}
                              >
                                <CreditCard className="h-4 w-4 mr-1" />
                                Manage
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedCustomer(customer);
                                  setShowHistoryDialog(true);
                                }}
                              >
                                <History className="h-4 w-4 mr-1" />
                                History
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedCustomer(customer);
                                  setShowPaymentDialog(true);
                                }}
                              >
                                <DollarSign className="h-4 w-4 mr-1" />
                                Payment
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Recent Credit Transactions</CardTitle>
                <p className="text-sm text-gray-600">View all credit transactions across all customer accounts</p>
              </CardHeader>
              <CardContent>
                {transactionsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
                  </div>
                ) : allCreditTransactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <FileText className="h-16 w-16 text-gray-400" />
                    <div className="text-center">
                      <p className="text-lg font-medium text-gray-900">No credit transactions found</p>
                      <p className="text-sm text-gray-500">Credit transactions will appear here when customers use account credit</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">Showing {allCreditTransactions.length} recent transactions</p>
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Customer</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Processed By</TableHead>
                            <TableHead>Order ID</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {allCreditTransactions.map((transaction: any) => (
                            <TableRow key={transaction.id}>
                              <TableCell className="font-mono text-sm">
                                {new Date(transaction.createdAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </TableCell>
                              <TableCell>
                                <div>
                                  <div className="font-medium text-sm">{transaction.customerName}</div>
                                  {transaction.customerCompany && (
                                    <div className="text-xs text-gray-500">{transaction.customerCompany}</div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant={transaction.transactionType === 'payment' ? 'default' : transaction.transactionType === 'charge' ? 'destructive' : 'secondary'}>
                                  {transaction.transactionType}
                                </Badge>
                              </TableCell>
                              <TableCell className={transaction.transactionType === 'payment' ? 'text-green-600' : 'text-red-600'}>
                                {transaction.transactionType === 'payment' ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                              </TableCell>
                              <TableCell className="max-w-xs truncate text-sm">
                                {transaction.description || 'No description'}
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {transaction.processedBy}
                              </TableCell>
                              <TableCell>
                                {transaction.orderId ? (
                                  <span className="text-blue-600 font-mono">#{transaction.orderId}</span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Credit Limit Dialog */}
        <Dialog open={showCreditDialog} onOpenChange={setShowCreditDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Update Credit Limit</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="customer-info">Customer</Label>
                <div className="mt-1 p-2 bg-gray-50 rounded">
                  <p className="font-medium">{selectedCustomer?.firstName} {selectedCustomer?.lastName}</p>
                  <p className="text-sm text-gray-600">{selectedCustomer?.company || selectedCustomer?.username}</p>
                </div>
              </div>
              
              <div>
                <Label htmlFor="credit-limit">Credit Limit</Label>
                <Input
                  id="credit-limit"
                  type="number"
                  value={creditLimitInput}
                  onChange={(e) => setCreditLimitInput(e.target.value)}
                  placeholder="Enter credit limit"
                  step="0.01"
                  min="0"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreditDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleUpdateCreditLimit}
                  disabled={updateCreditLimitMutation.isPending}
                >
                  {updateCreditLimitMutation.isPending ? 'Updating...' : 'Update'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Process Payment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="customer-info">Customer</Label>
                <div className="mt-1 p-2 bg-gray-50 rounded">
                  <p className="font-medium">{selectedCustomer?.firstName} {selectedCustomer?.lastName}</p>
                  <p className="text-sm text-gray-600">{selectedCustomer?.company || selectedCustomer?.username}</p>
                  <p className="text-sm">Current Balance: <span className={getBalanceColor(selectedCustomer?.currentBalance || 0)}>{getBalanceText(selectedCustomer?.currentBalance || 0)}</span></p>
                </div>
              </div>
              
              <div>
                <Label htmlFor="payment-amount">Payment Amount</Label>
                <Input
                  id="payment-amount"
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="Enter payment amount"
                  step="0.01"
                  min="0"
                />
              </div>
              
              <div>
                <Label htmlFor="payment-method">Payment Method</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                    <SelectItem value="electronic">Electronic Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {paymentMethod === 'check' && (
                <div>
                  <Label htmlFor="check-number">Check Number</Label>
                  <Input
                    id="check-number"
                    value={checkNumber}
                    onChange={(e) => setCheckNumber(e.target.value)}
                    placeholder="Enter check number"
                  />
                </div>
              )}
              
              <div>
                <Label htmlFor="payment-notes">Notes (Optional)</Label>
                <Textarea
                  id="payment-notes"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Enter payment notes"
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleProcessPayment}
                  disabled={processPaymentMutation.isPending}
                >
                  {processPaymentMutation.isPending ? 'Processing...' : 'Process Payment'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Credit History Dialog */}
        <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Credit Transaction History</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="customer-info">Customer</Label>
                <div className="mt-1 p-2 bg-gray-50 rounded">
                  <p className="font-medium">{selectedCustomer?.firstName} {selectedCustomer?.lastName}</p>
                  <p className="text-sm text-gray-600">{selectedCustomer?.company || selectedCustomer?.username}</p>
                  <p className="text-sm">Current Balance: <span className={balanceColor(selectedCustomer?.currentBalance)}>{balanceText(selectedCustomer?.currentBalance)}</span></p>
                </div>
              </div>
              
              {selectedCustomer && (
                <CreditTransactionHistory customerId={selectedCustomer.id} />
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* Customer Credit Manager Dialog */}
        <Dialog open={showCustomerManagerDialog} onOpenChange={setShowCustomerManagerDialog}>
          <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Customer Credit Management</DialogTitle>
            </DialogHeader>
            {selectedCustomer && (
              <CustomerCreditManager 
                customerId={selectedCustomer.id}
                customerName={`${selectedCustomer.firstName} ${selectedCustomer.lastName}`.trim() || selectedCustomer.username}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}