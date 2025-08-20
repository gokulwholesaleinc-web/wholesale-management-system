import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArInvoice, ArPayment } from '@shared/schema';
// Currency formatting utility
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};
import { CreditCard, TrendingUp, Users, AlertTriangle, Plus } from 'lucide-react';

interface CustomerWithAging {
  customerId: string;
  customer: {
    id: string;
    username: string;
    businessName: string;
    creditTerm: string;
  };
  bucket_0_30: number;
  bucket_31_60: number;
  bucket_61_90: number;
  bucket_90_plus: number;
  total: number;
}

interface CustomerSummary {
  customer: {
    id: string;
    username: string;
    businessName: string;
    creditTerm: string;
    creditLimitCents: number;
    onCreditHold: boolean;
  };
  exposure: number;
  aging: {
    bucket_0_30: number;
    bucket_31_60: number;
    bucket_61_90: number;
    bucket_90_plus: number;
  };
  available: number;
}

export default function AccountsReceivable() {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);

  // Fetch aging report
  const { data: agingData = [], isLoading: agingLoading } = useQuery<CustomerWithAging[]>({
    queryKey: ['/api/ar/aging'],
  });

  // Fetch customer summary when customer selected
  const { data: customerSummary, isLoading: summaryLoading } = useQuery<CustomerSummary>({
    queryKey: ['/api/ar/summary', selectedCustomerId],
    enabled: !!selectedCustomerId,
  });

  // Fetch customer invoices
  const { data: customerInvoices = [] } = useQuery<ArInvoice[]>({
    queryKey: ['/api/ar/invoices', selectedCustomerId],
    enabled: !!selectedCustomerId,
  });

  // Fetch customer payments
  const { data: customerPayments = [] } = useQuery<ArPayment[]>({
    queryKey: ['/api/ar/payments', selectedCustomerId],
    enabled: !!selectedCustomerId,
  });

  const totalAging = agingData.reduce((acc, customer) => ({
    bucket_0_30: acc.bucket_0_30 + customer.bucket_0_30,
    bucket_31_60: acc.bucket_31_60 + customer.bucket_31_60,
    bucket_61_90: acc.bucket_61_90 + customer.bucket_61_90,
    bucket_90_plus: acc.bucket_90_plus + customer.bucket_90_plus,
    total: acc.total + customer.total,
  }), { bucket_0_30: 0, bucket_31_60: 0, bucket_61_90: 0, bucket_90_plus: 0, total: 0 });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge variant="destructive">Open</Badge>;
      case 'paid':
        return <Badge variant="default">Paid</Badge>;
      case 'void':
        return <Badge variant="secondary">Void</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getCreditTermBadge = (term: string) => {
    const colors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      'Prepaid': 'default',
      'Net7': 'secondary',
      'Net15': 'outline',
      'Net30': 'outline',
      'Net45': 'destructive',
    };
    return <Badge variant={colors[term] || 'outline'}>{term}</Badge>;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Accounts Receivable</h1>
        <div className="flex gap-2">
          <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Invoice
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Manual Invoice</DialogTitle>
              </DialogHeader>
              <InvoiceForm onClose={() => setShowInvoiceDialog(false)} />
            </DialogContent>
          </Dialog>
          
          <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <CreditCard className="w-4 h-4 mr-2" />
                Record Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Record Customer Payment</DialogTitle>
              </DialogHeader>
              <PaymentForm onClose={() => setShowPaymentDialog(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total A/R</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAging.total / 100)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current (0-30)</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totalAging.bucket_0_30 / 100)}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Past Due (31-90)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {formatCurrency((totalAging.bucket_31_60 + totalAging.bucket_61_90) / 100)}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Seriously Past Due (90+)</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totalAging.bucket_90_plus / 100)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="aging" className="w-full">
        <TabsList>
          <TabsTrigger value="aging">Aging Report</TabsTrigger>
          <TabsTrigger value="customer">Customer Detail</TabsTrigger>
        </TabsList>
        
        <TabsContent value="aging" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Aging Report</CardTitle>
            </CardHeader>
            <CardContent>
              {agingLoading ? (
                <div>Loading aging report...</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="border border-gray-200 px-4 py-2 text-left">Customer</th>
                        <th className="border border-gray-200 px-4 py-2 text-left">Terms</th>
                        <th className="border border-gray-200 px-4 py-2 text-right">Current (0-30)</th>
                        <th className="border border-gray-200 px-4 py-2 text-right">31-60 Days</th>
                        <th className="border border-gray-200 px-4 py-2 text-right">61-90 Days</th>
                        <th className="border border-gray-200 px-4 py-2 text-right">90+ Days</th>
                        <th className="border border-gray-200 px-4 py-2 text-right">Total</th>
                        <th className="border border-gray-200 px-4 py-2 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {agingData.map((customer) => (
                        <tr key={customer.customerId} className="hover:bg-gray-50">
                          <td className="border border-gray-200 px-4 py-2">
                            <div>
                              <div className="font-medium">{customer.customer.businessName || customer.customer.username}</div>
                              <div className="text-sm text-gray-500">{customer.customer.username}</div>
                            </div>
                          </td>
                          <td className="border border-gray-200 px-4 py-2">
                            {getCreditTermBadge(customer.customer.creditTerm)}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-right font-mono text-green-600">
                            {formatCurrency(customer.bucket_0_30 / 100)}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-right font-mono text-yellow-600">
                            {formatCurrency(customer.bucket_31_60 / 100)}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-right font-mono text-orange-600">
                            {formatCurrency(customer.bucket_61_90 / 100)}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-right font-mono text-red-600">
                            {formatCurrency(customer.bucket_90_plus / 100)}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-right font-mono font-bold">
                            {formatCurrency(customer.total / 100)}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-center">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedCustomerId(customer.customerId);
                              }}
                            >
                              View Details
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="customer" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Select Customer</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a customer to view details" />
                </SelectTrigger>
                <SelectContent>
                  {agingData.map((customer) => (
                    <SelectItem key={customer.customerId} value={customer.customerId}>
                      {customer.customer.businessName || customer.customer.username}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {selectedCustomerId && customerSummary && (
            <>
              {/* Customer Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Customer Summary</span>
                    {customerSummary.customer.onCreditHold && (
                      <Badge variant="destructive">CREDIT HOLD</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Credit Limit</Label>
                      <p className="text-lg font-bold">{formatCurrency(customerSummary.customer.creditLimitCents / 100)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Current Exposure</Label>
                      <p className="text-lg font-bold text-red-600">{formatCurrency(customerSummary.exposure / 100)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Available Credit</Label>
                      <p className="text-lg font-bold text-green-600">{formatCurrency(customerSummary.available / 100)}</p>
                    </div>
                    <div>
                      <Label className="text-sm font-medium text-gray-500">Terms</Label>
                      <p className="text-lg">{getCreditTermBadge(customerSummary.customer.creditTerm)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Tabs defaultValue="invoices" className="w-full">
                <TabsList>
                  <TabsTrigger value="invoices">Open Invoices</TabsTrigger>
                  <TabsTrigger value="payments">Recent Payments</TabsTrigger>
                </TabsList>
                
                <TabsContent value="invoices">
                  <Card>
                    <CardHeader>
                      <CardTitle>Open Invoices</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="border border-gray-200 px-4 py-2 text-left">Invoice #</th>
                              <th className="border border-gray-200 px-4 py-2 text-left">Issue Date</th>
                              <th className="border border-gray-200 px-4 py-2 text-left">Due Date</th>
                              <th className="border border-gray-200 px-4 py-2 text-left">Status</th>
                              <th className="border border-gray-200 px-4 py-2 text-right">Total</th>
                              <th className="border border-gray-200 px-4 py-2 text-right">Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customerInvoices.map((invoice) => (
                              <tr key={invoice.id} className="hover:bg-gray-50">
                                <td className="border border-gray-200 px-4 py-2 font-mono">
                                  {invoice.invoiceNo || invoice.id.slice(0, 8)}
                                </td>
                                <td className="border border-gray-200 px-4 py-2">
                                  {new Date(invoice.issueDate).toLocaleDateString()}
                                </td>
                                <td className="border border-gray-200 px-4 py-2">
                                  {invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : '-'}
                                </td>
                                <td className="border border-gray-200 px-4 py-2">
                                  {getStatusBadge(invoice.status)}
                                </td>
                                <td className="border border-gray-200 px-4 py-2 text-right font-mono">
                                  {formatCurrency(invoice.totalCents / 100)}
                                </td>
                                <td className="border border-gray-200 px-4 py-2 text-right font-mono font-bold">
                                  {formatCurrency(invoice.balanceCents / 100)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="payments">
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Payments</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse border border-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="border border-gray-200 px-4 py-2 text-left">Date</th>
                              <th className="border border-gray-200 px-4 py-2 text-left">Method</th>
                              <th className="border border-gray-200 px-4 py-2 text-left">Reference</th>
                              <th className="border border-gray-200 px-4 py-2 text-right">Amount</th>
                              <th className="border border-gray-200 px-4 py-2 text-right">Unapplied</th>
                            </tr>
                          </thead>
                          <tbody>
                            {customerPayments.map((payment) => (
                              <tr key={payment.id} className="hover:bg-gray-50">
                                <td className="border border-gray-200 px-4 py-2">
                                  {new Date(payment.receivedAt).toLocaleDateString()}
                                </td>
                                <td className="border border-gray-200 px-4 py-2 capitalize">
                                  {payment.method}
                                </td>
                                <td className="border border-gray-200 px-4 py-2 font-mono text-sm">
                                  {payment.reference || '-'}
                                </td>
                                <td className="border border-gray-200 px-4 py-2 text-right font-mono">
                                  {formatCurrency(payment.amountCents / 100)}
                                </td>
                                <td className="border border-gray-200 px-4 py-2 text-right font-mono">
                                  {formatCurrency(payment.unappliedCents / 100)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InvoiceForm({ onClose }: { onClose: () => void }) {
  // TODO: Implement invoice creation form
  return (
    <div className="space-y-4">
      <p>Invoice creation form will be implemented here.</p>
      <Button onClick={onClose}>Close</Button>
    </div>
  );
}

function PaymentForm({ onClose }: { onClose: () => void }) {
  // TODO: Implement payment recording form
  return (
    <div className="space-y-4">
      <p>Payment recording form will be implemented here.</p>
      <Button onClick={onClose}>Close</Button>
    </div>
  );
}