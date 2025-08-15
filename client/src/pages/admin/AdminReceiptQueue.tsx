import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Printer, 
  FileText, 
  Trash2, 
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Plus,
  Download,
  Users,
  Package
} from "lucide-react";
import { format } from "date-fns";

interface PrintQueueItem {
  id: number;
  orderId: number;
  customerId: string;
  customerName: string;
  printType: 'receipt' | 'invoice' | 'label';
  status: 'pending' | 'printing' | 'completed' | 'failed';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  addedBy: string;
  addedAt: Date;
  printedAt?: Date;
  printerName?: string;
  copies: number;
  errorMessage?: string;
  metadata?: any;
}

interface PrintStats {
  totalPending: number;
  totalCompleted: number;
  totalFailed: number;
  avgPrintTime: number;
}

export default function AdminReceiptQueue() {
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch print queue
  const { data: queueItems, isLoading: isLoadingQueue } = useQuery({
    queryKey: ['/api/admin/print-queue', filterStatus, filterType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterStatus !== 'all') params.append('status', filterStatus);
      if (filterType !== 'all') params.append('type', filterType);
      
      const response = await apiRequest('GET', `/api/admin/print-queue?${params.toString()}`);
      return response.json() as PrintQueueItem[];
    }
  });

  // Fetch print statistics
  const { data: stats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['/api/admin/print-queue/stats'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/print-queue/stats');
      return response.json() as PrintStats;
    }
  });

  // Add to print queue mutation
  const addToQueueMutation = useMutation({
    mutationFn: async (data: { orderIds: number[], printType: string, copies?: number }) => {
      const response = await apiRequest('POST', '/api/admin/print-queue/add', data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/print-queue'] });
      toast({
        title: "Added to Queue",
        description: `${data.added} items added to print queue`,
      });
    },
    onError: (error) => {
      console.error('Add to queue error:', error);
      toast({
        title: "Failed to Add",
        description: "Unable to add items to print queue",
        variant: "destructive",
      });
    }
  });

  // Process print queue mutation
  const processMutation = useMutation({
    mutationFn: async (queueIds: number[]) => {
      const response = await apiRequest('POST', '/api/admin/print-queue/process', { queueIds });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/print-queue'] });
      setSelectedItems([]);
      toast({
        title: "Print Job Started",
        description: `${data.processed} items sent to printer`,
      });
    },
    onError: (error) => {
      console.error('Process queue error:', error);
      toast({
        title: "Print Failed",
        description: "Unable to process print queue",
        variant: "destructive",
      });
    }
  });

  // Delete from queue mutation
  const deleteMutation = useMutation({
    mutationFn: async (queueIds: number[]) => {
      const response = await apiRequest('DELETE', '/api/admin/print-queue/bulk', { queueIds });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/print-queue'] });
      setSelectedItems([]);
      toast({
        title: "Items Removed",
        description: `${data.deleted} items removed from queue`,
      });
    },
    onError: (error) => {
      console.error('Delete queue error:', error);
      toast({
        title: "Delete Failed",
        description: "Unable to remove items from queue",
        variant: "destructive",
      });
    }
  });

  // Retry failed items mutation
  const retryMutation = useMutation({
    mutationFn: async (queueIds: number[]) => {
      const response = await apiRequest('POST', '/api/admin/print-queue/retry', { queueIds });
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/print-queue'] });
      setSelectedItems([]);
      toast({
        title: "Retry Initiated",
        description: `${data.retried} items queued for retry`,
      });
    },
    onError: (error) => {
      console.error('Retry queue error:', error);
      toast({
        title: "Retry Failed",
        description: "Unable to retry failed items",
        variant: "destructive",
      });
    }
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedItems(queueItems?.map(item => item.id) || []);
    } else {
      setSelectedItems([]);
    }
  };

  const handleSelectItem = (itemId: number, checked: boolean) => {
    if (checked) {
      setSelectedItems(prev => [...prev, itemId]);
    } else {
      setSelectedItems(prev => prev.filter(id => id !== itemId));
    }
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      pending: "bg-yellow-100 text-yellow-800",
      printing: "bg-blue-100 text-blue-800",
      completed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800"
    };

    const statusIcons = {
      pending: <Clock className="h-3 w-3 mr-1" />,
      printing: <Printer className="h-3 w-3 mr-1" />,
      completed: <CheckCircle className="h-3 w-3 mr-1" />,
      failed: <AlertCircle className="h-3 w-3 mr-1" />
    };

    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
        {statusIcons[status as keyof typeof statusIcons]}
        {status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityColors = {
      low: "bg-gray-100 text-gray-800",
      normal: "bg-blue-100 text-blue-800",
      high: "bg-orange-100 text-orange-800",
      urgent: "bg-red-100 text-red-800"
    };

    return (
      <Badge variant="outline" className={priorityColors[priority as keyof typeof priorityColors]}>
        {priority}
      </Badge>
    );
  };

  const getTypeIcon = (type: string) => {
    const icons = {
      receipt: <FileText className="h-4 w-4" />,
      invoice: <Package className="h-4 w-4" />,
      label: <Users className="h-4 w-4" />
    };

    return icons[type as keyof typeof icons] || <FileText className="h-4 w-4" />;
  };

  const filteredItems = queueItems?.filter(item => {
    const statusMatch = filterStatus === 'all' || item.status === filterStatus;
    const typeMatch = filterType === 'all' || item.printType === filterType;
    return statusMatch && typeMatch;
  }) || [];

  const pendingItems = filteredItems.filter(item => item.status === 'pending');
  const failedItems = filteredItems.filter(item => item.status === 'failed');

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Receipt Print Queue</h1>
          <p className="text-gray-600 mt-1">Manage batch printing for receipts, invoices, and labels</p>
        </div>
        <Button 
          onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/admin/print-queue'] })}
          disabled={isLoadingQueue}
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {isLoadingStats ? "..." : stats?.totalPending || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isLoadingStats ? "..." : stats?.totalCompleted || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Failed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {isLoadingStats ? "..." : stats?.totalFailed || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Avg Print Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingStats ? "..." : `${stats?.avgPrintTime || 0}s`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Queue Management</CardTitle>
          <CardDescription>Filter and manage print queue items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Status:</label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="printing">Printing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-sm font-medium">Type:</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="receipt">Receipt</SelectItem>
                  <SelectItem value="invoice">Invoice</SelectItem>
                  <SelectItem value="label">Label</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bulk Actions */}
          <div className="flex flex-wrap gap-2 mb-4">
            {pendingItems.length > 0 && (
              <Button
                onClick={() => processMutation.mutate(pendingItems.map(item => item.id))}
                disabled={processMutation.isPending}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Printer className="h-4 w-4 mr-2" />
                Print All Pending ({pendingItems.length})
              </Button>
            )}

            {failedItems.length > 0 && (
              <Button
                onClick={() => retryMutation.mutate(failedItems.map(item => item.id))}
                disabled={retryMutation.isPending}
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Failed ({failedItems.length})
              </Button>
            )}

            {selectedItems.length > 0 && (
              <>
                <Button
                  onClick={() => processMutation.mutate(selectedItems)}
                  disabled={processMutation.isPending}
                  variant="outline"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Selected ({selectedItems.length})
                </Button>

                <Button
                  onClick={() => deleteMutation.mutate(selectedItems)}
                  disabled={deleteMutation.isPending}
                  variant="outline"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove Selected ({selectedItems.length})
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Queue Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Print Queue ({filteredItems.length})
          </CardTitle>
          <CardDescription>
            Manage individual print jobs
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingQueue ? (
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Loading print queue...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Printer className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No items in print queue</p>
              <p className="text-sm">Items will appear here when orders are queued for printing</p>
            </div>
          ) : (
            <>
              {/* Select All */}
              <div className="flex items-center gap-2 mb-4 pb-2 border-b">
                <Checkbox
                  checked={selectedItems.length === filteredItems.length}
                  onCheckedChange={handleSelectAll}
                />
                <span className="text-sm font-medium">Select All</span>
              </div>

              {/* Queue Items List */}
              <div className="space-y-3">
                {filteredItems.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={(checked) => handleSelectItem(item.id, checked as boolean)}
                        className="mt-1"
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {getTypeIcon(item.printType)}
                          <h4 className="font-semibold">Order #{item.orderId}</h4>
                          {getStatusBadge(item.status)}
                          {getPriorityBadge(item.priority)}
                          <span className="text-sm text-gray-600">×{item.copies}</span>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Customer:</span> {item.customerName}
                          </div>
                          <div>
                            <span className="font-medium">Type:</span> {item.printType}
                          </div>
                          <div>
                            <span className="font-medium">Added:</span> {format(new Date(item.addedAt), 'MMM dd, HH:mm')}
                          </div>
                          <div>
                            <span className="font-medium">Added by:</span> {item.addedBy}
                          </div>
                        </div>

                        {item.errorMessage && (
                          <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                            <AlertCircle className="h-4 w-4 inline mr-1" />
                            {item.errorMessage}
                          </div>
                        )}

                        {item.printedAt && (
                          <div className="mt-2 text-sm text-green-600">
                            <CheckCircle className="h-4 w-4 inline mr-1" />
                            Printed at {format(new Date(item.printedAt), 'MMM dd, yyyy HH:mm:ss')}
                            {item.printerName && ` on ${item.printerName}`}
                          </div>
                        )}
                      </div>

                      {/* Individual Actions */}
                      <div className="flex items-center gap-2">
                        {item.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => processMutation.mutate([item.id])}
                            disabled={processMutation.isPending}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        )}
                        {item.status === 'failed' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => retryMutation.mutate([item.id])}
                            disabled={retryMutation.isPending}
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteMutation.mutate([item.id])}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}