// client/pages/AIInvoiceProcessor.tsx
// Client-only page: uploads file, polls results, approves.
// No fs/path/OpenAI imports here.

import React, { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryClient as globalQC, apiRequest } from '@/lib/queryClient';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea'; // If your modal needs it
import { Badge } from '@/components/ui/badge';
import { Brain, FileUp, Upload, Eye, CheckCircle, AlertCircle, Zap } from 'lucide-react';

// import ProductApprovalModal from '@/components/ProductApprovalModal';
import { PageHeader } from "@/components/ui/page-header";
import { BreadcrumbNavigation } from "@/components/ui/breadcrumb-navigation";

type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed';

interface ProcessingResult {
  processing: {
    id: number;
    originalFileName: string;
    fileType: string;
    processingStatus: ProcessingStatus;
    extractedData: any;
    createdAt: string;
    errorMessage?: string;
  };
  suggestions: Array<{
    id: number;
    extractedProductName: string;
    extractedSku: string;
    extractedQuantity: number;
    extractedUnitCost: number;
    extractedTotalCost: number;
    extractedDescription?: string;
    suggestedProductId: number | null;
    matchConfidence: number;
    matchReasoning: string;
    suggestedCategoryId: number | null;
    suggestedCategoryName: string | null;
  }>;
}

