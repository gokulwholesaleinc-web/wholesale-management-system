import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Mail, 
  Sparkles, 
  Send, 
  Save, 
  Eye, 
  Users,
  ArrowLeft,
  RefreshCw,
  Wand2,
  Filter,
  SortAsc,
  SortDesc,
  Calendar,
  DollarSign,
  ShoppingBag,
  TrendingUp,
  Clock,
  Star,
  Search,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

interface EmailCampaign {
  id?: number;
  name: string;
  subject: string;
  content: string;
  htmlContent?: string;
  status: 'draft' | 'sending' | 'sent' | 'failed';
  recipientCount?: number;
  sentCount?: number;
  failedCount?: number;
  createdBy?: string;
  createdAt?: string;
  sentAt?: string;
}

interface Customer {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  company: string;
  preferredLanguage?: string;
  customerLevel?: number;
  lastPurchaseDate?: string | null;
  totalSpent?: number;
  totalOrders?: number;
  averageOrderValue?: number;
  daysSinceLastPurchase?: number | null;
  purchaseFrequency?: string;
  mostBoughtCategory?: string | null;
  lastOrderValue?: number;
  registrationDate?: string;
  hasMarketingConsent?: boolean;
  isAdmin?: boolean;
  isEmployee?: boolean;
}

interface EmailComposerProps {
  campaign?: EmailCampaign;
  onBack: () => void;
  onSaved: () => void;
}

interface AIPrompt {
  type: 'promotional' | 'announcement' | 'seasonal' | 'custom';
  tone: 'professional' | 'friendly' | 'urgent' | 'casual';
  purpose: string;
  targetAudience: string;
  keyPoints?: string[];
  callToAction?: string;
}

