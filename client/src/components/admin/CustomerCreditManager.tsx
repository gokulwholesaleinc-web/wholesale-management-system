import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CreditCard, DollarSign, FileText, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { availableFrom, fmtUSD, owedFromBalance, isOverLimit, validatePaymentAmount } from '@/lib/credit';

interface CustomerCreditManagerProps {
  customerId: string;
  customerName: string;
}

interface CreditAccount {
  id: number;
  customerId: string;
  creditLimit: number;
  currentBalance: number; // positive = credit, negative = owed
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UnpaidInvoice {
  id: number;
  orderId: number;
  amount: number;
  status: string;
  createdAt: string;
  dueDate?: string;
}

type TxType = 'charge' | 'payment' | 'adjustment';

interface CreditTransaction {
  id: number;
  customerId: string;
  orderId?: number;
  invoicePaymentId?: number;
  transactionType: TxType;
  amount: number;
  description: string;
  processedBy: string;
  createdAt: string;
}

export function CustomerCreditManager({ customerId, customerName }: CustomerCreditManagerProps) {
  const [creditLimit, setCreditLimit] = useState('');
  const [paymentType, setPaymentType] = useState<'cash' | 'check' | 'electronic'>('cash');
  const [checkNumber, setCheckNumber] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<UnpaidInvoice | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: creditAccount } = useQuery<CreditAccount>({
    queryKey: ['/api/admin/customers', customerId, 'credit-account'],
    queryFn: () => apiRequest(`/api/admin/customers/${customerId}/credit-account`),
  });

  const { data: unpaidInvoices = [], isLoading: loadingInvoices } = useQuery<UnpaidInvoice[]>({
    queryKey: ['/api/admin/customers', customerId, 'unpaid-invoices'],
    queryFn: () => apiRequest(`/api/admin/customers/${customerId}/unpaid-invoices`),
  });

  const { data: transactions = [], isLoading: loadingTransactions } = useQuery<CreditTransaction[]>({
    queryKey: ['/api/admin/customers', customerId, 'credit-transactions'],
    queryFn: () => apiRequest(`/api/admin/customers/${customerId}/credit-transactions`),
  });

  const updateCreditLimitMutation = useMutation({
    mutationFn: (newLimit: number) =>
      apiRequest('PUT', `/api/admin/customers/${customerId}/credit-limit`, { creditLimit: newLimit }),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Credit limit updated successfully' });
      queryClient.invalidateQueries({
        predicate: (q) => {
          const k = q.queryKey as unknown as string[];
          return Array.isArray(k) && k[0]?.startsWith('/api/admin/customers');
        },
      });
      setCreditLimit('');
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update credit limit', variant: 'destructive' });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: (data: { invoicePaymentId: number; paymentType: 'cash' | 'check' | 'electronic'; checkNumber?: string; amount: number }) =>
      apiRequest('POST', `/api/admin/invoices/${data.invoicePaymentId}/mark-paid`, {
        paymentType: data.paymentType,
        checkNumber: data.checkNumber,
        customerId,
        amount: data.amount,
        paymentNotes: paymentNotes || (data.paymentType === 'check' && data.checkNumber ? `Check #${data.checkNumber}` : ''),
      }),
    onSuccess: () => {
      toast({ title: 'Success', description: 'Invoice marked as paid' });
      queryClient.invalidateQueries({
        predicate: (q) => {
          const k = q.queryKey as unknown as string[];
          return Array.isArray(k) && k[0]?.startsWith('/api/admin/customers');
        },
      });
      setSelectedInvoice(null);
      setPaymentType('cash');
      setCheckNumber('');
      setPaymentNotes('');
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to process payment', variant: 'destructive' });
    },
  });

  const handleUpdateCreditLimit = () => {
    const limit = Number(creditLimit);
    if (!Number.isFinite(limit) || limit < 0) {
      toast({ title: 'Error', description: 'Please enter a valid credit limit', variant: 'destructive' });
      return;
    }
    updateCreditLimitMutation.mutate(limit);
  };

  const handleMarkInvoicePaid = () => {
    if (!selectedInvoice) return;
    
    // Validate payment method
    if (paymentType === 'check' && !checkNumber.trim()) {
      toast({ title: 'Error', description: 'Check number is required for check payments', variant: 'destructive' });
      return;
    }

    // Validate payment amount
    const validation = validatePaymentAmount(selectedInvoice.amount, creditAccount?.currentBalance);
    if (!validation.isValid) {
      toast({ title: 'Invalid payment', description: validation.error, variant: 'destructive' });
      return;
    }

    markPaidMutation.mutate({
      invoicePaymentId: selectedInvoice.id,
      paymentType,
      checkNumber: paymentType === 'check' ? checkNumber : undefined,
      amount: selectedInvoice.amount,
    });
  };

  const formatDate = (s: string) => new Date(s).toLocaleDateString();
  const formatDateTime = (s: string) => new Date(s).toLocaleString();

  const limit = creditAccount?.creditLimit ?? 0;
  const balance = creditAccount?.currentBalance ?? 0;
  const available = availableFrom(limit, balance);
  const owed = owedFromBalance(balance);