export default function AIInvoiceProcessor() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processingInvoiceId, setProcessingInvoiceId] = useState<number | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  const breadcrumbs = [
    { label: 'Admin', href: '/admin' },
    { label: 'AI Invoice Processor' }
  ];

  // Upload & start processing
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('invoice', file);

      const token =
        JSON.parse(localStorage.getItem('gokul_unified_auth') || 'null')?.token ||
        localStorage.getItem('authToken') ||
        JSON.parse(localStorage.getItem('gokul_auth_data') || 'null')?.token ||
        '';

      const resp = await fetch('/api/admin/ai/process-invoice', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}`, 'x-auth-token': token } : {},
        body: formData,
        credentials: 'include',
      });

      if (!resp.ok) throw new Error(await resp.text());
      return resp.json();
    },
    onSuccess: (data: { invoiceId: number }) => {
      setProcessingInvoiceId(data.invoiceId);
      toast({ title: 'Processing Started', description: 'AI is analyzing your invoice...' });
      qc.invalidateQueries({ queryKey: [`/api/admin/ai/invoice/${data.invoiceId}/results`] });
    },
    onError: (e: any) => {
      toast({ title: 'Upload Failed', description: e?.message || 'Unknown error', variant: 'destructive' });
    },
  });

  // Polling results
  const { data: processingResults } = useQuery<ProcessingResult>({
    queryKey: [`/api/admin/ai/invoice/${processingInvoiceId}/results`],
    enabled: !!processingInvoiceId,
    refetchInterval: (q) => {
      const data = (q.state?.data as ProcessingResult | undefined);
      if (!data) return 3000;
      if (data.processing.processingStatus === 'completed' || data.processing.processingStatus === 'failed') return false;
      return 3000;
    },
    queryFn: async () => {
      const resp = await fetch(`/api/admin/ai/invoice/${processingInvoiceId}/results`);
      if (!resp.ok) throw new Error(await resp.text());
      return resp.json();
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (userDecisions: any[]) => {
      return apiRequest('POST', `/api/admin/ai/invoice/${processingInvoiceId}/approve`, { userDecisions });
    },
    onSuccess: (data: { purchaseOrderId: number }) => {
      toast({ title: 'Purchase Order Created', description: `PO #${data.purchaseOrderId} created` });
      setShowApprovalModal(false);
      setProcessingInvoiceId(null);
      setSelectedFile(null);
    },
    onError: (e: any) => {
      toast({ title: 'Approval Failed', description: e?.message || 'Unknown error', variant: 'destructive' });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ok = ['application/pdf', 'image/jpeg', 'image/png'].includes(file.type);
    if (!ok) return toast({ title: 'Invalid File', description: 'Upload PDF, JPG, or PNG', variant: 'destructive' });
    if (file.size > 10 * 1024 * 1024) return toast({ title: 'Too Large', description: 'Max 10MB', variant: 'destructive' });
    setSelectedFile(file);
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    uploadMutation.mutate(selectedFile);
  };

  const status = processingResults?.processing?.processingStatus;
  const progress = status === 'completed' ? 100 : status === 'processing' ? 60 : status === 'failed' ? 0 : 20;

  const canShowResults =
    processingResults &&
    processingResults.processing?.processingStatus === 'completed' &&
    (processingResults.suggestions?.length || 0) > 0;

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <BreadcrumbNavigation />
      
      <PageHeader
        title="AI Invoice Processor"
        description="Upload supplier invoices and let AI extract items to build purchase orders."
      />

      <div className="grid gap-6 lg:grid-cols-12">
        <div className="lg:col-span-8 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <FileUp className="h-5 w-5 text-blue-600" />
                Upload Invoice
              </CardTitle>
              <CardDescription>PDF or image up to 10MB</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative">
                <Input
                  id="invoice-file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileSelect}
                  disabled={uploadMutation.isPending}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg p-8 text-center hover:border-blue-500 hover:bg-blue-100 transition-all cursor-pointer">
                  <div className="bg-blue-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Upload className="h-8 w-8 text-white" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-lg font-semibold text-blue-900">Click to Upload Invoice</p>
                    <p className="text-blue-700">Choose file or drag and drop</p>
                    <div className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-md">
                      <Upload className="h-4 w-4 mr-2" /> Browse Files
                    </div>
                    <p className="text-sm text-blue-600 mt-3">PDF, JPG, PNG up to 10MB</p>
                  </div>
                </div>
              </div>

              {selectedFile && (
                <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <span className="text-sm font-medium truncate">{selectedFile.name}</span>
                  <Badge variant="secondary">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</Badge>
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={handleUpload} disabled={!selectedFile || uploadMutation.isPending} size="lg" className="flex-1 sm:flex-none">
                  {uploadMutation.isPending ? (
                    <>
                      <Zap className="h-4 w-4 mr-2 animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      <Brain className="h-4 w-4 mr-2" /> Process with AI
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {processingInvoiceId && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  {status === 'completed' ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : status === 'failed' ? (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  ) : (
                    <Brain className="h-5 w-5 text-blue-600 animate-pulse" />
                  )}
                  AI Processing Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Progress</span>
                    <span>{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <p className="text-xs text-gray-500">File</p>
                    <p className="text-sm truncate">{processingResults?.processing?.originalFileName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <p className="text-sm capitalize">{status}</p>
                  </div>
                  {processingResults?.processing?.extractedData && (
                    <div>
                      <p className="text-xs text-gray-500">Items Found</p>
                      <p className="text-sm">{processingResults.processing.extractedData.items?.length || 0}</p>
                    </div>
                  )}
                </div>

                {processingResults?.processing?.errorMessage && status === 'failed' && (
                  <div className="text-sm text-red-600">{processingResults.processing.errorMessage}</div>
                )}

                {canShowResults && (
                  <div className="pt-4 border-t">
                    <Button onClick={() => setShowApprovalModal(true)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Review & Approve ({processingResults?.suggestions?.length || 0} items)
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Brain className="h-5 w-5 text-gray-600" />
                How it Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-600">
              <div>1) Upload PDF or image</div>
              <div>2) AI extracts line items</div>
              <div>3) Review/approve matches</div>
              <div>4) Create purchase order</div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Approval Modal - TODO: Create ProductApprovalModal component */}
      {showApprovalModal && processingResults && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[90vh] overflow-auto p-6">
            <h2 className="text-xl font-bold mb-4">Review Invoice Items</h2>
            <p className="text-gray-600 mb-6">
              Found {processingResults.suggestions.length} items from {processingResults.processing.originalFileName}
            </p>
            <div className="space-y-4">
              {processingResults.suggestions.map((suggestion) => (
                <div key={suggestion.id} className="border p-4 rounded">
                  <h3 className="font-semibold">{suggestion.extractedProductName}</h3>
                  <p className="text-sm text-gray-600">SKU: {suggestion.extractedSku}</p>
                  <p className="text-sm text-gray-600">Qty: {suggestion.extractedQuantity} @ ${suggestion.extractedUnitCost}</p>
                  <p className="text-sm text-gray-600">Total: ${suggestion.extractedTotalCost}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 mt-6">
              <Button 
                onClick={() => approveMutation.mutate(processingResults.suggestions.map(s => ({
                  action: 'create_new',
                  extractedProductName: s.extractedProductName,
                  extractedSku: s.extractedSku,
                  quantity: s.extractedQuantity,
                  cost: s.extractedUnitCost
                })))}
                disabled={approveMutation.isPending}
              >
                {approveMutation.isPending ? 'Creating...' : 'Approve & Create PO'}
              </Button>
              <Button variant="outline" onClick={() => setShowApprovalModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}