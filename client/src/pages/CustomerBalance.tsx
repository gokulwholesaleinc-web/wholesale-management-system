import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AppLayout } from '@/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { 
  CreditCard, 
  DollarSign, 
  Calendar, 
  FileText, 
  TrendingUp, 
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface CreditAccount {
  id: string;
  customerId: string;
  creditLimit: number;
  currentBalance: number;
  availableCredit: number;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  createdAt: string;
  updatedAt: string;
}

interface CreditTransaction {
  id: string;
  customerId: string;
  type: 'payment' | 'charge' | 'credit' | 'adjustment';
  amount: number;
  description: string;
  referenceNumber?: string;
  processedBy?: string;
  processedAt: string;
  balanceAfter: number;
}

interface UnpaidInvoice {
  id: string;
  orderId: number;
  amount: number;
  dueDate: string;
  status: string;
  description: string;
  createdAt: string;
}

export default function CustomerBalance() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'transactions' | 'invoices'>('overview');

  // Fetch customer credit account
  const { data: creditAccount, isLoading: accountLoading } = useQuery({
    queryKey: ['/api/customer/credit-account'],
    enabled: !!user?.id,
  });

  // Fetch credit transaction history
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['/api/customer/credit-transactions'],
    enabled: !!user?.id && activeTab === 'transactions',
  });

  // Fetch unpaid invoices
  const { data: unpaidInvoices, isLoading: invoicesLoading } = useQuery({
    queryKey: ['/api/customer/unpaid-invoices'],
    enabled: !!user?.id && activeTab === 'invoices',
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'payment':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'charge':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'credit':
        return <DollarSign className="h-4 w-4 text-blue-600" />;
      case 'adjustment':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'payment':
        return 'text-green-600';
      case 'charge':
        return 'text-red-600';
      case 'credit':
        return 'text-blue-600';
      case 'adjustment':
        return 'text-yellow-600';
      default:
        return 'text-gray-600';
    }
  };

  const getInvoiceStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'success';
      case 'overdue':
        return 'destructive';
      case 'pending':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  return (
    <AppLayout title="Account Balance" description="View your credit account balance, payment history, and outstanding invoices">
      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-6 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Account Balance</h1>
          <p className="text-gray-600 mt-2">
            Manage your credit account and view payment history
          </p>
        </div>

        {/* Credit Account Overview */}
        {accountLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : creditAccount ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-sm font-medium text-gray-600">
                  <CreditCard className="h-4 w-4 mr-2" />
                  Credit Limit
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(creditAccount.creditLimit)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-sm font-medium text-gray-600">
                  <DollarSign className="h-4 w-4 mr-2" />
                  Current Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {formatCurrency(creditAccount.currentBalance)}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Available: {formatCurrency(creditAccount.availableCredit)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center text-sm font-medium text-gray-600">
                  <Calendar className="h-4 w-4 mr-2" />
                  Last Payment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">
                  {creditAccount.lastPaymentAmount 
                    ? formatCurrency(creditAccount.lastPaymentAmount)
                    : 'None'
                  }
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {creditAccount.lastPaymentDate 
                    ? format(new Date(creditAccount.lastPaymentDate), 'MMM d, yyyy')
                    : 'No payments yet'
                  }
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="mb-8">
            <CardContent className="p-6 text-center">
              <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Credit Account Found</h3>
              <p className="text-gray-600">
                You don't have a credit account set up yet. Contact our team to set up credit terms.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-6">
          <Button
            variant={activeTab === 'overview' ? 'default' : 'outline'}
            onClick={() => setActiveTab('overview')}
            className="flex items-center"
          >
            <FileText className="h-4 w-4 mr-2" />
            Account Overview
          </Button>
          <Button
            variant={activeTab === 'transactions' ? 'default' : 'outline'}
            onClick={() => setActiveTab('transactions')}
            className="flex items-center"
          >
            <Clock className="h-4 w-4 mr-2" />
            Transaction History
          </Button>
          <Button
            variant={activeTab === 'invoices' ? 'default' : 'outline'}
            onClick={() => setActiveTab('invoices')}
            className="flex items-center"
          >
            <AlertCircle className="h-4 w-4 mr-2" />
            Outstanding Invoices
          </Button>
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && creditAccount && (
          <Card>
            <CardHeader>
              <CardTitle>Account Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Credit Utilization</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Used</span>
                      <span>{formatCurrency(creditAccount.currentBalance)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Available</span>
                      <span>{formatCurrency(creditAccount.availableCredit)}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ 
                          width: `${(creditAccount.currentBalance / creditAccount.creditLimit) * 100}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Account Information</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Account Created</span>
                      <span>{format(new Date(creditAccount.createdAt), 'MMM d, yyyy')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Updated</span>
                      <span>{format(new Date(creditAccount.updatedAt), 'MMM d, yyyy')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === 'transactions' && (
          <Card>
            <CardHeader>
              <CardTitle>Transaction History</CardTitle>
            </CardHeader>
            <CardContent>
              {transactionsLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-4 animate-pulse">
                      <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                    </div>
                  ))}
                </div>
              ) : transactions && transactions.length > 0 ? (
                <div className="space-y-4">
                  {transactions.map((transaction: CreditTransaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getTransactionIcon(transaction.type)}
                        <div>
                          <div className="font-medium">{transaction.description}</div>
                          <div className="text-sm text-gray-600">
                            {format(new Date(transaction.processedAt), 'MMM d, yyyy h:mm a')}
                            {transaction.processedBy && ` • Processed by ${transaction.processedBy}`}
                          </div>
                          {transaction.referenceNumber && (
                            <div className="text-xs text-gray-500">
                              Ref: {transaction.referenceNumber}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-semibold ${getTransactionColor(transaction.type)}`}>
                          {transaction.type === 'payment' ? '+' : '-'}{formatCurrency(Math.abs(transaction.amount))}
                        </div>
                        <div className="text-sm text-gray-500">
                          Balance: {formatCurrency(transaction.balanceAfter)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Transactions Yet</h3>
                  <p className="text-gray-600">
                    Your credit transaction history will appear here once you start making payments or charges.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {activeTab === 'invoices' && (
          <Card>
            <CardHeader>
              <CardTitle>Outstanding Invoices</CardTitle>
            </CardHeader>
            <CardContent>
              {invoicesLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border rounded-lg animate-pulse">
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                        <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                      </div>
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                    </div>
                  ))}
                </div>
              ) : unpaidInvoices && unpaidInvoices.length > 0 ? (
                <div className="space-y-4">
                  {unpaidInvoices.map((invoice: UnpaidInvoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="font-medium">Invoice #{invoice.id}</div>
                          <div className="text-sm text-gray-600">{invoice.description}</div>
                          <div className="text-xs text-gray-500">
                            Created: {format(new Date(invoice.createdAt), 'MMM d, yyyy')}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-lg">{formatCurrency(invoice.amount)}</div>
                        <div className="text-sm text-gray-600">
                          Due: {format(new Date(invoice.dueDate), 'MMM d, yyyy')}
                        </div>
                        <Badge variant={getInvoiceStatusColor(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
                  <p className="text-gray-600">
                    You have no outstanding invoices. All your payments are up to date.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}