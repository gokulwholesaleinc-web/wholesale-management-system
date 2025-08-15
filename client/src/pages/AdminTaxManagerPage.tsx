import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { BreadcrumbNavigation } from "@/components/navigation/BreadcrumbNavigation";
import { Trash2, Plus, Edit, Calculator, FileText, Users, ShoppingBag } from "lucide-react";

interface FlatTax {
  id: number;
  name: string;
  description: string;
  taxType: 'per_unit' | 'percentage' | 'fixed';
  amount: number;
  countyName?: string;
  zipCodeRestriction?: string;
  applicableProducts: string[];
  customerTiers: number[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TobaccoSale {
  id: number;
  orderId: number;
  customerId: string;
  saleDate: string;
  tobaccoProducts: any[];
  totalTobaccoValue: number;
  totalTaxAmount: number;
  reportingPeriod: string;
  reportingStatus: string;
}

interface TaxCalculationAudit {
  id: number;
  orderId: number;
  customerId: string;
  customerLevel: number;
  applyFlatTax: boolean;
  calculationInput: any;
  calculationResult: any;
  totalTaxAmount: number;
  createdAt: string;
}

export default function AdminTaxManagerPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTax, setEditingTax] = useState<FlatTax | null>(null);
  const [newTax, setNewTax] = useState({
    name: '',
    description: '',
    taxType: 'per_unit' as 'per_unit' | 'percentage' | 'fixed',
    taxAmount: 0,
    countyRestriction: '',
    zipCodeRestriction: '',
    applicableProducts: [] as string[],
    customerTiers: [] as number[],
    isActive: true
  });

  // Fetch flat taxes
  const { data: flatTaxes = [], isLoading: loadingTaxes } = useQuery({
    queryKey: ['/api/admin/tax/flat-taxes'],
    queryFn: () => apiRequest('GET', '/api/admin/tax/flat-taxes')
  });

  // Fetch IL-TP1 tobacco sales
  const { data: tobaccoSales = [], isLoading: loadingTobacco } = useQuery({
    queryKey: ['/api/admin/tax/il-tp1-sales'],
    queryFn: () => apiRequest('GET', '/api/admin/tax/il-tp1-sales')
  });

  // Fetch tax calculation audits
  const { data: taxAudits = [], isLoading: loadingAudits } = useQuery({
    queryKey: ['/api/admin/tax/calculation-audits'],
    queryFn: () => apiRequest('GET', '/api/admin/tax/calculation-audits')
  });

  // Create flat tax mutation
  const createTaxMutation = useMutation({
    mutationFn: (data: any) => {
      // Send data directly without transformation - backend expects exact field names
      return apiRequest('POST', '/api/admin/tax/flat-taxes', {
        name: data.name,
        description: data.description,
        taxAmount: data.taxAmount,
        taxType: data.taxType,
        countyRestriction: data.countyRestriction,
        zipCodeRestriction: data.zipCodeRestriction,
        applicableProducts: data.applicableProducts,
        customerTiers: data.customerTiers,
        isActive: data.isActive
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tax/flat-taxes'] });
      setIsCreateDialogOpen(false);
      resetNewTax();
      toast({
        title: "Tax Created",
        description: "Flat tax has been created successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create flat tax.",
        variant: "destructive"
      });
    }
  });

  // Update flat tax mutation
  const updateTaxMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      apiRequest('PUT', `/api/admin/tax/flat-taxes/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tax/flat-taxes'] });
      setIsEditDialogOpen(false);
      setEditingTax(null);
      toast({
        title: "Tax Updated",
        description: "Flat tax has been updated successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update flat tax.",
        variant: "destructive"
      });
    }
  });

  // Delete flat tax mutation
  const deleteTaxMutation = useMutation({
    mutationFn: (id: number) => apiRequest('DELETE', `/api/admin/tax/flat-taxes/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/tax/flat-taxes'] });
      toast({
        title: "Tax Deleted",
        description: "Flat tax has been deleted successfully."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete flat tax.",
        variant: "destructive"
      });
    }
  });

