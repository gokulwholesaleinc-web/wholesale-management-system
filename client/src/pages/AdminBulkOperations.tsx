import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { PageHeader } from '@/components/ui/page-header';
import { 
  Package, 
  DollarSign, 
  Archive, 
  FileText, 
  Upload, 
  Download,
  CheckCircle,
  AlertCircle,
  Loader2,
  Filter,
  Search
} from 'lucide-react';

interface Product {
  id: number;
  name: string;
  sku: string;
  price: number;
  cost?: number;
  stock: number;
  categoryId?: number;
  category?: { name: string };
  imageUrl?: string;
  isActive?: boolean;
}

interface Category {
  id: number;
  name: string;
}

interface BulkOperation {
  type: 'price' | 'stock' | 'status' | 'category' | 'flat-tax' | 'remove-flat-tax';
  products: number[];
  value: any;
}

export default function AdminBulkOperations() {
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [bulkOperation, setBulkOperation] = useState<BulkOperation>({
    type: 'price',
    products: [],
    value: null
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch products with filters
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['/api/admin/products/filtered', searchTerm, categoryFilter, stockFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (stockFilter !== 'all') params.append('stock', stockFilter);
      
      return await apiRequest('GET', `/api/admin/products/filtered?${params.toString()}`);
    }
  });

  // Fetch categories
  const { data: categories = [] } = useQuery({
    queryKey: ['/api/admin/categories'],
    queryFn: () => apiRequest('GET', '/api/admin/categories')
  });

  // Fetch flat taxes
  const { data: flatTaxes = [] } = useQuery({
    queryKey: ['/api/admin/tax/flat-taxes'],
    queryFn: () => apiRequest('GET', '/api/admin/tax/flat-taxes')
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async (operation: BulkOperation) => {
      return await apiRequest('POST', '/api/admin/products/bulk-update', operation);
    },
    onSuccess: () => {
      toast({
        title: "Bulk Update Successful",
        description: `Updated ${selectedProducts.length} products successfully.`
      });
      setSelectedProducts([]);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      setIsConfirmDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Bulk Update Failed",
        description: error.message || "Failed to update products",
        variant: "destructive"
      });
    }
  });

  // CSV import mutation
  const csvImportMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      return await apiRequest('POST', '/api/admin/products/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    onSuccess: (data) => {
      toast({
        title: "CSV Import Successful",
        description: `Imported ${data.imported} products, ${data.updated} updated, ${data.errors} errors.`
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      setCsvFile(null);
    },
    onError: (error: any) => {
      toast({
        title: "CSV Import Failed",
        description: error.message || "Failed to import CSV",
        variant: "destructive"
      });
    }
  });

  const handleSelectAll = () => {
    if (selectedProducts.length === products.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map((p: Product) => p.id));
    }
  };

  const handleProductSelect = (productId: number) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleBulkOperation = () => {
    if (selectedProducts.length === 0) {
      toast({
        title: "No Products Selected",
        description: "Please select products to perform bulk operation.",
        variant: "destructive"
      });
      return;
    }

    setBulkOperation(prev => ({ ...prev, products: selectedProducts }));
    setIsConfirmDialogOpen(true);
  };

  const confirmBulkOperation = () => {
    bulkUpdateMutation.mutate(bulkOperation);
  };

  const handleCsvExport = async () => {
    try {
      const data = await apiRequest('GET', '/api/admin/products/export-csv');
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `products-${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export products to CSV",
        variant: "destructive"
      });
    }
  };

  const filteredProducts = products.filter((product: Product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || 
                           product.categoryId?.toString() === categoryFilter;
    
    const matchesStock = stockFilter === 'all' ||
                        (stockFilter === 'low' && product.stock < 10) ||
                        (stockFilter === 'zero' && product.stock === 0) ||
                        (stockFilter === 'high' && product.stock > 100);
    
    return matchesSearch && matchesCategory && matchesStock;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulk Operations"
        breadcrumbs={[
          { label: "Home", href: "/" },
          { label: "Admin", href: "/admin" },
          { label: "Bulk Operations", current: true }
        ]}
      />

      <Tabs defaultValue="bulk-edit" className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="bulk-edit">Bulk Edit</TabsTrigger>
          <TabsTrigger value="csv-operations">CSV Import/Export</TabsTrigger>
          <TabsTrigger value="smart-filters">Smart Filters</TabsTrigger>
        </TabsList>

        <TabsContent value="bulk-edit" className="space-y-6">
          {/* Search and Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search & Filter Products
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="search">Search Products</Label>
                  <Input
                    id="search"
                    placeholder="Search by name or SKU..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                
                <div>
                  <Label htmlFor="category">Category Filter</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category: Category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="stock">Stock Filter</Label>
                  <Select value={stockFilter} onValueChange={setStockFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Stock Levels" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Stock Levels</SelectItem>
                      <SelectItem value="zero">Zero Stock</SelectItem>
                      <SelectItem value="low">Low Stock (&lt; 10)</SelectItem>
                      <SelectItem value="high">High Stock (&gt; 100)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Product Selection
                </span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">
                    {selectedProducts.length} of {filteredProducts.length} selected
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleSelectAll}
                  >
                    {selectedProducts.length === filteredProducts.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {productsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (
                  filteredProducts.map((product: Product) => (
                    <div 
                      key={product.id} 
                      className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <Checkbox
                        checked={selectedProducts.includes(product.id)}
                        onCheckedChange={() => handleProductSelect(product.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{product.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {product.sku || 'No SKU'}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-4">
                          <span>${product.price}</span>
                          <span>Stock: {product.stock}</span>
                          {product.category && (
                            <span>Category: {product.category.name}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Bulk Operations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Bulk Operations
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="operation-type">Operation Type</Label>
                  <Select 
                    value={bulkOperation.type} 
                    onValueChange={(value: any) => setBulkOperation(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="price">Update Prices</SelectItem>
                      <SelectItem value="stock">Update Stock</SelectItem>
                      <SelectItem value="status">Change Status</SelectItem>
                      <SelectItem value="category">Change Category</SelectItem>
                      <SelectItem value="flat-tax">Apply Flat Tax</SelectItem>
                      <SelectItem value="remove-flat-tax">Remove Flat Tax</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="operation-value">Value</Label>
                  {bulkOperation.type === 'price' && (
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="New price or % increase (+10% or 25.99)"
                      value={bulkOperation.value || ''}
                      onChange={(e) => setBulkOperation(prev => ({ ...prev, value: e.target.value }))}
                    />
                  )}
                  {bulkOperation.type === 'stock' && (
                    <Input
                      type="number"
                      placeholder="New stock quantity"
                      value={bulkOperation.value || ''}
                      onChange={(e) => setBulkOperation(prev => ({ ...prev, value: parseInt(e.target.value) }))}
                    />
                  )}
                  {bulkOperation.type === 'status' && (
                    <Select 
                      value={bulkOperation.value || ''} 
                      onValueChange={(value) => setBulkOperation(prev => ({ ...prev, value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  {bulkOperation.type === 'category' && (
                    <Select 
                      value={bulkOperation.value || ''} 
                      onValueChange={(value) => setBulkOperation(prev => ({ ...prev, value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((category: Category) => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {bulkOperation.type === 'flat-tax' && (
                    <Select 
                      value={bulkOperation.value || ''} 
                      onValueChange={(value) => setBulkOperation(prev => ({ ...prev, value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select flat tax to apply" />
                      </SelectTrigger>
                      <SelectContent>
                        {flatTaxes.map((tax: any) => (
                          <SelectItem key={tax.id} value={tax.id.toString()}>
                            {tax.name} (${tax.amount || tax.taxAmount})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {bulkOperation.type === 'remove-flat-tax' && (
                    <Select 
                      value={bulkOperation.value || ''} 
                      onValueChange={(value) => setBulkOperation(prev => ({ ...prev, value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select flat tax to remove" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Remove All Flat Taxes</SelectItem>
                        {flatTaxes.map((tax: any) => (
                          <SelectItem key={tax.id} value={tax.id.toString()}>
                            {tax.name} (${tax.amount || tax.taxAmount})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>

              <Button 
                onClick={handleBulkOperation}
                disabled={selectedProducts.length === 0 || (!bulkOperation.value && bulkOperation.type !== 'remove-flat-tax')}
                className="w-full"
              >
                {bulkOperation.type === 'flat-tax' ? 'Apply Flat Tax to' :
                 bulkOperation.type === 'remove-flat-tax' ? 'Remove Flat Tax from' :
                 'Apply Bulk Operation to'} {selectedProducts.length} Products
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="csv-operations" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CSV Import */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  CSV Import
                </CardTitle>
                <CardDescription>
                  Import products from CSV file. Supports bulk stock updates and new product creation.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="csv-file">Select CSV File</Label>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                  />
                </div>
                
                <div className="text-sm text-gray-600">
                  <p className="font-medium mb-2">CSV Format:</p>
                  <p>Required columns: name, sku, price, stock</p>
                  <p>Optional columns: description, category, cost, imageUrl</p>
                </div>

                <Button 
                  onClick={() => csvFile && csvImportMutation.mutate(csvFile)}
                  disabled={!csvFile || csvImportMutation.isPending}
                  className="w-full"
                >
                  {csvImportMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    'Import CSV'
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* CSV Export */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  CSV Export
                </CardTitle>
                <CardDescription>
                  Export all products to CSV format for external editing.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p className="font-medium mb-2">Export includes:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>All product information</li>
                    <li>Current stock levels</li>
                    <li>Pricing data</li>
                    <li>Category assignments</li>
                  </ul>
                </div>

                <Button onClick={handleCsvExport} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Export All Products
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="smart-filters" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Problem Products */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-500" />
                  Problem Products
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <span>Zero Stock ({products.filter((p: Product) => p.stock === 0).length})</span>
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <span>Missing Images ({products.filter((p: Product) => !p.imageUrl).length})</span>
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <span>No Category ({products.filter((p: Product) => !p.categoryId).length})</span>
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <span>Missing SKU ({products.filter((p: Product) => !p.sku).length})</span>
                </Button>
              </CardContent>
            </Card>

            {/* High Performers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  High Performers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <span>High Margin (&gt;50%)</span>
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <span>High Stock (&gt;100)</span>
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <span>Recently Added</span>
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <span>Featured Products</span>
                </Button>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button variant="outline" className="w-full justify-start">
                  <span>Need Reorder</span>
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <span>Price Updates Needed</span>
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <span>Seasonal Review</span>
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <span>Duplicate Check</span>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Bulk Operation</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>
              You are about to perform a <strong>{bulkOperation.type}</strong> operation on{' '}
              <strong>{selectedProducts.length}</strong> products.
            </p>
            {bulkOperation.type === 'flat-tax' && (
              <p>
                Apply flat tax: <strong>
                  {flatTaxes.find((tax: any) => tax.id.toString() === bulkOperation.value)?.name || bulkOperation.value}
                </strong>
              </p>
            )}
            {bulkOperation.type === 'remove-flat-tax' && (
              <p>
                Remove flat tax: <strong>
                  {bulkOperation.value === 'all' ? 'All Flat Taxes' : 
                   flatTaxes.find((tax: any) => tax.id.toString() === bulkOperation.value)?.name || bulkOperation.value}
                </strong>
              </p>
            )}
            {!['flat-tax', 'remove-flat-tax'].includes(bulkOperation.type) && (
              <p>
                New value: <strong>{bulkOperation.value}</strong>
              </p>
            )}
            <p className="text-sm text-gray-600">
              This action cannot be undone. Are you sure you want to proceed?
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={confirmBulkOperation}
                disabled={bulkUpdateMutation.isPending}
              >
                {bulkUpdateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Confirm'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}