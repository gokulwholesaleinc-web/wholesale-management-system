import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  UserPlus, 
  UserX, 
  Building, 
  Mail, 
  Phone, 
  Calendar,
  DollarSign,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  Trash2
} from "lucide-react";
import { AccountRequest } from "@shared/schema";

const approvalSchema = z.object({
  customerLevel: z.coerce.number().min(1).max(5),
  creditLimit: z.coerce.number().min(0),
  adminNotes: z.string().optional(),
});

const rejectionSchema = z.object({
  adminNotes: z.string().min(1, "Please provide a reason for rejection"),
});

type ApprovalForm = z.infer<typeof approvalSchema>;
type RejectionForm = z.infer<typeof rejectionSchema>;

export default function AccountRequestsManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<AccountRequest | null>(null);
  const [actionDialog, setActionDialog] = useState<'approve' | 'reject' | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<AccountRequest | null>(null);

  const { data: requests = [], isLoading } = useQuery<AccountRequest[]>({
    queryKey: ['/api/admin/account-requests'],
    staleTime: 60000, // Cache for 1 minute
  });

  const approvalForm = useForm<ApprovalForm>({
    resolver: zodResolver(approvalSchema),
    defaultValues: {
      customerLevel: 1,
      creditLimit: 5000,
      adminNotes: '',
    },
  });

  const rejectionForm = useForm<RejectionForm>({
    resolver: zodResolver(rejectionSchema),
    defaultValues: {
      adminNotes: '',
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (data: ApprovalForm & { requestId: number }) => {
      return apiRequest(`/api/admin/account-requests/${data.requestId}/approve`, {
        method: 'POST',
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/account-requests'] });
      setActionDialog(null);
      setSelectedRequest(null);
      approvalForm.reset();
      toast({
        title: "Account Approved",
        description: "Account has been created and approval email sent to customer.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve account request",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (data: RejectionForm & { requestId: number }) => {
      return apiRequest(`/api/admin/account-requests/${data.requestId}/reject`, {
        method: 'POST',
        body: data,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/account-requests'] });
      setActionDialog(null);
      setSelectedRequest(null);
      rejectionForm.reset();
      toast({
        title: "Request Rejected",
        description: "Rejection email sent to customer.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject account request",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (requestId: number) => {
      return apiRequest(`/api/admin/account-requests/${requestId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/account-requests'] });
      setDeleteDialogOpen(false);
      setRequestToDelete(null);
      toast({
        title: "Request Deleted",
        description: "Account request has been permanently deleted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account request",
        variant: "destructive",
      });
    },
  });

  const onApprove = (data: ApprovalForm) => {
    if (!selectedRequest) return;
    approveMutation.mutate({ ...data, requestId: selectedRequest.id });
  };

  const onReject = (data: RejectionForm) => {
    if (!selectedRequest) return;
    rejectMutation.mutate({ ...data, requestId: selectedRequest.id });
  };

  const handleDeleteRequest = (request: AccountRequest) => {
    setRequestToDelete(request);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (!requestToDelete) return;
    deleteMutation.mutate(requestToDelete.id);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Account Requests</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Loading account requests...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const processedRequests = requests.filter(r => r.status !== 'pending');

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserPlus className="h-5 w-5 mr-2" />
            Account Requests Management
          </CardTitle>
          <CardDescription>
            Review and approve new wholesale account applications
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl font-bold text-yellow-600">{pendingRequests.length}</div>
              <div className="text-sm text-yellow-800">Pending Review</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {processedRequests.filter(r => r.status === 'approved').length}
              </div>
              <div className="text-sm text-green-800">Approved</div>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {processedRequests.filter(r => r.status === 'rejected').length}
              </div>
              <div className="text-sm text-red-800">Rejected</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-yellow-600">Pending Requests</CardTitle>
            <CardDescription>
              New applications requiring your review
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4 bg-yellow-50">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{request.businessName}</h3>
                      <p className="text-gray-600">{request.contactFirstName} {request.contactLastName}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Dialog open={actionDialog === 'approve' && selectedRequest?.id === request.id}>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(request);
                              setActionDialog('approve');
                              approvalForm.setValue('creditLimit', 5000);
                            }}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Approve Account Request</DialogTitle>
                            <DialogDescription>
                              Set customer level, credit limit and create account for {request.businessName}
                            </DialogDescription>
                          </DialogHeader>
                          <Form {...approvalForm}>
                            <form onSubmit={approvalForm.handleSubmit(onApprove)} className="space-y-4">
                              <FormField
                                control={approvalForm.control}
                                name="customerLevel"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Customer Level (1-5)</FormLabel>
                                    <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={field.value.toString()}>
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="1">Level 1 (Standard)</SelectItem>
                                        <SelectItem value="2">Level 2 (Bronze)</SelectItem>
                                        <SelectItem value="3">Level 3 (Silver)</SelectItem>
                                        <SelectItem value="4">Level 4 (Gold)</SelectItem>
                                        <SelectItem value="5">Level 5 (Platinum)</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <FormField
                                control={approvalForm.control}
                                name="creditLimit"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Credit Limit ($)</FormLabel>
                                    <FormControl>
                                      <Input {...field} type="number" min="0" step="100" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={approvalForm.control}
                                name="adminNotes"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Admin Notes (Optional)</FormLabel>
                                    <FormControl>
                                      <Textarea {...field} placeholder="Any notes for internal records..." />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div className="flex justify-end space-x-2">
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  onClick={() => {
                                    setActionDialog(null);
                                    setSelectedRequest(null);
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button type="submit" disabled={approveMutation.isPending}>
                                  {approveMutation.isPending ? "Creating Account..." : "Approve & Create Account"}
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>

                      <Dialog open={actionDialog === 'reject' && selectedRequest?.id === request.id}>
                        <DialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setSelectedRequest(request);
                              setActionDialog('reject');
                            }}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Reject Account Request</DialogTitle>
                            <DialogDescription>
                              Provide a reason for rejecting {request.businessName}'s application
                            </DialogDescription>
                          </DialogHeader>
                          <Form {...rejectionForm}>
                            <form onSubmit={rejectionForm.handleSubmit(onReject)} className="space-y-4">
                              <FormField
                                control={rejectionForm.control}
                                name="adminNotes"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Reason for Rejection</FormLabel>
                                    <FormControl>
                                      <Textarea 
                                        {...field} 
                                        placeholder="Please provide a clear reason for rejection that will be sent to the applicant..."
                                        rows={4}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                              <div className="flex justify-end space-x-2">
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  onClick={() => {
                                    setActionDialog(null);
                                    setSelectedRequest(null);
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button type="submit" variant="destructive" disabled={rejectMutation.isPending}>
                                  {rejectMutation.isPending ? "Rejecting..." : "Reject Request"}
                                </Button>
                              </div>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-2 text-gray-400" />
                      <span>{request.email}</span>
                    </div>
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-gray-400" />
                      <span>{request.phone}</span>
                    </div>
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-gray-400" />
                      <span>FEIN: {request.feinNumber}</span>
                    </div>
                    {request.requestedUsername && (
                      <div className="flex items-center">
                        <UserPlus className="h-4 w-4 mr-2 text-gray-400" />
                        <span>Username: {request.requestedUsername}</span>
                      </div>
                    )}
                  </div>

                  {request.businessDescription && (
                    <div className="mt-3 p-3 bg-white rounded border">
                      <p className="text-sm text-gray-700">{request.businessDescription}</p>
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
                    <span>Submitted: {new Date(request.createdAt).toLocaleDateString()}</span>
                    {request.businessType && <span>Type: {request.businessType}</span>}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processed Requests */}
      {processedRequests.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Processed Requests</CardTitle>
            <CardDescription>
              Previously approved or rejected applications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {processedRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className="font-medium">{request.businessName}</h4>
                      <p className="text-sm text-gray-600">{request.contactFirstName} {request.contactLastName}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        {getStatusBadge(request.status)}
                        {request.processedAt && (
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(request.processedAt).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      {/* Show delete button only for rejected requests */}
                      {request.status === 'rejected' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteRequest(request)}
                          className="text-red-600 hover:text-red-700 hover:border-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  {request.adminNotes && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                      <strong>Notes:</strong> {request.adminNotes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {requests.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Account Requests</h3>
            <p className="text-gray-500">No account requests have been submitted yet.</p>
          </CardContent>
        </Card>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete the account request from{" "}
              <strong>{requestToDelete?.businessName}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}