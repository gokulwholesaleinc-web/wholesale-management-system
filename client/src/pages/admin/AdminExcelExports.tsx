import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  FileSpreadsheet, 
  Download, 
  RefreshCw, 
  Calendar,
  Users,
  Package,
  TrendingUp,
  Trash2,
  Eye,
  Clock,
  CheckCircle
} from "lucide-react";
import { format } from "date-fns";

interface ExcelExport {
  id: number;
  fileName: string;
  fileType: 'sales' | 'customers' | 'inventory' | 'trends';
  filePath: string;
  fileSize: number;
  status: 'generating' | 'completed' | 'failed';
  generatedBy: string;
  generatedAt: Date;
  downloadCount: number;
  expiresAt: Date;
  parameters?: any;
}

interface ExportRequest {
  type: 'sales' | 'customers' | 'inventory' | 'trends';
  dateRange?: {
    start: string;
    end: string;
  };
}

export default function AdminExcelExports() {
  const [dateRange, setDateRange] = useState({
    start: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd')
  });
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch export history
  const { data: exports, isLoading: isLoadingExports } = useQuery({
    queryKey: ['/api/admin/excel-exports'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/excel-exports');
      return response.json() as ExcelExport[];
    }
  });

  // Generate sales export
  const generateSalesExport = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/excel-exports/sales', {
        dateRange
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/excel-exports'] });
      toast({
        title: "Export Started",
        description: "Sales data export is being generated with AI insights",
      });
    },
    onError: (error) => {
      console.error('Sales export error:', error);
      toast({
        title: "Export Failed",
        description: "Unable to generate sales export",
        variant: "destructive",
      });
    }
  });

  // Generate customers export
  const generateCustomersExport = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/excel-exports/customers');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/excel-exports'] });
      toast({
        title: "Export Started",
        description: "Customer data export is being generated",
      });
    },
    onError: (error) => {
      console.error('Customers export error:', error);
      toast({
        title: "Export Failed",
        description: "Unable to generate customers export",
        variant: "destructive",
      });
    }
  });

  // Generate inventory export
  const generateInventoryExport = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/excel-exports/inventory');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/excel-exports'] });
      toast({
        title: "Export Started",
        description: "Inventory data export is being generated",
      });
    },
    onError: (error) => {
      console.error('Inventory export error:', error);
      toast({
        title: "Export Failed",
        description: "Unable to generate inventory export",
        variant: "destructive",
      });
    }
  });

  // Generate business trends export
  const generateTrendsExport = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/excel-exports/trends');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/excel-exports'] });
      toast({
        title: "Export Started",
        description: "Business trends export is being generated with AI analysis",
      });
    },
    onError: (error) => {
      console.error('Trends export error:', error);
      toast({
        title: "Export Failed",
        description: "Unable to generate trends export",
        variant: "destructive",
      });
    }
  });

  // Download export
  const downloadMutation = useMutation({
    mutationFn: async (exportId: number) => {
      const response = await apiRequest('GET', `/api/admin/excel-exports/download/${exportId}`);
      const blob = await response.blob();
      const exportItem = exports?.find(e => e.id === exportId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exportItem?.fileName || `export-${exportId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/excel-exports'] });
      toast({
        title: "Download Started",
        description: "Excel file is being downloaded",
      });
    },
    onError: (error) => {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Unable to download export file",
        variant: "destructive",
      });
    }
  });

  // Delete export
  const deleteMutation = useMutation({
    mutationFn: async (exportId: number) => {
      const response = await apiRequest('DELETE', `/api/admin/excel-exports/${exportId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/excel-exports'] });
      toast({
        title: "Export Deleted",
        description: "Export file has been removed",
      });
    },
    onError: (error) => {
      console.error('Delete error:', error);
      toast({
        title: "Delete Failed",
        description: "Unable to delete export file",
        variant: "destructive",
      });
    }
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      generating: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800"
    };

    const statusIcons = {
      generating: <Clock className="h-3 w-3 mr-1" />,
      completed: <CheckCircle className="h-3 w-3 mr-1" />,
      failed: <Trash2 className="h-3 w-3 mr-1" />
    };

    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
        {statusIcons[status as keyof typeof statusIcons]}
        {status}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      sales: <TrendingUp className="h-4 w-4" />,
      customers: <Users className="h-4 w-4" />,
      inventory: <Package className="h-4 w-4" />,
      trends: <FileSpreadsheet className="h-4 w-4" />
    };

    return icons[type as keyof typeof icons] || <FileSpreadsheet className="h-4 w-4" />;
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Excel Exports</h1>
          <p className="text-gray-600 mt-1">Generate AI-powered business data exports</p>
        </div>
        <Button 
          onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/excel-exports'] })}
          disabled={isLoadingExports}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Export Generation Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Sales Export */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Sales Data
            </CardTitle>
            <CardDescription>
              Export sales data with AI insights and trends analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="start-date">Start Date</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="end-date">End Date</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                />
              </div>
              <Button 
                onClick={() => generateSalesExport.mutate()}
                disabled={generateSalesExport.isPending}
                className="w-full"
              >
                {generateSalesExport.isPending ? (
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                )}
                Generate Sales Export
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Customers Export */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5" />
              Customers
            </CardTitle>
            <CardDescription>
              Export customer data with purchase history and insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => generateCustomersExport.mutate()}
              disabled={generateCustomersExport.isPending}
              className="w-full"
            >
              {generateCustomersExport.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Users className="h-4 w-4 mr-2" />
              )}
              Generate Customers Export
            </Button>
          </CardContent>
        </Card>

        {/* Inventory Export */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Package className="h-5 w-5" />
              Inventory
            </CardTitle>
            <CardDescription>
              Export inventory data with stock levels and reorder suggestions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => generateInventoryExport.mutate()}
              disabled={generateInventoryExport.isPending}
              className="w-full"
            >
              {generateInventoryExport.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Package className="h-4 w-4 mr-2" />
              )}
              Generate Inventory Export
            </Button>
          </CardContent>
        </Card>

        {/* Trends Export */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileSpreadsheet className="h-5 w-5" />
              Business Trends
            </CardTitle>
            <CardDescription>
              Export comprehensive business analytics with AI predictions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => generateTrendsExport.mutate()}
              disabled={generateTrendsExport.isPending}
              className="w-full"
            >
              {generateTrendsExport.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <TrendingUp className="h-4 w-4 mr-2" />
              )}
              Generate Trends Export
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Export History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Export History
          </CardTitle>
          <CardDescription>
            Download or manage previously generated exports
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingExports ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading exports...</p>
            </div>
          ) : exports?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileSpreadsheet className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No exports generated yet</p>
              <p className="text-sm">Generate your first export using the cards above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {exports?.map((exportItem) => (
                <div key={exportItem.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        {getTypeIcon(exportItem.fileType)}
                        <h4 className="font-semibold">{exportItem.fileName}</h4>
                        {getStatusBadge(exportItem.status)}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div>
                          <span className="font-medium">Size:</span> {formatFileSize(exportItem.fileSize)}
                        </div>
                        <div>
                          <span className="font-medium">Generated:</span> {format(new Date(exportItem.generatedAt), 'MMM dd, yyyy HH:mm')}
                        </div>
                        <div>
                          <span className="font-medium">Downloads:</span> {exportItem.downloadCount}
                        </div>
                        <div>
                          <span className="font-medium">Expires:</span> {format(new Date(exportItem.expiresAt), 'MMM dd, yyyy')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {exportItem.status === 'completed' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => downloadMutation.mutate(exportItem.id)}
                          disabled={downloadMutation.isPending}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this export?')) {
                            deleteMutation.mutate(exportItem.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}