export function EmailComposer({ campaign, onBack, onSaved }: EmailComposerProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState<EmailCampaign>({
    name: '',
    subject: '',
    content: '',
    htmlContent: '',
    status: 'draft'
  });

  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Enhanced filtering and sorting states
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'lastPurchase' | 'totalSpent' | 'totalOrders' | 'customerLevel' | 'registrationDate'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [filterBy, setFilterBy] = useState({
    customerLevel: [] as number[],
    purchaseRecency: 'all' as 'all' | 'recent' | 'inactive' | 'never',
    spendingRange: 'all' as 'all' | 'high' | 'medium' | 'low',
    orderFrequency: 'all' as 'all' | 'frequent' | 'regular' | 'occasional' | 'rare',
    marketingConsent: 'all' as 'all' | 'consented' | 'not-consented'
  });
  const [showFilters, setShowFilters] = useState(false);
  
  const [aiPrompt, setAiPrompt] = useState<AIPrompt>({
    type: 'promotional',
    tone: 'professional',
    purpose: '',
    targetAudience: 'wholesale customers',
    keyPoints: [],
    callToAction: ''
  });

  // Load campaign data if editing
  useEffect(() => {
    if (campaign) {
      setFormData(campaign);
    }
  }, [campaign]);

  // Fetch customers with purchase history for recipient selection  
  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ['/api/admin/email/customers', 'with-history'],
    queryFn: async () => {
      return await apiRequest('GET', '/api/admin/email/customers?includePurchaseHistory=true');
    }
  });

  // Save campaign mutation
  const saveCampaignMutation = useMutation({
    mutationFn: async (data: EmailCampaign & { sendImmediately?: boolean }) => {
      if (campaign?.id) {
        return await apiRequest('PUT', `/api/admin/email-campaigns/${campaign.id}`, data);
      } else {
        return await apiRequest('POST', '/api/admin/email-campaigns', data);
      }
    },
    onSuccess: async (savedCampaign, variables) => {
      console.log('📧 Campaign saved successfully:', {
        savedCampaign,
        savedCampaignId: savedCampaign?.id,
        savedCampaignType: typeof savedCampaign?.id,
        variables,
        existingCampaignId: campaign?.id,
        selectedRecipientsCount: selectedRecipients.length
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/admin/email-campaigns'] });
      toast({
        title: "Success",
        description: campaign?.id ? "Campaign updated successfully" : "Campaign created successfully"
      });
      
      // Ensure campaign ID is valid and convert to number properly
      let campaignId: number;
      try {
        campaignId = parseInt(String(savedCampaign?.id));
        if (isNaN(campaignId) || campaignId <= 0) {
          throw new Error(`Invalid campaign ID: ${savedCampaign?.id}`);
        }
      } catch (error) {
        console.error('❌ Campaign ID conversion failed:', savedCampaign?.id, error);
        toast({
          title: "Error",
          description: "Campaign saved but ID format is invalid. Please refresh and try again.",
          variant: "destructive"
        });
        return;
      }
      
      try {
        // Handle sequential operations for new campaigns with recipients
        if (!campaign?.id && selectedRecipients.length > 0) {
          console.log('📧 Adding recipients for new campaign ID:', campaignId);
          
          // Add recipients first
          await addRecipientsMutation.mutateAsync({
            campaignId,
            userIds: selectedRecipients,
            sendImmediately: false // Don't send yet
          });
          
          // If sending immediately, send after recipients are added
          if (variables.sendImmediately) {
            console.log('📧 Sending campaign after recipients added:', campaignId);
            await sendCampaignMutation.mutateAsync(campaignId);
          } else {
            onSaved();
          }
        } else if (variables.sendImmediately && campaignId) {
          // Send existing campaign immediately
          console.log('📧 Sending existing campaign:', campaignId);
          await sendCampaignMutation.mutateAsync(campaignId);
        } else {
          console.log('📧 Campaign saved, not sending immediately');
          onSaved();
        }
      } catch (error) {
        console.error('❌ Error in campaign workflow:', error);
        toast({
          title: "Error",
          description: "Campaign saved but there was an issue with the workflow. Please try again.",
          variant: "destructive"
        });
      }
    },
    onError: (error: any) => {
      console.error('❌ Campaign save error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save campaign",
        variant: "destructive"
      });
    }
  });

  // Add recipients mutation
  const addRecipientsMutation = useMutation({
    mutationFn: async (data: { campaignId: number; userIds: string[]; sendImmediately?: boolean }) => {
      console.log('📧 Adding recipients to campaign:', data.campaignId, 'Recipients:', data.userIds.length);
      
      // Validate campaign ID before making request
      const campaignId = parseInt(String(data.campaignId));
      if (isNaN(campaignId) || campaignId <= 0) {
        throw new Error(`Invalid campaign ID for adding recipients: ${data.campaignId}`);
      }
      
      return await apiRequest('POST', `/api/admin/email-campaigns/${campaignId}/recipients`, {
        userIds: data.userIds
      });
    },
    onSuccess: (result, variables) => {
      console.log('📧 Recipients added successfully:', result);
      
      toast({
        title: "Success",
        description: `Recipients added successfully (${variables.userIds.length} recipients)`
      });
      
      // Don't handle sending here - let the caller handle it
      if (!variables.sendImmediately) {
        onSaved();
      }
    },
    onError: (error: any) => {
      console.error('❌ Recipients add error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add recipients",
        variant: "destructive"
      });
    }
  });

  // Send campaign mutation
  const sendCampaignMutation = useMutation({
    mutationFn: async (campaignId: number) => {
      console.log('📧 Attempting to send campaign ID:', campaignId);
      
      // Validate campaign ID
      const validCampaignId = parseInt(String(campaignId));
      if (isNaN(validCampaignId) || validCampaignId <= 0) {
        throw new Error(`Invalid campaign ID for sending: ${campaignId}`);
      }
      
      console.log('📧 Sending campaign request to:', `/api/admin/email-campaigns/${validCampaignId}/send`);
      
      // Verify campaign exists and is in correct status
      try {
        const campaignCheck = await apiRequest('GET', `/api/admin/email-campaigns/${validCampaignId}`);
        if (!campaignCheck) {
          throw new Error(`Campaign ${validCampaignId} not found`);
        }
        if (campaignCheck.status !== 'draft') {
          throw new Error(`Campaign ${validCampaignId} is not in draft status (current: ${campaignCheck.status})`);
        }
        console.log('✅ Campaign verified and ready to send:', campaignCheck.name);
      } catch (checkError) {
        console.error('❌ Campaign verification failed:', checkError);
        throw checkError;
      }
      
      return await apiRequest('POST', `/api/admin/email-campaigns/${validCampaignId}/send`);
    },
    onSuccess: (result: any) => {
      console.log('📧 Campaign sent successfully:', result);
      
      const recipientCount = result?.results?.sent || result?.recipientCount || selectedRecipients.length;
      
      toast({
        title: "Campaign Sent!",
        description: `Campaign sent successfully to ${recipientCount} recipients`,
        className: "bg-green-50 border-green-200"
      });
      
      // Refresh campaign list and close
      queryClient.invalidateQueries({ queryKey: ['/api/admin/email-campaigns'] });
      onSaved();
    },
    onError: (error: any) => {
      console.error('❌ Campaign send error:', error);
      toast({
        title: "Send Failed",
        description: error.message || "Failed to send campaign",
        variant: "destructive"
      });
    }
  });

  // Generate AI content mutation
  const generateAIContentMutation = useMutation({
    mutationFn: async (prompt: AIPrompt) => {
      return await apiRequest('POST', '/api/admin/email-campaigns/generate-content', prompt);
    },
    onSuccess: (generatedContent: any) => {
      setFormData(prev => ({
        ...prev,
        subject: generatedContent.subject,
        content: generatedContent.content,
        htmlContent: generatedContent.htmlContent
      }));
      setShowAIDialog(false);
      toast({
        title: "Content Generated",
        description: "AI-generated email content has been applied"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate content",
        variant: "destructive"
      });
    }
  });

  const handleInputChange = (field: keyof EmailCampaign, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!formData.name || !formData.subject || !formData.content) {
      toast({
        title: "Missing Required Fields",
        description: "Please fill in campaign name, subject, and content",
        variant: "destructive"
      });
      return;
    }

    console.log('📧 handleSave called with:', {
      formData,
      selectedRecipients,
      selectedRecipientsCount: selectedRecipients.length
    });
    
    // Save the campaign without recipients - they'll be added separately
    saveCampaignMutation.mutate({
      ...formData
    });
  };

  const handleSaveAndSend = () => {
    if (!formData.name || !formData.subject || !formData.content) {
      toast({
        title: "Missing Required Fields", 
        description: "Please fill in campaign name, subject, and content",
        variant: "destructive"
      });
      return;
    }

    if (selectedRecipients.length === 0) {
      toast({
        title: "No Recipients Selected",
        description: "Please select at least one customer to send the campaign to",
        variant: "destructive"
      });
      return;
    }

    console.log('📧 handleSaveAndSend called with:', {
      formData,
      selectedRecipients,
      selectedRecipientsCount: selectedRecipients.length,
      campaignId: campaign?.id
    });

    // Save the campaign first, then send it
    saveCampaignMutation.mutate({
      ...formData,
      sendImmediately: true
    });
  };

  const handleGenerateAI = () => {
    if (!aiPrompt.purpose.trim()) {
      toast({
        title: "Missing Information",
        description: "Please describe the purpose of your email",
        variant: "destructive"
      });
      return;
    }

    generateAIContentMutation.mutate(aiPrompt);
  };

  const handleRecipientToggle = (customerId: string) => {
    setSelectedRecipients(prev => 
      prev.includes(customerId) 
        ? prev.filter(id => id !== customerId)
        : [...prev, customerId]
    );
  };

  const handleSelectAll = () => {
    if (selectedRecipients.length === filteredAndSortedCustomers.length) {
      setSelectedRecipients([]);
    } else {
      setSelectedRecipients(filteredAndSortedCustomers.map(c => c.id));
    }
  };

  // Enhanced filtering and sorting logic
  const filteredAndSortedCustomers = React.useMemo(() => {
    let filtered = customers.filter((customer) => {
      // Search filter
      const searchMatch = !searchTerm || 
        customer.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.company?.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!searchMatch) return false;

      // Customer level filter
      if (filterBy.customerLevel.length > 0 && !filterBy.customerLevel.includes(customer.customerLevel || 1)) {
        return false;
      }

      // Purchase recency filter
      if (filterBy.purchaseRecency !== 'all') {
        const days = customer.daysSinceLastPurchase;
        switch (filterBy.purchaseRecency) {
          case 'recent':
            if (!days || days > 30) return false;
            break;
          case 'inactive':
            if (!days || days <= 90) return false;
            break;
          case 'never':
            if (days !== null) return false;
            break;
        }
      }

      // Spending range filter
      if (filterBy.spendingRange !== 'all') {
        const totalSpent = customer.totalSpent || 0;
        switch (filterBy.spendingRange) {
          case 'high':
            if (totalSpent < 1000) return false;
            break;
          case 'medium':
            if (totalSpent < 100 || totalSpent >= 1000) return false;
            break;
          case 'low':
            if (totalSpent >= 100) return false;
            break;
        }
      }

      // Order frequency filter
      if (filterBy.orderFrequency !== 'all') {
        const frequency = customer.purchaseFrequency || 'Never';
        switch (filterBy.orderFrequency) {
          case 'frequent':
            if (!frequency.includes('Very Frequent') && !frequency.includes('Frequent')) return false;
            break;
          case 'regular':
            if (!frequency.includes('Regular')) return false;
            break;
          case 'occasional':
            if (!frequency.includes('Occasional')) return false;
            break;
          case 'rare':
            if (!frequency.includes('Rare') && !frequency.includes('Never')) return false;
            break;
        }
      }

      // Marketing consent filter
      if (filterBy.marketingConsent !== 'all') {
        const hasConsent = customer.hasMarketingConsent;
        switch (filterBy.marketingConsent) {
          case 'consented':
            if (!hasConsent) return false;
            break;
          case 'not-consented':
            if (hasConsent) return false;
            break;
        }
      }

      return true;
    });

    // Sort customers
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = `${a.firstName} ${a.lastName}`.toLowerCase();
          bValue = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case 'lastPurchase':
          aValue = a.lastPurchaseDate ? new Date(a.lastPurchaseDate).getTime() : 0;
          bValue = b.lastPurchaseDate ? new Date(b.lastPurchaseDate).getTime() : 0;
          break;
        case 'totalSpent':
          aValue = a.totalSpent || 0;
          bValue = b.totalSpent || 0;
          break;
        case 'totalOrders':
          aValue = a.totalOrders || 0;
          bValue = b.totalOrders || 0;
          break;
        case 'customerLevel':
          aValue = a.customerLevel || 1;
          bValue = b.customerLevel || 1;
          break;
        case 'registrationDate':
          aValue = a.registrationDate ? new Date(a.registrationDate).getTime() : 0;
          bValue = b.registrationDate ? new Date(b.registrationDate).getTime() : 0;
          break;
        default:
          return 0;
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [customers, searchTerm, sortBy, sortOrder, filterBy]);

  const getCustomerLevelBadge = (level: number) => {
    const levels = {
      1: { name: 'Standard', color: 'bg-gray-500' },
      2: { name: 'Bronze', color: 'bg-orange-600' },
      3: { name: 'Silver', color: 'bg-gray-400' },
      4: { name: 'Gold', color: 'bg-yellow-500' },
      5: { name: 'Platinum', color: 'bg-purple-600' }
    };
    const levelInfo = levels[level as keyof typeof levels] || levels[1];
    return (
      <Badge className={`${levelInfo.color} text-white text-xs`}>
        {levelInfo.name}
      </Badge>
    );
  };

  const getPurchaseRecencyColor = (days: number | null) => {
    if (days === null) return 'text-gray-400';
    if (days <= 7) return 'text-green-600';
    if (days <= 30) return 'text-blue-600';
    if (days <= 90) return 'text-orange-600';
    return 'text-red-600';
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterBy({
      customerLevel: [],
      purchaseRecency: 'all',
      spendingRange: 'all',
      orderFrequency: 'all',
      marketingConsent: 'all'
    });
    setSortBy('name');
    setSortOrder('asc');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4 md:space-y-0 md:flex md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="self-start">
            <ArrowLeft className="h-4 w-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Back to Campaigns</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
              <Mail className="h-5 w-5 sm:h-6 sm:w-6" />
              {campaign?.id ? 'Edit Campaign' : 'Create New Campaign'}
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              {campaign?.id ? `Editing "${campaign.name}"` : 'Create a new email campaign'}
            </p>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
          <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
            <DialogTrigger asChild>
              <Button 
                variant="outline" 
                className="flex items-center justify-center gap-1 sm:gap-2 w-full sm:w-auto bg-gradient-to-r from-purple-50 to-blue-50 hover:from-purple-100 hover:to-blue-100 border-purple-200 text-purple-700 font-medium text-sm py-2 px-3 sm:px-4"
              >
                <Sparkles className="h-4 w-4 flex-shrink-0" />
                <span className="hidden md:inline">✨ AI Generate Content</span>
                <span className="md:hidden">✨ AI Generate</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto mx-4 sm:mx-0">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5" />
                  AI Content Generator
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Email Type</Label>
                    <Select value={aiPrompt.type} onValueChange={(value: any) => setAiPrompt(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="promotional">Promotional</SelectItem>
                        <SelectItem value="announcement">Announcement</SelectItem>
                        <SelectItem value="seasonal">Seasonal</SelectItem>
                        <SelectItem value="custom">Custom</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="tone">Tone</Label>
                    <Select value={aiPrompt.tone} onValueChange={(value: any) => setAiPrompt(prev => ({ ...prev, tone: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="purpose">Purpose/Goal</Label>
                  <Textarea 
                    id="purpose"
                    placeholder="Describe what you want to achieve with this email..."
                    value={aiPrompt.purpose}
                    onChange={(e) => setAiPrompt(prev => ({ ...prev, purpose: e.target.value }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="cta">Call to Action (Optional)</Label>
                  <Input 
                    id="cta"
                    placeholder="e.g., Shop Now, Learn More, Contact Us"
                    value={aiPrompt.callToAction}
                    onChange={(e) => setAiPrompt(prev => ({ ...prev, callToAction: e.target.value }))}
                  />
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-sm text-blue-800">
                    📧 <strong>Multi-Language Support:</strong> This email will be automatically translated into each recipient's preferred language when sent.
                  </p>
                </div>
                
                <div className="flex gap-2">
                  <Button 
                    onClick={handleGenerateAI}
                    disabled={generateAIContentMutation.isPending}
                    className="flex-1"
                  >
                    {generateAIContentMutation.isPending ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 mr-2" />
                        Generate Content
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAIDialog(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button 
            onClick={handleSave}
            disabled={saveCampaignMutation.isPending}
            variant="outline"
            className="w-full sm:w-auto font-medium text-sm py-2 px-3 sm:px-4"
          >
            {saveCampaignMutation.isPending ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1 sm:mr-2 animate-spin" />
                <span className="hidden sm:inline">Saving...</span>
                <span className="sm:hidden">Save...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
                <span className="hidden sm:inline">💾 Save as Draft</span>
                <span className="sm:hidden">💾 Save</span>
              </>
            )}
          </Button>
          
          <Button 
            onClick={handleSaveAndSend}
            disabled={saveCampaignMutation.isPending || !formData.name || !formData.subject || !formData.content || selectedRecipients.length === 0}
            className="w-full md:w-auto bg-green-600 hover:bg-green-700 text-white font-medium text-sm py-2 px-3 md:px-4"
          >
            <Send className="h-4 w-4 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="hidden md:inline">🚀 Save & Send Now</span>
            <span className="md:hidden">🚀 Send</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Campaign Details */}
        <div className="lg:col-span-2 space-y-4 lg:space-y-6">
          <Card>
            <CardHeader className="pb-3 lg:pb-6">
              <CardTitle className="text-base lg:text-lg">Campaign Details</CardTitle>
              <CardDescription className="text-xs lg:text-sm">Basic information about your email campaign</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-xs lg:text-sm">Campaign Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="e.g., Spring Sale 2024"
                  className="h-8 lg:h-10 text-sm"
                />
              </div>
              
              <div>
                <Label htmlFor="subject" className="text-xs lg:text-sm">Email Subject</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  placeholder="e.g., Spring Sale - 20% Off Everything!"
                  className="h-8 lg:h-10 text-sm"
                />
              </div>
              
              <div>
                <Label htmlFor="content" className="text-xs lg:text-sm">Email Content</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => handleInputChange('content', e.target.value)}
                  placeholder="Write your email content here..."
                  rows={6}
                  className="text-sm resize-none"
                />
              </div>
              
              <div className="hidden lg:block">
                <Label htmlFor="htmlContent" className="text-xs lg:text-sm">HTML Content (Optional)</Label>
                <Textarea
                  id="htmlContent"
                  value={formData.htmlContent || ''}
                  onChange={(e) => handleInputChange('htmlContent', e.target.value)}
                  placeholder="HTML version of your email (optional)"
                  rows={3}
                  className="text-sm resize-none"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recipients */}
        <div className="space-y-4 lg:space-y-6">
          <Card>
            <CardHeader className="pb-2 lg:pb-3">
              <CardTitle className="flex items-center gap-2 text-sm lg:text-base">
                <Users className="h-4 w-4 lg:h-5 lg:w-5 flex-shrink-0" />
                <span className="hidden lg:inline">Target Customers ({selectedRecipients.length} selected)</span>
                <span className="lg:hidden">Recipients ({selectedRecipients.length})</span>
              </CardTitle>
              <CardDescription className="text-xs lg:text-sm hidden lg:block">Select customers to receive this campaign</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Search and Filter Controls */}
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                      <Input
                        placeholder="Search customers..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <Filter className="h-4 w-4 mr-1" />
                      Filters
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    >
                      {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                    </Button>
                  </div>

                  {/* Filter Panel */}
                  {showFilters && (
                    <Card className="p-3 sm:p-4 space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-medium text-sm sm:text-base">Advanced Filters</h4>
                        <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs">
                          <X className="h-3 w-3 mr-1" />
                          Clear
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs sm:text-sm">Sort By</Label>
                          <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                            <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="name">Name</SelectItem>
                              <SelectItem value="lastPurchase">Last Purchase</SelectItem>
                              <SelectItem value="totalSpent">Total Spent</SelectItem>
                              <SelectItem value="totalOrders">Total Orders</SelectItem>
                              <SelectItem value="customerLevel">Customer Level</SelectItem>
                              <SelectItem value="registrationDate">Registration Date</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label className="text-xs sm:text-sm">Purchase Recency</Label>
                          <Select value={filterBy.purchaseRecency} onValueChange={(value: any) => setFilterBy(prev => ({ ...prev, purchaseRecency: value }))}>
                            <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Customers</SelectItem>
                              <SelectItem value="recent">Recent (30 days)</SelectItem>
                              <SelectItem value="inactive">Inactive (90+ days)</SelectItem>
                              <SelectItem value="never">Never Purchased</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label className="text-xs sm:text-sm">Spending Range</Label>
                          <Select value={filterBy.spendingRange} onValueChange={(value: any) => setFilterBy(prev => ({ ...prev, spendingRange: value }))}>
                            <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Ranges</SelectItem>
                              <SelectItem value="high">High Spenders ($1000+)</SelectItem>
                              <SelectItem value="medium">Medium Spenders ($100-$999)</SelectItem>
                              <SelectItem value="low">Low Spenders (&lt;$100)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label className="text-xs sm:text-sm">Order Frequency</Label>
                          <Select value={filterBy.orderFrequency} onValueChange={(value: any) => setFilterBy(prev => ({ ...prev, orderFrequency: value }))}>
                            <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Frequencies</SelectItem>
                              <SelectItem value="frequent">Frequent Buyers</SelectItem>
                              <SelectItem value="regular">Regular Buyers</SelectItem>
                              <SelectItem value="occasional">Occasional Buyers</SelectItem>
                              <SelectItem value="rare">Rare Buyers</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-xs sm:text-sm">Marketing Consent</Label>
                          <Select value={filterBy.marketingConsent || 'all'} onValueChange={(value: any) => setFilterBy(prev => ({ ...prev, marketingConsent: value }))}>
                            <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="all">All Users</SelectItem>
                              <SelectItem value="consented">Marketing OK Only</SelectItem>
                              <SelectItem value="not-consented">No Consent</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </Card>
                  )}
                  
                  <div className="flex justify-between items-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                    >
                      {selectedRecipients.length === filteredAndSortedCustomers.length ? 'Deselect All' : 'Select All'}
                    </Button>
                    <div className="flex gap-2">
                      <Badge variant="secondary">
                        {filteredAndSortedCustomers.length} of {customers.length} customers
                      </Badge>
                      <Badge variant="outline">
                        {selectedRecipients.length} selected
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="max-h-60 sm:max-h-80 lg:max-h-96 overflow-y-auto space-y-1 sm:space-y-2">
                  {filteredAndSortedCustomers.length === 0 ? (
                    <div className="text-center py-6 sm:py-8 text-gray-500">
                      <Users className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm sm:text-base">No customers match your filters</p>
                      <Button variant="outline" size="sm" onClick={clearFilters} className="mt-2 text-xs sm:text-sm">
                        Clear Filters
                      </Button>
                    </div>
                  ) : (
                    filteredAndSortedCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        className={`p-2 sm:p-3 border rounded-md sm:rounded-lg cursor-pointer transition-all duration-200 ${
                          selectedRecipients.includes(customer.id)
                            ? 'bg-blue-50 border-blue-200 shadow-sm'
                            : 'hover:bg-gray-50 hover:shadow-sm'
                        }`}
                        onClick={() => handleRecipientToggle(customer.id)}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                              <p className="font-medium text-xs sm:text-sm truncate leading-tight">
                                {customer.firstName} {customer.lastName}
                              </p>
                              <div className="self-start">
                                {getCustomerLevelBadge(customer.customerLevel || 1)}
                              </div>
                            </div>
                            
                            <p className="text-xs text-gray-500 truncate mb-1 leading-tight">{customer.email}</p>
                            
                            {customer.company && (
                              <p className="text-xs text-gray-400 truncate mb-1 leading-tight">{customer.company}</p>
                            )}
                            
                            {/* Purchase History Summary - Compact for mobile */}
                            <div className="mt-1 space-y-1">
                              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
                                <div className="flex items-center gap-1">
                                  <DollarSign className="h-3 w-3 text-green-600 flex-shrink-0" />
                                  <span className="text-gray-600">Spent:</span>
                                  <span className="font-medium">{formatCurrency(customer.totalSpent || 0)}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <ShoppingBag className="h-3 w-3 text-blue-600 flex-shrink-0" />
                                  <span className="text-gray-600">Orders:</span>
                                  <span className="font-medium">{customer.totalOrders || 0}</span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-1 text-xs">
                                <Calendar className={`h-3 w-3 flex-shrink-0 ${getPurchaseRecencyColor(customer.daysSinceLastPurchase ?? null)}`} />
                                <span className="text-gray-600">Last:</span>
                                <span className={`font-medium ${getPurchaseRecencyColor(customer.daysSinceLastPurchase ?? null)}`}>
                                  {customer.lastPurchaseDate 
                                    ? `${customer.daysSinceLastPurchase}d ago`
                                    : 'Never'
                                  }
                                </span>
                              </div>
                              
                              {customer.purchaseFrequency && customer.purchaseFrequency !== 'Never' && (
                                <div className="flex items-center gap-1 text-xs">
                                  <TrendingUp className="h-3 w-3 text-purple-600 flex-shrink-0" />
                                  <span className="text-gray-600 hidden sm:inline">Frequency:</span>
                                  <span className="text-gray-600 sm:hidden">Freq:</span>
                                  <span className="font-medium text-purple-600 truncate">{customer.purchaseFrequency}</span>
                                </div>
                              )}
                              
                              {customer.mostBoughtCategory && (
                                <div className="flex items-center gap-1 text-xs">
                                  <Star className="h-3 w-3 text-yellow-600 flex-shrink-0" />
                                  <span className="text-gray-600 hidden sm:inline">Favorite:</span>
                                  <span className="text-gray-600 sm:hidden">Fav:</span>
                                  <span className="font-medium text-yellow-600 truncate">{customer.mostBoughtCategory}</span>
                                </div>
                              )}
                            </div>
                            
                            {/* Language and Marketing Consent Badges */}
                            <div className="mt-1 sm:mt-2 flex flex-wrap gap-1">
                              {customer.preferredLanguage && (
                                <Badge variant="outline" className="text-xs px-1 py-0.5">
                                  {customer.preferredLanguage.toUpperCase()}
                                </Badge>
                              )}
                              {/* Marketing consent indicator */}
                              {customer.hasMarketingConsent ? (
                                <Badge 
                                  variant="outline" 
                                  className="text-xs px-1 py-0.5 bg-green-50 text-green-700 border-green-200"
                                >
                                  📧 Marketing OK
                                </Badge>
                              ) : (
                                <Badge 
                                  variant="outline" 
                                  className="text-xs px-1 py-0.5 bg-red-50 text-red-700 border-red-200"
                                >
                                  ❌ No Marketing Consent
                                </Badge>
                              )}
                            </div>
                          </div>
                          
                          {selectedRecipients.includes(customer.id) && (
                            <div className="w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center ml-2">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}