import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { BreadcrumbNavigation } from "@/components/navigation/BreadcrumbNavigation";
import { 
  FileText, 
  Search, 
  Download, 
  Eye, 
  Trash2, 
  User, 
  Calendar,
  DollarSign,
  Filter,
  RefreshCw,
  Plus,
  FileX
} from "lucide-react";
import { format } from "date-fns";

interface InvoiceSearchResult {
  orderId: number;
  invoiceNumber: string;
  customerName: string;
  customerCompany: string;
  totalAmount: number;
  orderDate: string;
  status: string;
  pdfPath: string;
  exists: boolean;
}

interface InvoiceStats {
  totalInvoices: number;
  totalValue: number;
  pendingInvoices: number;
  completedInvoices: number;
  avgInvoiceValue: number;
}

export default function AdminInvoiceManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<InvoiceSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Clear cache on mount to force fresh data
  useEffect(() => {
    queryClient.removeQueries({ queryKey: ['/api/admin/invoices'] });
    queryClient.invalidateQueries({ queryKey: ['/api/admin/invoices'] });
  }, []);

  // Fetch all invoices with pagination
  const { data: invoicesData, isLoading: isLoadingInvoices, refetch: refetchInvoices } = useQuery({
    queryKey: ['/api/admin/invoices', currentPage],
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true
  });

  // Fetch invoice statistics
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/admin/invoices/stats']
  });

  // Search invoices mutation
  const searchMutation = useMutation({
    mutationFn: async (query: string) => {
      const response = await apiRequest('POST', '/api/admin/invoices/search', { query });
      const data = await response.json();
      return Array.isArray(data) ? data as InvoiceSearchResult[] : [];
    },
    onSuccess: (results) => {
      setSearchResults(results);
      setIsSearching(false);
      toast({
        title: "Search Complete",
        description: `Found ${results.length} matching invoices`,
      });
    },
    onError: (error) => {
      console.error('Search error:', error);
      setSearchResults([]);
      setIsSearching(false);
      toast({
        title: "Search Failed",
        description: "Unable to search invoices. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Generate invoice PDF mutation
  const generatePdfMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await apiRequest('POST', `/api/admin/invoices/generate/${orderId}`);
      const data = await response.json();
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/invoices'] });
      refetchInvoices(); // Force refresh to show updated PDF status
      toast({
        title: "Invoice Generated",
        description: `PDF invoice has been created successfully${data.pdfPath ? ` at ${data.pdfPath}` : ''}`,
      });
    },
    onError: (error) => {
      console.error('PDF generation error:', error);
      toast({
        title: "Generation Failed",
        description: "Unable to generate PDF invoice. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Download invoice mutation
  const downloadMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await apiRequest('GET', `/api/admin/invoices/download/${orderId}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${orderId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Download Started",
        description: "Invoice PDF is being downloaded",
      });
    },
    onError: (error) => {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Unable to download invoice PDF",
        variant: "destructive",
      });
    }
  });

  // Delete invoice mutation
  const deleteMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await apiRequest('DELETE', `/api/admin/invoices/${orderId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/invoices'] });
      toast({
        title: "Invoice Deleted",
        description: "Invoice has been permanently removed",
      });
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed",
        description: "Unable to delete invoice",
        variant: "destructive",
      });
    }
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Search Required",
        description: "Please enter a customer name or invoice number",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    searchMutation.mutate(searchQuery);
  };

  const handleDownload = (orderId: number) => {
    downloadMutation.mutate(orderId);
  };

  const handleGenerate = (orderId: number) => {
    generatePdfMutation.mutate(orderId);
  };

  const handleDelete = (orderId: number) => {
    if (confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      deleteMutation.mutate(orderId);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      pending: "bg-yellow-100 text-yellow-800",
      processing: "bg-blue-100 text-blue-800", 
      completed: "bg-green-100 text-green-800",
      cancelled: "bg-red-100 text-red-800"
    };

    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
        {status}
      </Badge>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <BreadcrumbNavigation />
      
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Invoice Manager</h1>
          <p className="text-gray-600 mt-1">Search, manage, and generate customer invoices</p>
        </div>
        <Button 
          onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/invoices'] })}
          disabled={isLoadingInvoices}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStats ? "..." : stats?.totalInvoices || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoadingStats ? "..." : formatCurrency(stats?.totalValue || 0)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {isLoadingStats ? "..." : stats?.pendingInvoices || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {isLoadingStats ? "..." : stats?.completedInvoices || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Average Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStats ? "..." : formatCurrency(stats?.avgInvoiceValue || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Invoice Search
          </CardTitle>
          <CardDescription>
            Search by customer name, company, or invoice number
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search Query</Label>
              <Input
                id="search"
                placeholder="Enter customer name or invoice number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleSearch}
                disabled={isSearching || searchMutation.isPending}
              >
                {isSearching ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Search
              </Button>
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Search Results ({searchResults.length})</h3>
              <div className="space-y-3">
                {searchResults.map((invoice) => (
                  <div key={invoice.orderId} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">Invoice #{invoice.invoiceNumber}</h4>
                          {getStatusBadge(invoice.status)}
                          {!invoice.exists && (
                            <Badge variant="outline" className="text-red-600">
                              <FileX className="h-3 w-3 mr-1" />
                              Missing PDF
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Customer:</span> {invoice.customerName}
                          </div>
                          <div>
                            <span className="font-medium">Company:</span> {invoice.customerCompany || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Amount:</span> {formatCurrency(invoice.totalAmount)}
                          </div>
                          <div>
                            <span className="font-medium">Date:</span> {format(new Date(invoice.orderDate), 'MMM dd, yyyy')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {invoice.exists ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(invoice.orderId)}
                            disabled={downloadMutation.isPending}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerate(invoice.orderId)}
                            disabled={generatePdfMutation.isPending}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(invoice.orderId)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Invoices */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                All Invoices
              </CardTitle>
              <CardDescription>
                Complete list of generated invoices
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                queryClient.removeQueries({ queryKey: ['/api/admin/invoices'] });
                queryClient.invalidateQueries({ queryKey: ['/api/admin/invoices'] });
                refetchInvoices();
              }}
              disabled={isLoadingInvoices}
            >
              <RefreshCw className={`h-4 w-4 ${isLoadingInvoices ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingInvoices ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading invoices...</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(() => {
                console.log('[Render Debug] invoicesData:', invoicesData);
                console.log('[Render Debug] invoicesData?.invoices:', invoicesData?.invoices);
                console.log('[Render Debug] Length check:', invoicesData?.invoices?.length > 0);
                return null;
              })()}
              {invoicesData?.invoices?.length > 0 ? (
                invoicesData.invoices.map((invoice: InvoiceSearchResult) => (
                  <div key={invoice.orderId} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold">Invoice #{invoice.invoiceNumber}</h4>
                          {getStatusBadge(invoice.status)}
                          {!invoice.exists && (
                            <Badge variant="outline" className="text-red-600">
                              <FileX className="h-3 w-3 mr-1" />
                              Missing PDF
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Customer:</span> {invoice.customerName}
                          </div>
                          <div>
                            <span className="font-medium">Company:</span> {invoice.customerCompany || 'N/A'}
                          </div>
                          <div>
                            <span className="font-medium">Amount:</span> {formatCurrency(invoice.totalAmount)}
                          </div>
                          <div>
                            <span className="font-medium">Date:</span> {format(new Date(invoice.orderDate), 'MMM dd, yyyy')}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {invoice.exists ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDownload(invoice.orderId)}
                            disabled={downloadMutation.isPending}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleGenerate(invoice.orderId)}
                            disabled={generatePdfMutation.isPending}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(invoice.orderId)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No invoices found</p>
                  <p className="text-sm">Orders will appear here as invoices</p>
                </div>
              )}

              {/* Pagination */}
              {invoicesData?.totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-6">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage <= 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {currentPage} of {invoicesData.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(invoicesData.totalPages, prev + 1))}
                    disabled={currentPage >= invoicesData.totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}