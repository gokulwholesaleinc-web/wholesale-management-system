import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft,
  Mail, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock,
  BarChart3,
  Calendar,
  User
} from 'lucide-react';

interface EmailCampaign {
  id: number;
  name: string;
  subject: string;
  status: string;
  createdAt: string;
  sentAt?: string;
}

interface CampaignAnalytics {
  campaign: {
    id: number;
    name: string;
    subject: string;
    status: string;
    createdAt: string;
    sentAt?: string;
  };
  metrics: {
    totalRecipients: number;
    sent: number;
    failed: number;
    pending: number;
  };
  recipients: Array<{
    email: string;
    customerName: string;
    company?: string;
    status: string;
    sentAt?: string;
    failureReason?: string;
  }>;
}

interface EmailCampaignAnalyticsProps {
  campaign: EmailCampaign;
  onBack: () => void;
}

export function EmailCampaignAnalytics({ campaign, onBack }: EmailCampaignAnalyticsProps) {
  // Fetch campaign analytics
  const { data: analytics, isLoading } = useQuery<CampaignAnalytics>({
    queryKey: ['/api/admin/email-campaigns', campaign.id, 'analytics'],
    queryFn: async () => {
      return await apiRequest('GET', `/api/admin/email-campaigns/${campaign.id}/analytics`);
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-600"><CheckCircle className="h-3 w-3 mr-1" />Sent</Badge>;
      case 'failed':
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
          </Button>
          <div>
            <h2 className="text-2xl font-bold">Loading Analytics...</h2>
          </div>
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-center h-24">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Campaigns
          </Button>
          <div>
            <h2 className="text-2xl font-bold">Analytics Not Available</h2>
          </div>
        </div>
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-gray-500">Analytics data is not available for this campaign.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { metrics } = analytics;
  const successRate = metrics.totalRecipients > 0 ? (metrics.sent / metrics.totalRecipients) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Campaigns
        </Button>
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Campaign Analytics
          </h2>
          <p className="text-gray-600 mt-1">{analytics.campaign.name}</p>
        </div>
      </div>

      {/* Campaign Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Campaign Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Campaign Name:</span>
                <span className="font-medium">{analytics.campaign.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Subject:</span>
                <span className="font-medium">{analytics.campaign.subject}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                {getStatusBadge(analytics.campaign.status)}
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Created:</span>
                <span className="font-medium">
                  {new Date(analytics.campaign.createdAt).toLocaleString()}
                </span>
              </div>
              {analytics.campaign.sentAt && (
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Sent:</span>
                  <span className="font-medium">
                    {new Date(analytics.campaign.sentAt).toLocaleString()}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Success Rate:</span>
                <span className="font-medium">{successRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Recipients</p>
                <p className="text-2xl font-bold">{metrics.totalRecipients}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Successfully Sent</p>
                <p className="text-2xl font-bold text-green-600">{metrics.sent}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Failed</p>
                <p className="text-2xl font-bold text-red-600">{metrics.failed}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-orange-600">{metrics.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recipients Details */}
      <Card>
        <CardHeader>
          <CardTitle>Recipients Details</CardTitle>
          <CardDescription>
            Detailed delivery status for each recipient
          </CardDescription>
        </CardHeader>
        <CardContent>
          {analytics.recipients.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No recipient data available
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Customer</th>
                    <th className="text-left py-3 px-4 font-medium">Email</th>
                    <th className="text-left py-3 px-4 font-medium">Company</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Sent At</th>
                    <th className="text-left py-3 px-4 font-medium">Failure Reason</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.recipients.map((recipient, index) => (
                    <tr key={index} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-gray-400" />
                          <span className="font-medium">
                            {recipient.customerName || 'Unknown Customer'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">{recipient.email}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">
                          {recipient.company || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(recipient.status)}
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-gray-600">
                          {recipient.sentAt ? new Date(recipient.sentAt).toLocaleString() : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-red-600">
                          {recipient.failureReason || '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}