  const resetNewTax = () => {
    setNewTax({
      name: '',
      description: '',
      taxType: 'per_unit',
      taxAmount: 0,
      countyRestriction: '',
      zipCodeRestriction: '',
      applicableProducts: [],
      customerTiers: [],
      isActive: true
    });
  };

  const handleCreateTax = () => {
    if (!newTax.name || newTax.taxAmount <= 0) {
      toast({
        title: "Validation Error",
        description: "Please provide a valid name and tax amount.",
        variant: "destructive"
      });
      return;
    }
    
    if (!newTax.customerTiers || newTax.customerTiers.length === 0) {
      toast({
        title: "Validation Error",
        description: "Please select at least one customer tier for this flat tax.",
        variant: "destructive"
      });
      return;
    }
    
    createTaxMutation.mutate(newTax);
  };

  const handleEditTax = (tax: FlatTax) => {
    setEditingTax(tax);
    setIsEditDialogOpen(true);
  };

  const handleUpdateTax = () => {
    if (!editingTax) return;
    updateTaxMutation.mutate({ id: editingTax.id, data: editingTax });
  };

  const formatTaxType = (type: string) => {
    switch (type) {
      case 'per_unit': return 'Per Unit';
      case 'percentage': return 'Percentage';
      case 'fixed': return 'Fixed Amount';
      default: return type;
    }
  };

