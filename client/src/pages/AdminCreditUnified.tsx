import { useState, useEffect } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreditCard, DollarSign, FileText, Search, AlertTriangle, Users, Filter, History, TrendingUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface UnifiedCreditData {
  customer_id: string;
  term: string;
  on_credit_hold: boolean;
  credit_limit_cents: number;
  creditlimit: number; // legacy dollars
  currentbalance: number; // legacy dollars (computed from A/R)
  exposure_cents: number;
  username?: string;
  business_name?: string;
  email?: string;
}

export default function AdminCreditUnified() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<UnifiedCreditData | null>(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [limitUSD, setLimitUSD] = useState<string>('');
  const [term, setTerm] = useState<string>('Prepaid');
  const [hold, setHold] = useState<boolean>(false);

  // Fetch all customers with unified credit data
  const { data: customers = [], isLoading } = useQuery<UnifiedCreditData[]>({
    queryKey: ['/api/credit'],
  });

  // Update credit settings mutation
  const updateCreditMutation = useMutation({
    mutationFn: async (data: { 
      customerId: string; 
      creditLimitCents: number;
      term: string; 
      onCreditHold: boolean; 
    }) => {
      return await apiRequest('PATCH', `/api/credit/${data.customerId}`, {
        creditLimitCents: data.creditLimitCents,
        term: data.term,
        onCreditHold: data.onCreditHold,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Credit settings updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/credit'] });
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

  const getCreditTermBadge = (termValue: string) => {
    const colors: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
      'Prepaid': 'default',
      'Net7': 'secondary',
      'Net15': 'outline',
      'Net30': 'outline',
      'Net45': 'destructive',
    };
    return <Badge variant={colors[termValue] || 'outline'}>{termValue}</Badge>;
  };

  const handleEditCustomer = (customer: UnifiedCreditData) => {
    setSelectedCustomer(customer);
    setLimitUSD(((customer.credit_limit_cents || 0) / 100).toFixed(2));
    setTerm(customer.term || 'Prepaid');
    setHold(customer.on_credit_hold || false);
    setShowEditDialog(true);
  };

  const handleSave = () => {
    if (!selectedCustomer) return;
    
    const limitCents = Math.max(0, Math.round(parseFloat(limitUSD || '0') * 100));
    
    updateCreditMutation.mutate({
      customerId: selectedCustomer.customer_id,
      creditLimitCents: limitCents,
      term,
      onCreditHold: hold,
    });
  };

  const filteredCustomers = customers.filter(customer => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      customer.username?.toLowerCase().includes(searchLower) ||
      customer.business_name?.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower)
    );
  });

  const creditStats = {
    totalCustomers: customers.length,
    customersWithCredit: customers.filter(c => (c.credit_limit_cents || 0) > 0).length,
    customersOnHold: customers.filter(c => c.on_credit_hold).length,
    totalCreditLimit: customers.reduce((sum, c) => sum + (c.credit_limit_cents || 0), 0) / 100,
    totalExposure: customers.reduce((sum, c) => sum + (c.exposure_cents || 0), 0) / 100,
  };

  if (isLoading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Loading credit management...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <BreadcrumbNavigation />

        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Unified Credit Management</h1>
        </div>

        {/* Credit Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{creditStats.totalCustomers}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">With Credit</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{creditStats.customersWithCredit}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">On Hold</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{creditStats.customersOnHold}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Credit Limit</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${creditStats.totalCreditLimit.toFixed(0)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Exposure</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${creditStats.totalExposure.toFixed(0)}</div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Customer Credit Management</CardTitle>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Credit Terms</TableHead>
                    <TableHead>Credit Limit</TableHead>
                    <TableHead>Current Exposure</TableHead>
                    <TableHead>Available Credit</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCustomers.map((customer) => {
                    const exposureCents = customer.exposure_cents || 0;
                    const limitCents = customer.credit_limit_cents || 0;
                    const availableCents = limitCents - exposureCents;
                    const exposureUSD = exposureCents / 100;
                    const limitUSD = limitCents / 100;
                    const availableUSD = availableCents / 100;
                    const isOverLimit = availableCents < 0;
                    
                    return (
                      <TableRow key={customer.customer_id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{customer.username}</p>
                            <p className="text-sm text-muted-foreground">{customer.email}</p>
                          </div>
                        </TableCell>
                        <TableCell>{customer.business_name || 'N/A'}</TableCell>
                        <TableCell>{getCreditTermBadge(customer.term)}</TableCell>
                        <TableCell className="font-mono">${limitUSD.toFixed(2)}</TableCell>
                        <TableCell className="font-mono">${exposureUSD.toFixed(2)}</TableCell>
                        <TableCell className={`font-mono ${isOverLimit ? 'text-red-600' : ''}`}>
                          ${availableUSD.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          {customer.on_credit_hold ? (
                            <Badge variant="destructive">On Hold</Badge>
                          ) : isOverLimit ? (
                            <Badge variant="outline" className="text-red-600 border-red-600">Over Limit</Badge>
                          ) : (
                            <Badge variant="secondary">Active</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditCustomer(customer)}
                          >
                            Edit
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Edit Credit Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Credit Settings</DialogTitle>
            </DialogHeader>
            {selectedCustomer && (
              <div className="space-y-4">
                <div>
                  <p className="font-medium">{selectedCustomer.username}</p>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.business_name}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="creditLimit">Credit Limit (USD)</Label>
                    <Input
                      id="creditLimit"
                      value={limitUSD}
                      onChange={(e) => setLimitUSD(e.target.value)}
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="creditTerms">Credit Terms</Label>
                    <Select value={term} onValueChange={setTerm}>
                      <SelectTrigger>
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
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="creditHold"
                    checked={hold}
                    onChange={(e) => setHold(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <Label htmlFor="creditHold">Place customer on credit hold</Label>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="font-medium mb-2">Current Exposure</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="p-2 bg-gray-50 rounded">
                      <p className="text-muted-foreground">Limit</p>
                      <p className="font-mono">${((selectedCustomer.credit_limit_cents || 0) / 100).toFixed(2)}</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded">
                      <p className="text-muted-foreground">Open A/R</p>
                      <p className="font-mono">${((selectedCustomer.exposure_cents || 0) / 100).toFixed(2)}</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded">
                      <p className="text-muted-foreground">Available</p>
                      <p className={`font-mono ${((selectedCustomer.credit_limit_cents || 0) - (selectedCustomer.exposure_cents || 0)) < 0 ? 'text-red-600' : ''}`}>
                        ${(((selectedCustomer.credit_limit_cents || 0) - (selectedCustomer.exposure_cents || 0)) / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={() => setShowEditDialog(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave} disabled={updateCreditMutation.isPending}>
                    {updateCreditMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}