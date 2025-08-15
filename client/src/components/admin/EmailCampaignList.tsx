import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  Plus, 
  Eye, 
  Send, 
  Trash2, 
  Calendar,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface EmailCampaign {
  id: number;
  name: string;
  subject: string;
  content: string;
  htmlContent?: string;
  status: 'draft' | 'sending' | 'sent' | 'failed';
  recipientCount: number;
  sentCount: number;
  failedCount: number;
  createdBy: string;
  createdAt: string;
  sentAt?: string;
}

interface EmailCampaignListProps {
  onCreateNew: () => void;
  onEdit: (campaign: EmailCampaign) => void;
  onViewAnalytics: (campaign: EmailCampaign) => void;
}

export function EmailCampaignList({ onCreateNew, onEdit, onViewAnalytics }: EmailCampaignListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch campaigns
  const { data: campaigns = [], isLoading } = useQuery<EmailCampaign[]>({
    queryKey: ['/api/admin/email-campaigns'],
    queryFn: async () => {
      return await apiRequest('GET', '/api/admin/email-campaigns');
    }
  });

  // Delete campaign mutation
  const deleteCampaignMutation = useMutation({
    mutationFn: async (campaignId: number) => {
      return await apiRequest('DELETE', `/api/admin/email-campaigns/${campaignId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/email-campaigns'] });
      toast({
        title: "Success",
        description: "Campaign deleted successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete campaign",
        variant: "destructive"
      });
    }
  });

  // Send campaign mutation
  const sendCampaignMutation = useMutation({
    mutationFn: async (campaignId: number) => {
      return await apiRequest('POST', `/api/admin/email-campaigns/${campaignId}/send`);
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/email-campaigns'] });
      toast({
        title: "Campaign Sent",
        description: result.message || "Campaign sent successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send campaign",
        variant: "destructive"
      });
    }
  });

  const handleDelete = (campaignId: number) => {
    if (window.confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) {
      deleteCampaignMutation.mutate(campaignId);
    }
  };

  const handleSend = (campaignId: number) => {
    if (window.confirm('Are you sure you want to send this campaign? This action cannot be undone.')) {
      sendCampaignMutation.mutate(campaignId);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline" className="flex items-center gap-1"><Clock className="h-3 w-3" />Draft</Badge>;
      case 'sending':
        return <Badge variant="secondary" className="flex items-center gap-1"><Send className="h-3 w-3" />Sending</Badge>;
      case 'sent':
        return <Badge variant="default" className="flex items-center gap-1 bg-green-600"><CheckCircle className="h-3 w-3" />Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="flex items-center gap-1"><XCircle className="h-3 w-3" />Failed</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6" />
            Email Campaigns
          </h2>
          <p className="text-gray-600 mt-1">Manage promotional email campaigns</p>
        </div>
        <Button onClick={onCreateNew} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      {/* Campaigns Grid */}
      {campaigns.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No campaigns yet</h3>
            <p className="text-gray-500 mb-4">Create your first email campaign to get started</p>
            <Button onClick={onCreateNew}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {campaigns.map((campaign) => (
            <Card key={campaign.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-1">{campaign.name}</CardTitle>
                    <CardDescription className="line-clamp-1">{campaign.subject}</CardDescription>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(campaign)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      {campaign.status === 'draft' && (
                        <DropdownMenuItem onClick={() => handleSend(campaign.id)}>
                          <Send className="mr-2 h-4 w-4" />
                          Send Campaign
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => onViewAnalytics(campaign)}>
                        <BarChart3 className="mr-2 h-4 w-4" />
                        View Analytics
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(campaign.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* Status Badge */}
                  <div className="flex justify-between items-center">
                    {getStatusBadge(campaign.status)}
                    <span className="text-sm text-gray-500">
                      {new Date(campaign.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Campaign Stats */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3 text-gray-400" />
                      <span className="text-gray-600">Recipients:</span>
                      <span className="font-medium">{campaign.recipientCount}</span>
                    </div>
                    {campaign.status !== 'draft' && (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span className="text-gray-600">Sent:</span>
                        <span className="font-medium">{campaign.sentCount}</span>
                      </div>
                    )}
                  </div>

                  {/* Content Preview */}
                  <div className="border-t pt-3">
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {campaign.content.length > 100 
                        ? campaign.content.substring(0, 100) + '...' 
                        : campaign.content}
                    </p>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => onEdit(campaign)}
                      className="w-full sm:flex-1"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Edit Campaign
                    </Button>
                    {campaign.status === 'draft' && (
                      <Button 
                        size="default" 
                        onClick={() => handleSend(campaign.id)}
                        disabled={sendCampaignMutation.isPending}
                        className="w-full sm:flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {sendCampaignMutation.isPending ? '📤 Sending...' : '🚀 Send Campaign'}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}