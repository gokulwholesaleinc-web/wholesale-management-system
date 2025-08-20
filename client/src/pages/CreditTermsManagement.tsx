import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { CreditCard, AlertTriangle, DollarSign, Edit, UserCheck } from 'lucide-react';

// Currency formatting utility
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

interface Customer {
  id: string;
  username: string;
  businessName: string;
  creditTerm: string;
  creditLimitCents: number;
  onCreditHold: boolean;
  email: string;
  phone: string;
}

export default function CreditTermsManagement() {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all customers
  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ['/api/admin/users'],
  });

  // Update credit settings mutation
  const updateCreditMutation = useMutation({
    mutationFn: async (data: { 
      customerId: string; 
      creditTerm?: string; 
      creditLimitCents?: number; 
      onCreditHold?: boolean; 
    }) => {
      return await apiRequest('PUT', `/api/ar/customers/${data.customerId}/credit`, data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Credit settings updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      setShowEditDialog(false);
      setSelectedCustomer(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

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

  const getCreditHoldBadge = (onHold: boolean) => {
    return onHold ? (
      <Badge variant="destructive" className="ml-2">
        <AlertTriangle className="w-3 h-3 mr-1" />
        HOLD
      </Badge>
    ) : null;
  };

  const creditCustomers = customers.filter(c => c.creditTerm !== 'Prepaid');
  const prepaidCustomers = customers.filter(c => c.creditTerm === 'Prepaid');
  const onHoldCustomers = customers.filter(c => c.onCreditHold);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Credit Terms Management</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Credit Customers</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{creditCustomers.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prepaid Customers</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{prepaidCustomers.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Credit Hold</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{onHoldCustomers.length}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="all" className="w-full">
        <TabsList>
          <TabsTrigger value="all">All Customers</TabsTrigger>
          <TabsTrigger value="credit">Credit Customers</TabsTrigger>
          <TabsTrigger value="hold">Credit Hold</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="space-y-4">
          <CustomerTable 
            customers={customers} 
            onEdit={(customer) => {
              setSelectedCustomer(customer);
              setShowEditDialog(true);
            }}
            isLoading={isLoading}
          />
        </TabsContent>
        
        <TabsContent value="credit" className="space-y-4">
          <CustomerTable 
            customers={creditCustomers} 
            onEdit={(customer) => {
              setSelectedCustomer(customer);
              setShowEditDialog(true);
            }}
            isLoading={isLoading}
          />
        </TabsContent>
        
        <TabsContent value="hold" className="space-y-4">
          <CustomerTable 
            customers={onHoldCustomers} 
            onEdit={(customer) => {
              setSelectedCustomer(customer);
              setShowEditDialog(true);
            }}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>

      {/* Edit Credit Settings Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Credit Settings</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <CreditSettingsForm 
              customer={selectedCustomer}
              onSave={(data) => {
                updateCreditMutation.mutate({
                  customerId: selectedCustomer.id,
                  ...data
                });
              }}
              onCancel={() => {
                setShowEditDialog(false);
                setSelectedCustomer(null);
              }}
              isLoading={updateCreditMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface CustomerTableProps {
  customers: Customer[];
  onEdit: (customer: Customer) => void;
  isLoading: boolean;
}

function CustomerTable({ customers, onEdit, isLoading }: CustomerTableProps) {
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

  if (isLoading) {
    return <div className="p-8 text-center">Loading customers...</div>;
  }

  if (customers.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          No customers found in this category.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead className="bg-gray-50">
              <tr>
                <th className="border-b px-4 py-3 text-left font-medium">Customer</th>
                <th className="border-b px-4 py-3 text-left font-medium">Contact</th>
                <th className="border-b px-4 py-3 text-left font-medium">Terms</th>
                <th className="border-b px-4 py-3 text-right font-medium">Credit Limit</th>
                <th className="border-b px-4 py-3 text-center font-medium">Status</th>
                <th className="border-b px-4 py-3 text-center font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="border-b px-4 py-3">
                    <div>
                      <div className="font-medium">
                        {customer.businessName || customer.username}
                      </div>
                      {customer.businessName && (
                        <div className="text-sm text-gray-500">{customer.username}</div>
                      )}
                    </div>
                  </td>
                  <td className="border-b px-4 py-3">
                    <div className="text-sm">
                      <div>{customer.email}</div>
                      {customer.phone && (
                        <div className="text-gray-500">{customer.phone}</div>
                      )}
                    </div>
                  </td>
                  <td className="border-b px-4 py-3">
                    {getCreditTermBadge(customer.creditTerm)}
                  </td>
                  <td className="border-b px-4 py-3 text-right font-mono">
                    {formatCurrency(customer.creditLimitCents / 100)}
                  </td>
                  <td className="border-b px-4 py-3 text-center">
                    {customer.onCreditHold ? (
                      <Badge variant="destructive">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        HOLD
                      </Badge>
                    ) : (
                      <Badge variant="default">Active</Badge>
                    )}
                  </td>
                  <td className="border-b px-4 py-3 text-center">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onEdit(customer)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

interface CreditSettingsFormProps {
  customer: Customer;
  onSave: (data: { creditTerm?: string; creditLimitCents?: number; onCreditHold?: boolean }) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function CreditSettingsForm({ customer, onSave, onCancel, isLoading }: CreditSettingsFormProps) {
  const [creditTerm, setCreditTerm] = useState(customer.creditTerm);
  const [creditLimit, setCreditLimit] = useState((customer.creditLimitCents / 100).toString());
  const [onCreditHold, setOnCreditHold] = useState(customer.onCreditHold);

  const handleSave = () => {
    const creditLimitCents = Math.round(parseFloat(creditLimit || '0') * 100);
    onSave({
      creditTerm,
      creditLimitCents,
      onCreditHold,
    });
  };

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium mb-2">Customer Information</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <Label className="text-gray-500">Business Name</Label>
            <p>{customer.businessName || 'N/A'}</p>
          </div>
          <div>
            <Label className="text-gray-500">Username</Label>
            <p>{customer.username}</p>
          </div>
          <div>
            <Label className="text-gray-500">Email</Label>
            <p>{customer.email}</p>
          </div>
          <div>
            <Label className="text-gray-500">Phone</Label>
            <p>{customer.phone || 'N/A'}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="creditTerm">Credit Terms</Label>
          <Select value={creditTerm} onValueChange={setCreditTerm}>
            <SelectTrigger id="creditTerm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Prepaid">Prepaid</SelectItem>
              <SelectItem value="Net7">Net 7 Days</SelectItem>
              <SelectItem value="Net15">Net 15 Days</SelectItem>
              <SelectItem value="Net30">Net 30 Days</SelectItem>
              <SelectItem value="Net45">Net 45 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="creditLimit">Credit Limit ($)</Label>
          <Input
            id="creditLimit"
            type="number"
            step="0.01"
            min="0"
            value={creditLimit}
            onChange={(e) => setCreditLimit(e.target.value)}
            placeholder="0.00"
            disabled={creditTerm === 'Prepaid'}
          />
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="creditHold"
          checked={onCreditHold}
          onCheckedChange={setOnCreditHold}
        />
        <Label htmlFor="creditHold" className="text-sm font-medium">
          Place customer on credit hold
        </Label>
      </div>

      {onCreditHold && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <h4 className="text-red-800 font-medium">Credit Hold Warning</h4>
          </div>
          <p className="text-red-700 text-sm mt-1">
            Customer will not be able to place new orders until removed from credit hold.
          </p>
        </div>
      )}

      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </div>
  );
}