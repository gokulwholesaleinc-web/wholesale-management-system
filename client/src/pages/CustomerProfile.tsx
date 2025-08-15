import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { User, Phone, Mail, Bell, Globe, MessageCircle } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { apiRequest } from '@/lib/queryClient';

interface CustomerProfile {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  alternativeEmail?: string;
  phone?: string;
  company?: string;
  preferredLanguage?: string;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  notificationTypes?: {
    orderConfirmation: boolean;
    orderStatusUpdate: boolean;
    promotions: boolean;
    lowStock: boolean;
    priceAlerts: boolean;
    newsletters: boolean;
  };
}

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'it', name: 'Italiano' },
  { code: 'pt', name: 'Português' },
  { code: 'zh', name: '中文' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'ar', name: 'العربية' },
  { code: 'hi', name: 'हिन्दी' },
  { code: 'ru', name: 'Русский' },
  { code: 'th', name: 'ไทย' },
  { code: 'vi', name: 'Tiếng Việt' }
];

export default function CustomerProfile() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [profileData, setProfileData] = useState<CustomerProfile | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [alternativeEmail, setAlternativeEmail] = useState('');

  // Fetch customer profile
  const { data: profile, isLoading } = useQuery({
    queryKey: ['/api/customer/profile'],
    onSuccess: (data) => {
      setProfileData(data);
      setPhoneNumber(data.phone || '');
      setAlternativeEmail(data.alternativeEmail || '');
    }
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<CustomerProfile>) => {
      const response = await apiRequest(`/api/customer/profile`, {
        method: 'PUT',
        body: JSON.stringify(updates)
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Profile Updated",
        description: "Your profile has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/customer/profile'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update profile.",
        variant: "destructive",
      });
    }
  });

  // Update notification preferences mutation
  const updateNotificationsMutation = useMutation({
    mutationFn: async (preferences: any) => {
      const response = await apiRequest(`/api/notifications/preferences/${profile?.id}`, {
        method: 'PUT',
        body: JSON.stringify(preferences)
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Notification Preferences Updated",
        description: "Your notification preferences have been saved.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/customer/profile'] });
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update notification preferences.",
        variant: "destructive",
      });
    }
  });

  const handleUpdateProfile = () => {
    if (!profileData) return;

    const updates = {
      phone: phoneNumber.trim() || null,
      alternativeEmail: alternativeEmail.trim() || null,
    };

    updateProfileMutation.mutate(updates);
  };

  const handleNotificationToggle = (type: 'emailNotifications' | 'smsNotifications', value: boolean) => {
    if (!profileData) return;

    // Special handling for SMS notifications - show consent dialog
    if (type === 'smsNotifications' && value && !phoneNumber) {
      toast({
        title: "Phone number required",
        description: "Please add your phone number before enabling SMS notifications.",
        variant: "destructive",
      });
      return;
    }

    // Show SMS consent confirmation when enabling SMS notifications
    if (type === 'smsNotifications' && value) {
      const confirmed = window.confirm(`SMS CONSENT REQUIRED

By enabling SMS notifications, you consent to receive automated text messages from Gokul Wholesale at the phone number provided.

IMPORTANT INFORMATION:
• Message frequency varies based on your account activity
• Standard message and data rates may apply from your carrier
• Supported carriers: T-Mobile®, AT&T, Verizon, Sprint, and others
• You can opt-out at any time by replying STOP to any message
• Reply HELP for customer support

By clicking OK, you agree to receive SMS notifications and acknowledge that message and data rates may apply.

Do you consent to receive SMS notifications?`);
      
      if (!confirmed) {
        return; // User declined consent
      }

      toast({
        title: "SMS notifications enabled",
        description: "You have consented to receive text messages. Message and data rates may apply.",
        variant: "default",
      });
    }

    const preferences = {
      ...profileData,
      [type]: value
    };

    updateNotificationsMutation.mutate(preferences);
  };

  const handleNotificationTypeToggle = (type: string, value: boolean) => {
    if (!profileData) return;

    const notificationTypes = {
      ...profileData.notificationTypes,
      [type]: value
    };

    const preferences = {
      ...profileData,
      notificationTypes
    };

    updateNotificationsMutation.mutate(preferences);
  };

  const handleLanguageChange = (language: string) => {
    if (!profileData) return;

    const preferences = {
      ...profileData,
      preferredLanguage: language
    };

    updateNotificationsMutation.mutate(preferences);
  };

  // Test SMS notification
  const testSMSMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('/api/notifications/notify/test-sms', {
        method: 'POST',
        body: JSON.stringify({
          customerId: profile?.id,
          phoneNumber: phoneNumber,
          immediate: true
        })
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Test SMS Sent",
        description: "A test SMS has been sent to your phone number.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "SMS Test Failed",
        description: error.message || "Failed to send test SMS.",
        variant: "destructive",
      });
    }
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader 
        title="Customer Profile"
        description="Manage your account information and notification preferences"
      />

      {/* Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Personal Information
          </CardTitle>
          <CardDescription>
            Update your contact information and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                value={profileData?.firstName || ''}
                readOnly
                className="bg-gray-50"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                value={profileData?.lastName || ''}
                readOnly
                className="bg-gray-50"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Primary Email</Label>
            <Input
              id="email"
              type="email"
              value={profileData?.email || ''}
              readOnly
              className="bg-gray-50"
            />
          </div>

          <div>
            <Label htmlFor="alternativeEmail">Alternative Email</Label>
            <Input
              id="alternativeEmail"
              type="email"
              value={alternativeEmail}
              onChange={(e) => setAlternativeEmail(e.target.value)}
              placeholder="Enter alternative email for notifications"
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <div className="flex gap-2">
              <Input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter phone number for SMS notifications"
              />
              {phoneNumber && (
                <Button
                  onClick={() => testSMSMutation.mutate()}
                  variant="outline"
                  size="sm"
                  disabled={testSMSMutation.isPending}
                >
                  Test SMS
                </Button>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={profileData?.company || ''}
              readOnly
              className="bg-gray-50"
            />
          </div>

          <Button 
            onClick={handleUpdateProfile}
            disabled={updateProfileMutation.isPending}
            className="w-full md:w-auto"
          >
            {updateProfileMutation.isPending ? 'Updating...' : 'Update Profile'}
          </Button>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notification Preferences
          </CardTitle>
          <CardDescription>
            Choose how you'd like to receive notifications
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Language Selection */}
          <div>
            <Label className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Preferred Language
            </Label>
            <Select
              value={profileData?.preferredLanguage || 'en'}
              onValueChange={handleLanguageChange}
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.code} value={lang.code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Delivery Method Preferences */}
          <div className="space-y-4">
            <h4 className="font-semibold">Delivery Methods</h4>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                <Label>Email Notifications</Label>
                {profileData?.emailNotifications && (
                  <Badge variant="secondary">Enabled</Badge>
                )}
              </div>
              <Switch
                checked={profileData?.emailNotifications ?? true}
                onCheckedChange={(checked) => handleNotificationToggle('emailNotifications', checked)}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4" />
                <div>
                  <Label>SMS Notifications</Label>
                  {profileData?.smsNotifications && (
                    <Badge variant="secondary" className="ml-2">Enabled</Badge>
                  )}
                  {!phoneNumber && (
                    <Badge variant="destructive" className="ml-2">Phone Required</Badge>
                  )}
                  {phoneNumber && (
                    <p className="text-xs text-blue-600 mt-1">
                      📱 By enabling SMS, you consent to receive text messages. Message and data rates may apply. Reply STOP to opt-out.
                    </p>
                  )}
                </div>
              </div>
              <Switch
                checked={profileData?.smsNotifications ?? false}
                onCheckedChange={(checked) => handleNotificationToggle('smsNotifications', checked)}
                disabled={!phoneNumber}
              />
            </div>
          </div>

          <Separator />

          {/* Notification Types */}
          <div className="space-y-4">
            <h4 className="font-semibold">Notification Types</h4>
            
            <div className="space-y-3">
              {[
                { key: 'orderConfirmation', label: 'Order Confirmations', description: 'New order placement confirmations' },
                { key: 'orderStatusUpdate', label: 'Order Status Updates', description: 'Order processing, ready, shipped notifications' },
                { key: 'promotions', label: 'Promotions & Offers', description: 'Special deals and discount notifications' },
                { key: 'lowStock', label: 'Low Stock Alerts', description: 'When your favorite products are running low' },
                { key: 'priceAlerts', label: 'Price Alerts', description: 'Price changes on watched products' },
                { key: 'newsletters', label: 'Newsletters', description: 'Company updates and news' }
              ].map((type) => (
                <div key={type.key} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{type.label}</div>
                    <div className="text-sm text-gray-600">{type.description}</div>
                  </div>
                  <Switch
                    checked={profileData?.notificationTypes?.[type.key] ?? true}
                    onCheckedChange={(checked) => handleNotificationTypeToggle(type.key, checked)}
                  />
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}