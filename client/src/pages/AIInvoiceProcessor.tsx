import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { AppLayout } from '@/layout/AppLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Upload, FileText, Zap, CheckCircle, AlertCircle, Eye, Brain, FileUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import ProductApprovalModal from '@/components/ProductApprovalModal';
import { PageHeader } from "@/components/ui/page-header";

interface ProcessingResult {
  processing: {
    id: number;
    originalFileName: string;
    fileType: string;
    processingStatus: string;
    extractedData: any;
    createdAt: string;
  };
  suggestions: Array<{
    id: number;
    extractedProductName: string;
    extractedSku: string;
    extractedQuantity: number;
    extractedUnitCost: number;
    suggestedProductId: number;
    matchConfidence: number;
    matchReasoning: string;
    suggestedCategoryId: number;
    suggestedCategoryName: string;
  }>;
}

export default function AIInvoiceProcessor() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [processingInvoiceId, setProcessingInvoiceId] = useState<number | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);

  // Upload and process invoice
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('invoice', file);
      
      // Enhanced token retrieval with comprehensive validation
      let token: string | null = null;
      
      console.log('[AI Invoice] Starting token retrieval...');
      
      // 1. Check unified auth storage first (primary method)
      const unifiedAuthStr = localStorage.getItem('gokul_unified_auth') || sessionStorage.getItem('gokul_unified_auth');
      if (unifiedAuthStr) {
        try {
          const unifiedAuth = JSON.parse(unifiedAuthStr);
          if (unifiedAuth.token && unifiedAuth.expiresAt > Date.now()) {
            token = unifiedAuth.token;
            console.log('[AI Invoice] Using unified auth token');
          } else {
            console.log('[AI Invoice] Unified auth token expired, clearing');
            localStorage.removeItem('gokul_unified_auth');
            sessionStorage.removeItem('gokul_unified_auth');
          }
        } catch (e) {
          console.error('[AI Invoice] Error parsing unified auth:', e);
        }
      }
      
      // 2. Check legacy token storage
      if (!token) {
        token = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        if (token) {
          console.log('[AI Invoice] Using legacy auth token');
        }
      }
      
      // 3. Check structured auth data
      if (!token) {
        const authDataStr = localStorage.getItem('gokul_auth_data') || sessionStorage.getItem('gokul_auth_data');
        if (authDataStr) {
          try {
            const authData = JSON.parse(authDataStr);
            if (authData.token && (!authData.expiresAt || authData.expiresAt > Date.now())) {
              token = authData.token;
              console.log('[AI Invoice] Using structured auth token');
            } else {
              console.log('[AI Invoice] Structured auth token expired');
            }
          } catch (e) {
            console.error('[AI Invoice] Error parsing structured auth:', e);
          }
        }
      }

      // Token validation
      if (!token || token.trim() === '') {
        console.error('[AI Invoice] No valid authentication token found');
        throw new Error('Authentication required. Please log out and log back in.');
      }
      
      console.log(`[AI Invoice] Token found: ${token.substring(0, 20)}...`);

      console.log('[AI Invoice] Making request to process-invoice endpoint...');
      
      const response = await fetch('/api/admin/ai/process-invoice', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'x-auth-token': token
        },
        body: formData,
        credentials: 'include'
      });

      console.log(`[AI Invoice] Response status: ${response.status} ${response.statusText}`);

      if (response.status === 401) {
        console.error('[AI Invoice] 401 Unauthorized - clearing auth and redirecting');
        // Clear all auth data
        localStorage.removeItem('authToken');
        localStorage.removeItem('gokul_unified_auth');
        localStorage.removeItem('gokul_auth_data');
        sessionStorage.removeItem('authToken');
        sessionStorage.removeItem('gokul_unified_auth');
        sessionStorage.removeItem('gokul_auth_data');
        
        throw new Error('Session expired. Please log out and log back in to continue.');
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[AI Invoice] Server error: ${response.status} - ${errorText}`);
        throw new Error(`Upload failed (${response.status}): ${errorText || response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      setProcessingInvoiceId(data.invoiceId);
      toast({
        title: "Processing Started",
        description: "AI is analyzing your invoice. This may take a few moments.",
      });
      // Force immediate query for results
      queryClient.invalidateQueries({ queryKey: [`/api/admin/ai/invoice/${data.invoiceId}/results`] });
    },
    onError: (error) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Get processing results with proper endpoint format
  const { data: processingResults, isLoading: resultsLoading, error: resultsError } = useQuery<ProcessingResult>({
    queryKey: [`/api/admin/ai/invoice/${processingInvoiceId}/results`],
    enabled: !!processingInvoiceId,
    retry: 3,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    staleTime: 0, // Always refetch
    gcTime: 0, // Don't cache
    refetchInterval: (query) => {
      console.log('Polling query state:', query.state.data);
      // Stop polling if processing is complete
      const data = query.state.data;
      if (data && data.processing && data.processing.processingStatus === 'completed') {
        console.log('Stopping polling - processing completed');
        return false;
      }
      return 3000; // Poll every 3 seconds
    }
  });

  // Debug logging for troubleshooting
  React.useEffect(() => {
    console.log('[AI Debug] Processing Invoice ID:', processingInvoiceId);
    console.log('[AI Debug] Processing Results:', processingResults);
    console.log('[AI Debug] Results Loading:', resultsLoading);
    console.log('[AI Debug] Results Error:', resultsError);
    if (resultsError) {
      console.error('[AI Debug] Error details:', resultsError);
    }
  }, [processingInvoiceId, processingResults, resultsLoading, resultsError]);

  // Approve and create purchase order
  const approveMutation = useMutation({
    mutationFn: async (userDecisions: any[]) => {
      return apiRequest('POST', `/api/admin/ai/invoice/${processingInvoiceId}/approve`, {
        userDecisions
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Purchase Order Created",
        description: `Purchase order #${data.purchaseOrderId} created successfully!`,
      });
      setShowApprovalModal(false);
      setProcessingInvoiceId(null);
      setSelectedFile(null);
    },
    onError: (error) => {
      toast({
        title: "Approval Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast({
          title: "Invalid File Type",
          description: "Please upload a PDF, JPG, or PNG file.",
          variant: "destructive",
        });
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File Too Large",
          description: "Please upload a file smaller than 10MB.",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleUpload = () => {
    if (selectedFile) {
      uploadMutation.mutate(selectedFile);
    }
  };



  const getProcessingStatus = () => {
    if (!processingResults) return 'idle';
    return processingResults.processing?.processingStatus || 'pending';
  };

  const getProgressValue = () => {
    const status = getProcessingStatus();
    switch (status) {
      case 'pending': return 25;
      case 'completed': return 100;
      case 'error': return 0;
      default: return 0;
    }
  };

  const canShowResults = () => {
    return processingResults && 
           processingResults.processing?.processingStatus === 'completed' &&
           processingResults.suggestions && 
           processingResults.suggestions.length > 0;
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Page Header */}
        <PageHeader
          title="AI Invoice Processor"
          description="Upload supplier invoices and let AI automatically extract data to create purchase orders"
        />

        <div className="grid gap-6 lg:grid-cols-12">
          {/* Main Content - Upload and Processing */}
          <div className="lg:col-span-8 space-y-6">
            {/* Upload Section */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileUp className="h-5 w-5 text-blue-600" />
                  Upload Invoice
                </CardTitle>
                <CardDescription>
                  Upload a PDF or image of your supplier invoice for AI processing
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="relative">
                  {/* Hidden file input */}
                  <Input
                    id="invoice-file"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileSelect}
                    disabled={uploadMutation.isPending}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  
                  {/* Visible upload area - now looks like a clickable button */}
                  <div className="border-2 border-dashed border-blue-300 bg-blue-50 rounded-lg p-8 text-center hover:border-blue-500 hover:bg-blue-100 transition-all duration-200 cursor-pointer shadow-sm hover:shadow-md">
                    <div className="bg-blue-500 hover:bg-blue-600 transition-colors w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileUp className="h-8 w-8 text-white" />
                    </div>
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-blue-900">
                        Click to Upload Invoice
                      </h3>
                      <p className="text-blue-700 font-medium">
                        Choose file or drag and drop
                      </p>
                      <div className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors font-medium">
                        <Upload className="h-4 w-4 mr-2" />
                        Browse Files
                      </div>
                      <p className="text-sm text-blue-600 mt-3">
                        PDF, JPG, PNG up to 10MB
                      </p>
                    </div>
                  </div>
                </div>

                {selectedFile && (
                  <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  <Button 
                    onClick={handleUpload}
                    disabled={!selectedFile || uploadMutation.isPending}
                    className="flex-1 sm:flex-none"
                    size="lg"
                  >
                    {uploadMutation.isPending ? (
                      <>
                        <Zap className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Process with AI
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Processing Status */}
            {processingInvoiceId && (
              <Card className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {getProcessingStatus() === 'completed' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : getProcessingStatus() === 'error' ? (
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
                      <span>{getProgressValue()}%</span>
                    </div>
                    <Progress value={getProgressValue()} className="h-2" />
                  </div>
                  
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">File</p>
                      <p className="text-sm truncate">{processingResults?.processing?.originalFileName}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</p>
                      <p className="text-sm capitalize">{getProcessingStatus()}</p>
                    </div>
                    {processingResults?.processing?.extractedData && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Items Found</p>
                        <p className="text-sm">{processingResults.processing.extractedData.items?.length || 0}</p>
                      </div>
                    )}
                  </div>

                  {canShowResults() && (
                    <div className="pt-4 border-t">
                      <Button 
                        onClick={() => setShowApprovalModal(true)}
                        className="w-full sm:w-auto"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Review & Approve ({processingResults?.suggestions?.length || 0} items)
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar - Info and Tips */}
          <div className="lg:col-span-4 space-y-6">
            {/* How it Works */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Brain className="h-5 w-5 text-gray-600" />
                  How it Works
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                      1
                    </div>
                    <div>
                      <p className="text-sm font-medium">Upload Invoice</p>
                      <p className="text-xs text-gray-500">Upload your supplier invoice (PDF or image)</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                      2
                    </div>
                    <div>
                      <p className="text-sm font-medium">AI Analysis</p>
                      <p className="text-xs text-gray-500">AI extracts product data and suggests mappings</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                      3
                    </div>
                    <div>
                      <p className="text-sm font-medium">Review & Approve</p>
                      <p className="text-xs text-gray-500">Review suggestions and approve/modify as needed</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                      4
                    </div>
                    <div>
                      <p className="text-sm font-medium">Create Purchase Order</p>
                      <p className="text-xs text-gray-500">Automatically create purchase order from approved data</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Supported Formats */}
            <Card className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg">Supported Formats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-red-500" />
                    <span>PDF documents</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-blue-500" />
                    <span>JPEG images</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-green-500" />
                    <span>PNG images</span>
                  </div>
                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
                    Maximum file size: 10MB
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Approval Modal */}
        {showApprovalModal && processingResults && (
          <ProductApprovalModal
            isOpen={showApprovalModal}
            onClose={() => setShowApprovalModal(false)}
            invoiceData={processingResults.processing.extractedData}
            suggestions={processingResults.suggestions || []}
            onApprove={(decisions) => approveMutation.mutate(decisions)}
            isApproving={approveMutation.isPending}
          />
        )}
      </div>
    </AppLayout>
  );
}