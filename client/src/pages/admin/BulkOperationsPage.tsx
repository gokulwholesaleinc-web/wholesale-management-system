import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { toast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { PageHeader } from '@/components/ui/page-header';
import { BreadcrumbNavigation } from '@/components/ui/breadcrumb-navigation';
import { 
  Package, 
  DollarSign, 
  BarChart3, 
  FileSpreadsheet, 
  Upload, 
  Download,
  ScanLine,
  Search,
  Filter,
  Target,
  Users,
  ShoppingCart,
  Clock,
  BookOpen,
  PhoneCall,
  MessageSquare,
  UserCheck,
  TrendingUp,
  AlertTriangle,
  Zap,
  Settings,
  Layers
} from 'lucide-react';

interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  categoryId: number | null;
  categoryName?: string;
  isDraft: boolean;
  sku?: string;
  brand?: string;
}

interface Category {
  id: number;
  name: string;
}

interface BulkUpdateData {
  productIds: number[];
  updateType: 'price' | 'stock' | 'status' | 'category' | 'description' | 'brand' | 'weight' | 'size' | 'featured' | 'cost' | 'taxPercentage';
  value: string | number | boolean;
  adjustmentType?: 'set' | 'increase' | 'decrease' | 'percentage';
}

export default function BulkOperationsPage() {
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [bulkOperation, setBulkOperation] = useState<string>('');
  const [bulkValue, setBulkValue] = useState<string>('');
  const [adjustmentType, setAdjustmentType] = useState<string>('set');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [csvData, setCsvData] = useState<string>('');
  
  // Smart Search & Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [stockRange, setStockRange] = useState<[number, number]>([0, 100]);
  const [brandFilter, setBrandFilter] = useState<string>('all');
  
  // Quick Stock Management
  const [scannerOpen, setScannerOpen] = useState<boolean>(false);
  const [scannedSku, setScannedSku] = useState<string>('');
  const [quickStockValue, setQuickStockValue] = useState<string>('');
  const [quickStockOperation, setQuickStockOperation] = useState<string>('add');
  
  // Customer Service Tools
  const [customerLookup, setCustomerLookup] = useState<string>('');
  const [orderLookup, setOrderLookup] = useState<string>('');
  const [searchedCustomer, setSearchedCustomer] = useState<any>(null);
  const [searchedOrder, setSearchedOrder] = useState<any>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();

  // Fetch products
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['/api/admin/products'],
    select: (data: any[]) => data.map(product => ({
      ...product,
      categoryName: product.category?.name || 'Uncategorized'
    }))
  });

  // Fetch categories
  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['/api/admin/categories']
  });

  // Bulk update mutation
  const bulkUpdateMutation = useMutation({
    mutationFn: async (data: BulkUpdateData) => {
      return apiRequest('POST', '/api/admin/bulk-operations', data);
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: `Bulk operation completed for ${selectedProducts.length} products.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      setSelectedProducts([]);
      setBulkValue('');
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to perform bulk operation.',
        variant: 'destructive',
      });
    },
  });

  // CSV import mutation
  const csvImportMutation = useMutation({
    mutationFn: async (data: { csvData: string; operation: string }) => {
      return apiRequest('POST', '/api/admin/bulk-operations/csv-import', data);
    },
    onSuccess: (result) => {
      toast({
        title: 'CSV Import Complete',
        description: `Updated ${result.updated} products, ${result.errors} errors.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/products'] });
      setCsvData('');
    },
  });

  // Customer search mutation
  const customerSearchMutation = useMutation({
    mutationFn: async (searchTerm: string) => {
      return apiRequest('GET', `/api/admin/users?search=${encodeURIComponent(searchTerm)}`);
    },
    onSuccess: (data) => {
      if (data && data.length > 0) {
        setSearchedCustomer(data[0]);
        toast({
          title: 'Customer Found',
          description: `Found ${data[0].username || data[0].firstName || 'Customer'}`,
        });
      } else {
        setSearchedCustomer(null);
        toast({
          title: 'No Customer Found',
          description: 'No customer found with that search term',
          variant: 'destructive',
        });
      }
    },
    onError: () => {
      toast({
        title: 'Search Failed',
        description: 'Error searching for customer',
        variant: 'destructive',
      });
    },
  });

  // Order search mutation
  const orderSearchMutation = useMutation({
    mutationFn: async (orderNumber: string) => {
      const orderId = orderNumber.replace('#', '');
      return apiRequest('GET', `/api/admin/orders/${orderId}`);
    },
    onSuccess: (data) => {
      if (data) {
        setSearchedOrder(data);
        toast({
          title: 'Order Found',
          description: `Found Order #${data.id}`,
        });
      } else {
        setSearchedOrder(null);
        toast({
          title: 'No Order Found',
          description: 'No order found with that number',
          variant: 'destructive',
        });
      }
    },
    onError: () => {
      toast({
        title: 'Search Failed',
        description: 'Error searching for order',
        variant: 'destructive',
      });
    },
  });

  // CSV Export function
  const handleExportCSV = async () => {
    try {
      const dataToExport = selectedProducts.length > 0 
        ? products.filter(p => selectedProducts.includes(p.id))
        : filteredProducts.length > 0 
        ? filteredProducts 
        : products;

      // Create CSV headers
      const headers = [
        'ID', 'Name', 'SKU', 'Price', 'Stock', 'Category', 'Brand', 
        'Price Level 1', 'Price Level 2', 'Price Level 3', 'Price Level 4', 'Price Level 5',
        'Status', 'Created At'
      ];

      // Convert products to CSV rows
      const csvRows = dataToExport.map(product => [
        product.id,
        `"${product.name || ''}"`,
        `"${product.sku || ''}"`,
        product.price || 0,
        product.stock || 0,
        `"${product.categoryName || ''}"`,
        `"${product.brand || ''}"`,
        product.price1 || product.price || 0,
        product.price2 || product.price || 0,
        product.price3 || product.price || 0,
        product.price4 || product.price || 0,
        product.price5 || product.price || 0,
        product.isDraft ? 'Draft' : 'Live',
        product.createdAt ? new Date(product.createdAt).toLocaleDateString() : ''
      ]);

      // Combine headers and rows
      const csvContent = [headers, ...csvRows]
        .map(row => row.join(','))
        .join('\n');

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const exportType = selectedProducts.length > 0 ? 'selected' : 
                        filteredProducts.length < products.length ? 'filtered' : 'all';
      a.download = `products-${exportType}-${new Date().toISOString().split('T')[0]}.csv`;
      
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: 'Export Successful',
        description: `Exported ${dataToExport.length} products to CSV`,
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: 'Export Failed',
        description: 'Failed to export products to CSV',
        variant: 'destructive',
      });
    }
  };

  // Get unique brands for filtering
  const brands = [...new Set(products.filter(p => p.brand).map(p => p.brand))];

  // Enhanced product filtering
  const filteredProducts = products.filter(product => {
    // Basic filters
    const categoryMatch = categoryFilter === 'all' || product.categoryId?.toString() === categoryFilter;
    const statusMatch = statusFilter === 'all' || 
      (statusFilter === 'live' && !product.isDraft) ||
      (statusFilter === 'draft' && product.isDraft) ||
      (statusFilter === 'low-stock' && product.stock < 10) ||
      (statusFilter === 'out-of-stock' && product.stock === 0);
    
    // Search filter - enhanced to include description
    const searchMatch = !searchTerm || 
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Price range filter
    const priceMatch = (product.price || 0) >= priceRange[0] && (product.price || 0) <= priceRange[1];
    
    // Stock range filter
    const stockMatch = (product.stock || 0) >= stockRange[0] && (product.stock || 0) <= stockRange[1];
    
    // Brand filter
    const brandMatch = brandFilter === 'all' || product.brand === brandFilter;
    
    const matches = categoryMatch && statusMatch && searchMatch && priceMatch && stockMatch && brandMatch;
    
    // Debug logging for search term
    if (searchTerm && searchMatch) {
      console.log('Product matches search:', product.name, { 
        id: product.id, 
        name: product.name, 
        sku: product.sku, 
        brand: product.brand,
        matches: matches,
        categoryMatch,
        statusMatch,
        searchMatch,
        priceMatch,
        stockMatch,
        brandMatch
      });
    }
    
    return matches;
  });

  // Debug filtered products
  console.log('Filtered products count:', filteredProducts.length);
  console.log('Search term:', searchTerm);
  if (searchTerm) {
    console.log('Filtered products:', filteredProducts.map(p => ({ id: p.id, name: p.name, sku: p.sku })));
  }

  const handleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p.id));
    }
  };

  const handleProductSelect = (productId: number) => {
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleBulkUpdate = () => {
    if (selectedProducts.length === 0) {
      toast({
        title: 'No Selection',
        description: 'Please select products to update.',
        variant: 'destructive',
      });
      return;
    }

    if (!bulkOperation || !bulkValue) {
      toast({
        title: 'Missing Information',
        description: 'Please select operation type and enter a value.',
        variant: 'destructive',
      });
      return;
    }

    let value: string | number | boolean = bulkValue;
    
    if (bulkOperation === 'price' || bulkOperation === 'stock') {
      value = parseFloat(bulkValue);
      if (isNaN(value)) {
        toast({
          title: 'Invalid Value',
          description: 'Please enter a valid number.',
          variant: 'destructive',
        });
        return;
      }
    } else if (bulkOperation === 'status') {
      value = bulkValue === 'draft';
    } else if (bulkOperation === 'featured') {
      value = bulkValue === 'true';
    } else if (bulkOperation === 'category') {
      value = parseInt(bulkValue);
      if (isNaN(value)) {
        toast({
          title: 'Invalid Category',
          description: 'Please select a valid category.',
          variant: 'destructive',
        });
        return;
      }
    } else if (bulkOperation === 'taxPercentage') {
      value = parseFloat(bulkValue);
      if (isNaN(value) || value < 0 || value > 100) {
        toast({
          title: 'Invalid Tax Percentage',
          description: 'Please enter a valid tax percentage between 0 and 100.',
          variant: 'destructive',
        });
        return;
      }
    } else if (bulkOperation === 'description' || bulkOperation === 'brand' || bulkOperation === 'weight') {
      value = bulkValue.trim();
      if (!value) {
        toast({
          title: 'Empty Value',
          description: 'Please enter a value for the selected operation.',
          variant: 'destructive',
        });
        return;
      }
    }

    bulkUpdateMutation.mutate({
      productIds: selectedProducts,
      updateType: bulkOperation as any,
      value,
      adjustmentType: adjustmentType as any
    });
  };

  const handleCsvImport = () => {
    if (!csvData.trim()) {
      toast({
        title: 'No Data',
        description: 'Please enter CSV data to import.',
        variant: 'destructive',
      });
      return;
    }

    csvImportMutation.mutate({
      csvData,
      operation: 'stock-update'
    });
  };

  const exportToCSV = () => {
    const csvContent = [
      'ID,SKU,Name,Price,Stock,Category,Status',
      ...filteredProducts.map(p => 
        `${p.id},${p.sku || ''},${p.name},${p.price},${p.stock},${p.categoryName},${p.isDraft ? 'Draft' : 'Live'}`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'products-export.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <PageHeader 
        title="Bulk Operations Dashboard" 
        description="Manage multiple products efficiently with bulk operations and CSV import/export"
      />

      <Tabs defaultValue="bulk-operations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="bulk-operations">Bulk Operations</TabsTrigger>
          <TabsTrigger value="smart-filters">Smart Search</TabsTrigger>
          <TabsTrigger value="quick-stock">Quick Stock</TabsTrigger>
          <TabsTrigger value="customer-service">Customer Service</TabsTrigger>
          <TabsTrigger value="csv-operations">CSV Tools</TabsTrigger>
        </TabsList>

        <TabsContent value="bulk-operations" className="space-y-6">
          {/* Bulk Operations Controls */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Bulk Operations
              </CardTitle>
              <CardDescription>
                Select products and apply bulk changes to prices, stock, status, categories, descriptions, brands, or product specifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="operation">Operation Type</Label>
                  <Select value={bulkOperation} onValueChange={setBulkOperation}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select operation" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="price">Update Prices</SelectItem>
                      <SelectItem value="cost">Update Cost</SelectItem>
                      <SelectItem value="stock">Update Stock</SelectItem>
                      <SelectItem value="status">Change Status</SelectItem>
                      <SelectItem value="category">Change Category</SelectItem>
                      <SelectItem value="description">Update Descriptions</SelectItem>
                      <SelectItem value="brand">Update Brand</SelectItem>
                      <SelectItem value="weight">Update Weight/Size</SelectItem>
                      <SelectItem value="featured">Toggle Featured Status</SelectItem>
                      <SelectItem value="taxPercentage">Update Tax Percentage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(bulkOperation === 'price' || bulkOperation === 'cost' || bulkOperation === 'stock' || bulkOperation === 'taxPercentage') && (
                  <div>
                    <Label htmlFor="adjustment">Adjustment Type</Label>
                    <Select value={adjustmentType} onValueChange={setAdjustmentType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="set">Set Value</SelectItem>
                        <SelectItem value="increase">Increase By</SelectItem>
                        <SelectItem value="decrease">Decrease By</SelectItem>
                        <SelectItem value="percentage">Percentage Change</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div>
                  <Label htmlFor="value">
                    {bulkOperation === 'status' ? 'Status' : 
                     bulkOperation === 'category' ? 'Category' : 
                     bulkOperation === 'description' ? 'Description' :
                     bulkOperation === 'brand' ? 'Brand' :
                     bulkOperation === 'weight' ? 'Weight/Size' :
                     bulkOperation === 'featured' ? 'Featured Status' :
                     bulkOperation === 'taxPercentage' ? 'Tax Percentage' : 'Value'}
                  </Label>
                  {bulkOperation === 'status' ? (
                    <Select value={bulkValue} onValueChange={setBulkValue}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="live">Live</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : bulkOperation === 'category' ? (
                    <Select value={bulkValue} onValueChange={setBulkValue}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map(category => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : bulkOperation === 'featured' ? (
                    <Select value={bulkValue} onValueChange={setBulkValue}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select featured status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Featured</SelectItem>
                        <SelectItem value="false">Not Featured</SelectItem>
                      </SelectContent>
                    </Select>
                  ) : bulkOperation === 'description' ? (
                    <Textarea
                      placeholder="Enter new description for selected products..."
                      value={bulkValue}
                      onChange={(e) => setBulkValue(e.target.value)}
                      rows={3}
                    />
                  ) : (
                    <Input
                      placeholder={
                        bulkOperation === 'price' ? 'Enter price (e.g., 29.99)' :
                        bulkOperation === 'cost' ? 'Enter cost (e.g., 15.99)' :
                        bulkOperation === 'stock' ? 'Enter stock quantity' :
                        bulkOperation === 'brand' ? 'Enter brand name' :
                        bulkOperation === 'weight' ? 'Enter weight/size (e.g., 12 oz, 2 lbs)' :
                        bulkOperation === 'taxPercentage' ? 'Enter tax percentage (e.g., 8.25)' :
                        'Enter value'
                      }
                      value={bulkValue}
                      onChange={(e) => setBulkValue(e.target.value)}
                      type={bulkOperation === 'price' || bulkOperation === 'stock' || bulkOperation === 'taxPercentage' ? 'number' : 'text'}
                    />
                  )}
                </div>

                <div className="flex items-end">
                  <Button 
                    onClick={handleBulkUpdate}
                    disabled={bulkUpdateMutation.isPending || selectedProducts.length === 0}
                    className="w-full"
                  >
                    {bulkUpdateMutation.isPending ? 'Updating...' : `Update ${selectedProducts.length} Products`}
                  </Button>
                </div>
              </div>

              {selectedProducts.length > 0 && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>{selectedProducts.length}</strong> products selected for bulk operation
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filters & Selection</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search Bar for Bulk Operations */}
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search Products</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Search by name, SKU, brand, or description..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setCategoryFilter('all');
                    setStatusFilter('all');
                    setBrandFilter('all');
                  }}
                  className="mt-6"
                >
                  Clear Filters
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Category Filter</Label>
                  <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories
                        .sort((a, b) => a.name.localeCompare(b.name))
                        .map(category => (
                          <SelectItem key={category.id} value={category.id.toString()}>
                            {category.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Status Filter</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Products</SelectItem>
                      <SelectItem value="live">Live Only</SelectItem>
                      <SelectItem value="draft">Draft Only</SelectItem>
                      <SelectItem value="low-stock">Low Stock (&lt; 10)</SelectItem>
                      <SelectItem value="out-of-stock">Out of Stock</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button variant="outline" onClick={handleSelectAll} className="w-full">
                    {selectedProducts.length === filteredProducts.length ? 'Deselect All' : 'Select All Filtered'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products List */}
          <Card>
            <CardHeader>
              <CardTitle>Products ({filteredProducts.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {productsLoading ? (
                <div className="text-center py-8">Loading products...</div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {filteredProducts.map(product => (
                    <div key={product.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                      <Checkbox
                        checked={selectedProducts.includes(product.id)}
                        onCheckedChange={() => handleProductSelect(product.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">{product.name}</span>
                          <Badge variant={!product.isDraft ? 'default' : 'secondary'}>
                            {!product.isDraft ? 'Live' : 'Draft'}
                          </Badge>
                          {product.stock < 10 && (
                            <Badge variant="destructive">Low Stock</Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 flex gap-4">
                          <span>Price: ${product.price}</span>
                          <span>Stock: {product.stock}</span>
                          <span>Category: {product.categoryName}</span>
                          {product.sku && <span>SKU: {product.sku}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                  Import stock updates using CSV format: ID,SKU,Stock
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="csv-data">CSV Data</Label>
                  <Textarea
                    id="csv-data"
                    value={csvData}
                    onChange={(e) => setCsvData(e.target.value)}
                    placeholder="ID,SKU,Stock&#10;1,ABC123,50&#10;2,DEF456,25"
                    rows={8}
                  />
                </div>
                <Button 
                  onClick={handleCsvImport}
                  disabled={csvImportMutation.isPending}
                  className="w-full"
                >
                  {csvImportMutation.isPending ? 'Importing...' : 'Import CSV Data'}
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
                  Export current filtered products to CSV
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-600">
                  <p>Export includes:</p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Product ID and SKU</li>
                    <li>Name and Price</li>
                    <li>Current Stock Level</li>
                    <li>Category and Status</li>
                  </ul>
                </div>
                <Button onClick={exportToCSV} variant="outline" className="w-full">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Export {filteredProducts.length} Products to CSV
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="smart-filters" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:bg-gray-50" onClick={() => setStatusFilter('low-stock')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-8 w-8 text-orange-500" />
                  <div>
                    <h3 className="font-medium">Low Stock Products</h3>
                    <p className="text-sm text-gray-600">
                      {products.filter(p => p.stock < 10).length} products
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:bg-gray-50" onClick={() => setStatusFilter('out-of-stock')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Package className="h-8 w-8 text-red-500" />
                  <div>
                    <h3 className="font-medium">Out of Stock</h3>
                    <p className="text-sm text-gray-600">
                      {products.filter(p => p.stock === 0).length} products
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:bg-gray-50" onClick={() => setStatusFilter('inactive')}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <DollarSign className="h-8 w-8 text-gray-500" />
                  <div>
                    <h3 className="font-medium">Draft Products</h3>
                    <p className="text-sm text-gray-600">
                      {products.filter(p => p.isDraft).length} products
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Smart Search & Filters Tab */}
        <TabsContent value="smart-filters" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Smart Search & Filters
              </CardTitle>
              <CardDescription>
                Advanced product filtering with search, price ranges, stock levels, and brand filtering
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Search Bar */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="search">Search Products</Label>
                  <Input
                    id="search"
                    placeholder="Search by name, SKU, brand, or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <Label htmlFor="brand">Brand Filter</Label>
                  <Select value={brandFilter} onValueChange={setBrandFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Brands" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Brands</SelectItem>
                      {brands.map(brand => (
                        <SelectItem key={brand} value={brand || ''}>
                          {brand || 'No Brand'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Price Range Slider */}
              <div className="space-y-3">
                <Label>Price Range: ${priceRange[0]} - ${priceRange[1]}</Label>
                <Slider
                  value={priceRange}
                  onValueChange={setPriceRange}
                  max={1000}
                  min={0}
                  step={5}
                  className="w-full"
                />
              </div>

              {/* Stock Range Slider */}
              <div className="space-y-3">
                <Label>Stock Range: {stockRange[0]} - {stockRange[1]} units</Label>
                <Slider
                  value={stockRange}
                  onValueChange={setStockRange}
                  max={100}
                  min={0}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Filter Results */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Filter Results</h4>
                  <Badge variant="outline">{filteredProducts.length} products found</Badge>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    <span>Live: {filteredProducts.filter(p => !p.isDraft).length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-500" />
                    <span>Low Stock: {filteredProducts.filter(p => p.stock < 10).length}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-blue-500" />
                    <span>Avg Price: ${(filteredProducts.reduce((sum, p) => sum + p.price, 0) / filteredProducts.length || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-purple-500" />
                    <span>Total Stock: {filteredProducts.reduce((sum, p) => sum + p.stock, 0)}</span>
                  </div>
                </div>
              </div>

              {/* Filtered Products Display */}
              {filteredProducts.length > 0 && (
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle>Search Results ({filteredProducts.length} products)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {filteredProducts.map(product => (
                        <div key={product.id} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                          <Checkbox
                            checked={selectedProducts.includes(product.id)}
                            onCheckedChange={() => handleProductSelect(product.id)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium truncate">{product.name}</span>
                              <Badge variant={!product.isDraft ? 'default' : 'secondary'}>
                                {!product.isDraft ? 'Live' : 'Draft'}
                              </Badge>
                              {product.stock < 10 && (
                                <Badge variant="destructive">Low Stock</Badge>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 flex gap-4">
                              <span>Price: ${product.price}</span>
                              <span>Stock: {product.stock}</span>
                              <span>Category: {product.categoryName}</span>
                              {product.sku && <span>SKU: {product.sku}</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setPriceRange([0, 1000]);
                    setStockRange([0, 100]);
                    setBrandFilter('all');
                    setCategoryFilter('all');
                    setStatusFilter('all');
                  }}
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Clear All Filters
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setStatusFilter('low-stock')}
                >
                  <Target className="h-4 w-4 mr-2" />
                  Show Low Stock
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setStatusFilter('draft')}
                >
                  <Layers className="h-4 w-4 mr-2" />
                  Show Draft
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quick Stock Management Tab */}
        <TabsContent value="quick-stock" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ScanLine className="h-5 w-5" />
                Quick Stock Management
              </CardTitle>
              <CardDescription>
                Rapid stock updates using barcode scanning and SKU lookup
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Barcode Scanner Section */}
              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-medium flex items-center gap-2">
                  <ScanLine className="h-4 w-4" />
                  Barcode/SKU Scanner
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="sku-input">Enter SKU or Scan Barcode</Label>
                    <Input
                      id="sku-input"
                      placeholder="SKU or barcode..."
                      value={scannedSku}
                      onChange={(e) => setScannedSku(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          e.stopPropagation();
                          // Find product by SKU
                          const product = products.find(p => 
                            p.sku?.toLowerCase() === scannedSku.toLowerCase()
                          );
                          if (product) {
                            toast({
                              title: 'Product Found',
                              description: `${product.name} - Current stock: ${product.stock}`,
                            });
                          } else {
                            toast({
                              title: 'Product Not Found',
                              description: 'No product found with this SKU',
                              variant: 'destructive',
                            });
                          }
                        }
                      }}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="stock-operation">Operation</Label>
                    <Select value={quickStockOperation} onValueChange={setQuickStockOperation}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="add">Add Stock</SelectItem>
                        <SelectItem value="remove">Remove Stock</SelectItem>
                        <SelectItem value="set">Set Stock</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="stock-value">Quantity</Label>
                    <Input
                      id="stock-value"
                      type="number"
                      placeholder="Enter quantity..."
                      value={quickStockValue}
                      onChange={(e) => setQuickStockValue(e.target.value)}
                    />
                  </div>
                </div>

                <Button 
                  className="w-full"
                  onClick={() => {
                    if (!scannedSku || !quickStockValue) {
                      toast({
                        title: 'Missing Information',
                        description: 'Please enter SKU and quantity',
                        variant: 'destructive',
                      });
                      return;
                    }
                    
                    const product = products.find(p => 
                      p.sku?.toLowerCase() === scannedSku.toLowerCase()
                    );
                    
                    if (!product) {
                      toast({
                        title: 'Product Not Found',
                        description: 'No product found with this SKU',
                        variant: 'destructive',
                      });
                      return;
                    }

                    // Perform quick stock update
                    bulkUpdateMutation.mutate({
                      productIds: [product.id],
                      updateType: 'stock',
                      value: quickStockOperation === 'set' ? 
                        parseInt(quickStockValue) : 
                        quickStockOperation === 'add' ? 
                          product.stock + parseInt(quickStockValue) :
                          Math.max(0, product.stock - parseInt(quickStockValue)),
                      adjustmentType: 'set'
                    });
                    
                    setScannedSku('');
                    setQuickStockValue('');
                  }}
                  disabled={bulkUpdateMutation.isPending}
                >
                  {bulkUpdateMutation.isPending ? 'Updating...' : `${quickStockOperation.charAt(0).toUpperCase() + quickStockOperation.slice(1)} Stock`}
                </Button>
              </div>

              {/* Quick Stock Presets */}
              <div className="border rounded-lg p-4 space-y-4">
                <h4 className="font-medium">Quick Actions</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setStatusFilter('out-of-stock');
                      toast({
                        title: 'Filter Applied',
                        description: 'Showing out of stock products',
                      });
                    }}
                  >
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Out of Stock
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setStatusFilter('low-stock');
                      toast({
                        title: 'Filter Applied',
                        description: 'Showing low stock products',
                      });
                    }}
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Low Stock
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const lowStockProducts = products.filter(p => p.stock < 10);
                      setSelectedProducts(lowStockProducts.map(p => p.id));
                      toast({
                        title: 'Products Selected',
                        description: `${lowStockProducts.length} low stock products selected`,
                      });
                    }}
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    Select Low Stock
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      const outOfStockProducts = products.filter(p => p.stock === 0);
                      setSelectedProducts(outOfStockProducts.map(p => p.id));
                      toast({
                        title: 'Products Selected',
                        description: `${outOfStockProducts.length} out of stock products selected`,
                      });
                    }}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Select Out of Stock
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Customer Service Tools Tab */}
        <TabsContent value="customer-service" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Lookup */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Customer Lookup
                </CardTitle>
                <CardDescription>
                  Search customers and view their order history
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="customer-search">Customer Name or ID</Label>
                  <Input
                    id="customer-search"
                    placeholder="Enter customer name..."
                    value={customerLookup}
                    onChange={(e) => setCustomerLookup(e.target.value)}
                  />
                </div>
                <Button 
                  className="w-full"
                  onClick={() => {
                    if (!customerLookup.trim()) {
                      toast({
                        title: 'Missing Search Term',
                        description: 'Please enter a customer name or ID to search',
                        variant: 'destructive',
                      });
                      return;
                    }
                    customerSearchMutation.mutate(customerLookup.trim());
                  }}
                  disabled={customerSearchMutation.isPending}
                >
                  <Search className="h-4 w-4 mr-2" />
                  {customerSearchMutation.isPending ? 'Searching...' : 'Search Customer'}
                </Button>
                
                {/* Customer Search Results */}
                {searchedCustomer && (
                  <div className="border rounded-lg p-4 bg-blue-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-5 w-5 text-blue-600" />
                        <span className="font-semibold text-blue-900">Customer Found</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation(`/admin/users`)}
                      >
                        View Details
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Name:</span> {searchedCustomer.username || searchedCustomer.firstName || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">ID:</span> {searchedCustomer.id}
                      </div>
                      <div>
                        <span className="font-medium">Company:</span> {searchedCustomer.company || 'N/A'}
                      </div>
                      <div>
                        <span className="font-medium">Level:</span> {searchedCustomer.customerLevel || 1}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setLocation(`/staff/create-order?customer=${searchedCustomer.id}`)}
                      >
                        Create Order
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSearchedCustomer(null);
                          setCustomerLookup('');
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="border rounded-lg p-3 bg-gray-50 text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <UserCheck className="h-4 w-4 text-green-500" />
                    <span className="font-medium">Quick Customer Actions</span>
                  </div>
                  <ul className="space-y-1 text-gray-600">
                    <li>• View complete order history</li>
                    <li>• Check customer pricing tier</li>
                    <li>• Access delivery addresses</li>
                    <li>• Review payment history</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Order Lookup */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Order Lookup
                </CardTitle>
                <CardDescription>
                  Quick order search and status updates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="order-search">Order Number</Label>
                  <Input
                    id="order-search"
                    placeholder="Enter order number..."
                    value={orderLookup}
                    onChange={(e) => setOrderLookup(e.target.value)}
                  />
                </div>
                <Button 
                  className="w-full"
                  onClick={() => {
                    if (!orderLookup.trim()) {
                      toast({
                        title: 'Missing Order Number',
                        description: 'Please enter an order number to search',
                        variant: 'destructive',
                      });
                      return;
                    }
                    orderSearchMutation.mutate(orderLookup.trim());
                  }}
                  disabled={orderSearchMutation.isPending}
                >
                  <Search className="h-4 w-4 mr-2" />
                  {orderSearchMutation.isPending ? 'Searching...' : 'Find Order'}
                </Button>
                
                {/* Order Search Results */}
                {searchedOrder && (
                  <div className="border rounded-lg p-4 bg-green-50 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-green-600" />
                        <span className="font-semibold text-green-900">Order Found</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation(`/admin/orders/${searchedOrder.id}`)}
                      >
                        View Details
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Order #:</span> {searchedOrder.id}
                      </div>
                      <div>
                        <span className="font-medium">Status:</span> 
                        <span className={`ml-1 px-2 py-1 rounded text-xs font-medium ${
                          searchedOrder.status === 'completed' ? 'bg-green-100 text-green-800' :
                          searchedOrder.status === 'processing' ? 'bg-blue-100 text-blue-800' :
                          searchedOrder.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {searchedOrder.status?.charAt(0).toUpperCase() + searchedOrder.status?.slice(1)}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Total:</span> ${searchedOrder.total?.toFixed(2) || '0.00'}
                      </div>
                      <div>
                        <span className="font-medium">Date:</span> {new Date(searchedOrder.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setLocation(`/admin/orders/${searchedOrder.id}`)}
                      >
                        Edit Order
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => {
                          setSearchedOrder(null);
                          setOrderLookup('');
                        }}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="border rounded-lg p-3 bg-gray-50 text-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Quick Order Actions</span>
                  </div>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Update order status</li>
                    <li>• Add order notes</li>
                    <li>• Print invoices/receipts</li>
                    <li>• Track delivery status</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Support Tools */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PhoneCall className="h-5 w-5" />
                Support Tools
              </CardTitle>
              <CardDescription>
                Quick access to customer service functions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Button 
                  variant="outline" 
                  className="h-20 flex-col" 
                  onClick={() => setLocation('/admin/products')}
                >
                  <BookOpen className="h-6 w-6 mb-2" />
                  <span className="text-sm">Product Catalog</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex-col"
                  onClick={() => setLocation('/admin/orders')}
                >
                  <MessageSquare className="h-6 w-6 mb-2" />
                  <span className="text-sm">Order Notes</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex-col"
                  onClick={() => setLocation('/admin/excel-exports')}
                >
                  <TrendingUp className="h-6 w-6 mb-2" />
                  <span className="text-sm">Sales Reports</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex-col"
                  onClick={() => setLocation('/admin/users')}
                >
                  <Users className="h-6 w-6 mb-2" />
                  <span className="text-sm">Customer Profiles</span>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CSV Import/Export Tab - moved to end */}
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
                  Import product data from CSV files
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="csv-data">CSV Data</Label>
                  <Textarea
                    id="csv-data"
                    placeholder="Paste CSV data here..."
                    value={csvData}
                    onChange={(e) => setCsvData(e.target.value)}
                    rows={8}
                  />
                </div>
                <Button 
                  onClick={() => csvImportMutation.mutate({ csvData, operation: 'update-prices' })}
                  disabled={csvImportMutation.isPending || !csvData}
                  className="w-full"
                >
                  {csvImportMutation.isPending ? 'Importing...' : 'Import CSV Data'}
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
                  Export product data to CSV files
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Button onClick={handleExportCSV} className="w-full" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export All Products
                  </Button>
                  <Button 
                    onClick={() => {
                      if (selectedProducts.length === 0) {
                        toast({
                          title: 'No Selection',
                          description: 'Please select products to export',
                          variant: 'destructive',
                        });
                        return;
                      }
                      handleExportCSV();
                    }}
                    className="w-full" 
                    variant="outline"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export Selected ({selectedProducts.length})
                  </Button>
                  <Button onClick={() => handleExportCSV()} className="w-full" variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export Filtered ({filteredProducts.length})
                  </Button>
                </div>
                
                <div className="border rounded-lg p-3 bg-gray-50 text-sm">
                  <p className="font-medium mb-2">Export includes:</p>
                  <ul className="space-y-1 text-gray-600">
                    <li>• Product ID, Name, SKU</li>
                    <li>• Pricing (all tiers)</li>
                    <li>• Stock levels</li>
                    <li>• Category and brand</li>
                    <li>• Status and timestamps</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-8 w-8 text-blue-500" />
                  <div>
                    <h3 className="font-medium">Total Products</h3>
                    <p className="text-sm text-gray-600">{products.length} products</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Package className="h-8 w-8 text-green-500" />
                  <div>
                    <h3 className="font-medium">In Stock</h3>
                    <p className="text-sm text-gray-600">
                      {products.filter(p => p.stock > 0).length} products
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-8 w-8 text-orange-500" />
                  <div>
                    <h3 className="font-medium">Low Stock</h3>
                    <p className="text-sm text-gray-600">
                      {products.filter(p => p.stock < 10 && p.stock > 0).length} products
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <DollarSign className="h-8 w-8 text-gray-500" />
                  <div>
                    <h3 className="font-medium">Out of Stock</h3>
                    <p className="text-sm text-gray-600">
                      {products.filter(p => p.stock === 0).length} products
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}