  const formatTaxAmount = (amount: number | undefined | null, type: string) => {
    const safeAmount = amount || 0;
    if (type === 'percentage') {
      return `${safeAmount}%`;
    }
    return `$${safeAmount.toFixed(2)}`;
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="space-y-6">
        {/* Breadcrumb Navigation */}
        <BreadcrumbNavigation />
        
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Tax Management System</h1>
            <p className="text-muted-foreground">
              Manage flat taxes, tobacco compliance, and tax calculations
            </p>
          </div>
        </div>

        <Tabs defaultValue="flat-taxes" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="flat-taxes" className="flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Flat Taxes
            </TabsTrigger>
            <TabsTrigger value="tobacco-tracking" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              IL-TP1 Tobacco Tracking
            </TabsTrigger>
            <TabsTrigger value="tax-audits" className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" />
              Tax Calculation Audits
            </TabsTrigger>
          </TabsList>

          {/* Flat Taxes Tab */}
          <TabsContent value="flat-taxes" className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Flat Tax Management</CardTitle>
                    <CardDescription>
                      Configure county-specific and general flat taxes
                    </CardDescription>
                  </div>
                  <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Create Flat Tax
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle>Create New Flat Tax</DialogTitle>
                        <DialogDescription>
                          Add a new flat tax rule
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Tax Name</Label>
                          <Input
                            id="name"
                            value={newTax.name}
                            onChange={(e) => setNewTax({ ...newTax, name: e.target.value })}
                            placeholder="e.g., Cook County Tobacco Tax"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            value={newTax.description}
                            onChange={(e) => setNewTax({ ...newTax, description: e.target.value })}
                            placeholder="Description of this tax"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="taxType">Tax Type</Label>
                          <Select
                            value={newTax.taxType}
                            onValueChange={(value: 'per_unit' | 'percentage' | 'fixed') => 
                              setNewTax({ ...newTax, taxType: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="per_unit">Per Unit</SelectItem>
                              <SelectItem value="percentage">Percentage</SelectItem>
                              <SelectItem value="fixed">Fixed Amount</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="taxAmount">
                            Tax Amount {newTax.taxType === 'percentage' ? '(%)' : '($)'}
                          </Label>
                          <Input
                            id="taxAmount"
                            type="number"
                            step="0.01"
                            value={newTax.taxAmount}
                            onChange={(e) => setNewTax({ ...newTax, taxAmount: parseFloat(e.target.value) || 0 })}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="county">County Restriction (Optional)</Label>
                          <Input
                            id="county"
                            value={newTax.countyRestriction}
                            onChange={(e) => setNewTax({ ...newTax, countyRestriction: e.target.value })}
                            placeholder="e.g., Cook County"
                          />
                        </div>
                        
                        {/* Customer Tier Selection */}
                        <div className="space-y-2">
                          <Label>Customer Tiers (Select which tiers this tax applies to)</Label>
                          <div className="grid grid-cols-5 gap-2">
                            {[1, 2, 3, 4, 5].map((tier) => (
                              <div key={tier} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  id={`tier-${tier}`}
                                  checked={newTax.customerTiers.includes(tier)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setNewTax({
                                        ...newTax,
                                        customerTiers: [...newTax.customerTiers, tier].sort()
                                      });
                                    } else {
                                      setNewTax({
                                        ...newTax,
                                        customerTiers: newTax.customerTiers.filter(t => t !== tier)
                                      });
                                    }
                                  }}
                                  className="rounded border-gray-300"
                                />
                                <Label htmlFor={`tier-${tier}`} className="text-sm">
                                  Tier {tier}
                                </Label>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-gray-500">
                            This flat tax will only be applied to customers in the selected tiers
                          </p>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            id="isActive"
                            checked={newTax.isActive}
                            onCheckedChange={(checked) => setNewTax({ ...newTax, isActive: checked })}
                          />
                          <Label htmlFor="isActive">Active</Label>
                        </div>
                        <div className="flex gap-2 pt-4">
                          <Button 
                            onClick={handleCreateTax}
                            disabled={createTaxMutation.isPending}
                            className="flex-1"
                          >
                            {createTaxMutation.isPending ? "Creating..." : "Create Tax"}
                          </Button>
                          <Button 
                            variant="outline" 
                            onClick={() => setIsCreateDialogOpen(false)}
                            className="flex-1"
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardHeader>
              <CardContent>
                {loadingTaxes ? (
                  <div className="text-center py-4">Loading flat taxes...</div>
                ) : flatTaxes.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No flat taxes configured. Create your first flat tax to get started.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>County</TableHead>
                        <TableHead>Customer Tiers</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {flatTaxes.map((tax: FlatTax) => (
                        <TableRow key={tax.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{tax.name}</div>
                              {tax.description && (
                                <div className="text-sm text-muted-foreground">{tax.description}</div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{formatTaxType(tax.taxType)}</TableCell>
                          <TableCell>{formatTaxAmount(tax.taxAmount, tax.taxType)}</TableCell>
                          <TableCell>{tax.countyRestriction || 'All Counties'}</TableCell>
                          <TableCell>
                            <div className="flex gap-1 flex-wrap">
                              {tax.customerTiers && tax.customerTiers.length > 0 ? (
                                tax.customerTiers.sort().map((tier) => (
                                  <Badge key={tier} variant="outline" className="text-xs">
                                    Tier {tier}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-sm text-muted-foreground">All Tiers</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={tax.isActive ? "default" : "secondary"}>
                              {tax.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditTax(tax)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => deleteTaxMutation.mutate(tax.id)}
                                disabled={deleteTaxMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tobacco Tracking Tab */}
          <TabsContent value="tobacco-tracking" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>IL-TP1 Tobacco Sales Tracking</CardTitle>
                <CardDescription>
                  Track tobacco sales for Illinois TP-1 tax compliance reporting
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingTobacco ? (
                  <div className="text-center py-4">Loading tobacco sales data...</div>
                ) : tobaccoSales.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No tobacco sales recorded yet.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Sale Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Tobacco Value</TableHead>
                        <TableHead>Tax Amount</TableHead>
                        <TableHead>Reporting Period</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tobaccoSales.map((sale: TobaccoSale) => (
                        <TableRow key={sale.id}>
                          <TableCell>#{sale.orderId}</TableCell>
                          <TableCell>
                            {new Date(sale.saleDate).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{sale.customerId}</TableCell>
                          <TableCell>${(sale.totalTobaccoValue || 0).toFixed(2)}</TableCell>
                          <TableCell>${(sale.totalTaxAmount || 0).toFixed(2)}</TableCell>
                          <TableCell>{sale.reportingPeriod}</TableCell>
                          <TableCell>
                            <Badge variant={sale.reportingStatus === 'submitted' ? "default" : "secondary"}>
                              {sale.reportingStatus}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tax Audits Tab */}
          <TabsContent value="tax-audits" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Tax Calculation Audits</CardTitle>
                <CardDescription>
                  View detailed tax calculation logs and audit trails
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingAudits ? (
                  <div className="text-center py-4">Loading audit data...</div>
                ) : taxAudits.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No tax calculations recorded yet.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order ID</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Customer Level</TableHead>
                        <TableHead>Flat Tax Applied</TableHead>
                        <TableHead>Total Tax Amount</TableHead>
                        <TableHead>Calculation Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {taxAudits.map((audit: TaxCalculationAudit) => (
                        <TableRow key={audit.id}>
                          <TableCell>#{audit.orderId}</TableCell>
                          <TableCell>{audit.customerId}</TableCell>
                          <TableCell>Level {audit.customerLevel}</TableCell>
                          <TableCell>
                            <Badge variant={audit.applyFlatTax ? "default" : "secondary"}>
                              {audit.applyFlatTax ? "Yes" : "No"}
                            </Badge>
                          </TableCell>
                          <TableCell>${(audit.totalTaxAmount || 0).toFixed(2)}</TableCell>
                          <TableCell>
                            {new Date(audit.createdAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Flat Tax</DialogTitle>
              <DialogDescription>
                Update flat tax details
              </DialogDescription>
            </DialogHeader>
            {editingTax && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Tax Name</Label>
                  <Input
                    id="edit-name"
                    value={editingTax.name}
                    onChange={(e) => setEditingTax({ ...editingTax, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Textarea
                    id="edit-description"
                    value={editingTax.description}
                    onChange={(e) => setEditingTax({ ...editingTax, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-taxType">Tax Type</Label>
                  <Select 
                    value={editingTax.taxType} 
                    onValueChange={(value) => setEditingTax({ ...editingTax, taxType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select tax type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="per_unit">Per Unit</SelectItem>
                      <SelectItem value="percentage">Percentage</SelectItem>
                      <SelectItem value="fixed">Fixed Amount</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-taxAmount">
                    Tax Amount {editingTax.taxType === 'percentage' ? '(%)' : '($)'}
                  </Label>
                  <Input
                    id="edit-taxAmount"
                    type="number"
                    step="0.01"
                    value={editingTax.taxAmount}
                    onChange={(e) => setEditingTax({ ...editingTax, taxAmount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-county">County Restriction</Label>
                  <Input
                    id="edit-county"
                    value={editingTax.countyRestriction || ''}
                    onChange={(e) => setEditingTax({ ...editingTax, countyRestriction: e.target.value })}
                    placeholder="e.g., Cook County (leave blank for all counties)"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Customer Tiers</Label>
                  <div className="flex gap-2 flex-wrap">
                    {[1, 2, 3, 4, 5].map((tier) => (
                      <div key={tier} className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          id={`edit-tier-${tier}`}
                          checked={editingTax.customerTiers?.includes(tier) || false}
                          onChange={(e) => {
                            const currentTiers = editingTax.customerTiers || [];
                            const newTiers = e.target.checked 
                              ? [...currentTiers, tier]
                              : currentTiers.filter(t => t !== tier);
                            setEditingTax({ ...editingTax, customerTiers: newTiers });
                          }}
                          className="rounded border-gray-300"
                        />
                        <Label htmlFor={`edit-tier-${tier}`} className="text-sm">
                          Tier {tier}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="edit-isActive"
                    checked={editingTax.isActive}
                    onCheckedChange={(checked) => setEditingTax({ ...editingTax, isActive: checked })}
                  />
                  <Label htmlFor="edit-isActive">Active</Label>
                </div>
                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleUpdateTax}
                    disabled={updateTaxMutation.isPending}
                    className="flex-1"
                  >
                    {updateTaxMutation.isPending ? "Updating..." : "Update Tax"}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setIsEditDialogOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}