  return (
    <div className="space-y-6">
      {/* Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" /> Credit Account - {customerName}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{fmtUSD(limit)}</div>
              <div className="text-sm text-gray-500">Credit Limit</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {balance >= 0 ? `${fmtUSD(balance)} Credit` : `${fmtUSD(owed)} Owed`}
              </div>
              <div className="text-sm text-gray-500">Current Balance</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{fmtUSD(available)}</div>
              <div className="text-sm text-gray-500">Available Credit</div>
            </div>
            <div className="text-center">
              <div className="space-y-2">
                <Badge variant={creditAccount?.isActive ? 'default' : 'destructive'}>
                  {creditAccount?.isActive ? 'Active' : 'Inactive'}
                </Badge>
                {isOverLimit(limit, balance) && (
                  <Badge variant="destructive">Over Limit</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Update Limit */}
          <div className="mt-6 flex gap-2">
            <div className="flex-1">
              <Label htmlFor="creditLimit">Update Credit Limit</Label>
              <Input 
                id="creditLimit" 
                type="number" 
                placeholder="Enter new credit limit" 
                value={creditLimit} 
                onChange={(e) => setCreditLimit(e.target.value)} 
                min="0" 
                step="0.01" 
              />
            </div>
            <Button 
              onClick={handleUpdateCreditLimit} 
              disabled={updateCreditLimitMutation.isPending} 
              className="mt-6"
            >
              {updateCreditLimitMutation.isPending ? 'Updating...' : 'Update'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Unpaid Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Unpaid Invoices ({unpaidInvoices.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingInvoices ? (
            <div className="flex items-center justify-center py-4">
              <div className="text-sm text-gray-500">Loading invoices...</div>
            </div>
          ) : unpaidInvoices.length === 0 ? (
            <div className="text-center text-gray-500 py-4">No unpaid invoices</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unpaidInvoices.map((inv) => (
                  <TableRow key={inv.id}>
                    <TableCell>#{inv.orderId}</TableCell>
                    <TableCell className="font-medium">{fmtUSD(inv.amount)}</TableCell>
                    <TableCell>{formatDate(inv.createdAt)}</TableCell>
                    <TableCell>
                      <Badge variant="destructive">{inv.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" onClick={() => setSelectedInvoice(inv)}>
                            Mark Paid
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Mark Invoice as Paid</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Order #{selectedInvoice?.orderId}</Label>
                              <div className="text-2xl font-bold text-green-600">
                                {fmtUSD(selectedInvoice?.amount ?? 0)}
                              </div>
                            </div>

                            <div>
                              <Label htmlFor="paymentType">Payment Method</Label>
                              <Select value={paymentType} onValueChange={(v: any) => setPaymentType(v)}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select payment method" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="cash">Cash</SelectItem>
                                  <SelectItem value="check">Check</SelectItem>
                                  <SelectItem value="electronic">Electronic Payment</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {paymentType === 'check' && (
                              <div>
                                <Label htmlFor="checkNumber">Check Number</Label>
                                <Input 
                                  id="checkNumber" 
                                  placeholder="Enter check number" 
                                  value={checkNumber} 
                                  onChange={(e) => setCheckNumber(e.target.value)} 
                                />
                              </div>
                            )}

                            <div>
                              <Label htmlFor="paymentNotes">Notes (Optional)</Label>
                              <Textarea 
                                id="paymentNotes" 
                                placeholder="Payment notes..." 
                                value={paymentNotes} 
                                onChange={(e) => setPaymentNotes(e.target.value)} 
                              />
                            </div>

                            <Button 
                              onClick={handleMarkInvoicePaid} 
                              disabled={markPaidMutation.isPending} 
                              className="w-full"
                            >
                              <DollarSign className="h-4 w-4 mr-2" />
                              {markPaidMutation.isPending ? 'Processing...' : 'Mark as Paid'}
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Transaction History (compact) */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" /> Recent Transaction History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTransactions ? (
            <div className="flex items-center justify-center py-4">
              <div className="text-sm text-gray-500">Loading transactions...</div>
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center text-gray-500 py-4">No transaction history</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Processed By</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.slice(0, 10).map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm">{formatDateTime(t.createdAt)}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          t.transactionType === 'payment' ? 'default' : 
                          t.transactionType === 'charge' ? 'destructive' : 'secondary'
                        }
                      >
                        {t.transactionType}
                      </Badge>
                    </TableCell>
                    <TableCell className={`font-medium ${t.transactionType === 'payment' ? 'text-green-600' : 'text-red-600'}`}>
                      {t.transactionType === 'payment' ? '+' : '-'}{fmtUSD(Math.abs(t.amount))}
                    </TableCell>
                    <TableCell className="text-sm">{t.description}</TableCell>
                    <TableCell className="text-sm text-gray-600">{t.processedBy}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          
          {transactions.length > 10 && (
            <div className="mt-4 text-center">
              <div className="text-sm text-gray-500">
                Showing 10 most recent transactions. Total: {transactions.length}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}