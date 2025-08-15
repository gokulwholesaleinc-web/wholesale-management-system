import { AppLayout } from "@/layout/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Mail, MessageSquare, Phone } from "lucide-react";
import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";

export default function Account() {
  const { user, isLoading, isAuthenticated, isAdmin } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    company: '',
    address: '',
    phone: '',
    businessPhone: '',
    preferredLanguage: 'en',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUpdatingLanguage, setIsUpdatingLanguage] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({
    smsNotifications: false,
    emailNotifications: true,
    orderUpdates: true,
    promotionalEmails: false,
    deliveryNotifications: true,
    stockAlerts: false,
  });

  // Fetch notification settings
  const { data: userNotificationSettings } = useQuery({
    queryKey: ['/api/customer/notification-preferences'],
    enabled: !!user?.id,
  });

  // Initialize notification settings when data is loaded
  useEffect(() => {
    if (userNotificationSettings) {
      setNotificationSettings({
        smsNotifications: userNotificationSettings.smsNotifications ?? false,
        emailNotifications: userNotificationSettings.emailNotifications ?? true,
        orderUpdates: userNotificationSettings.orderUpdates ?? true,
        promotionalEmails: userNotificationSettings.promotionalEmails ?? false,
        deliveryNotifications: userNotificationSettings.deliveryNotifications ?? true,
        stockAlerts: userNotificationSettings.stockAlerts ?? false,
      });
    }
  }, [userNotificationSettings]);
  
  // Initialize form data when user data is loaded
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        company: user.company || '',
        address: user.address || '',
        phone: user.phone || '',
        businessPhone: user.businessPhone || '',
        preferredLanguage: user.preferredLanguage || 'en',
      });
    }
  }, [user]);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // Format phone number input
    if (name === 'phone') {
      const formatted = formatPhoneNumber(value);
      setFormData(prev => ({ ...prev, [name]: formatted }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Format phone number to E.164 format for US numbers
  const formatPhoneNumber = (value: string): string => {
    // Remove all non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // If it's 10 digits, assume it's a US number
    if (digits.length === 10) {
      return `+1${digits}`;
    }
    
    // If it's 11 digits and starts with 1, it's already a US number
    if (digits.length === 11 && digits.startsWith('1')) {
      return `+${digits}`;
    }
    
    // If it already starts with +, keep it as is
    if (value.startsWith('+')) {
      return value;
    }
    
    // Otherwise, return as is (for international numbers)
    return value;
  };
  
  const handleSave = async () => {
    if (!user?.id) return;
    
    setIsSaving(true);
    try {
      // Filter out any empty values to avoid JSON parsing issues
      const cleanedFormData = Object.fromEntries(
        Object.entries(formData).filter(([key, value]) => value !== undefined)
      );
      
      // Make sure all values are properly strings and match admin/users schema
      const sanitizedData = {
        id: user.id, // Make sure we include the ID
        firstName: cleanedFormData.firstName || '',
        lastName: cleanedFormData.lastName || '',
        email: cleanedFormData.email || '',
        phone: cleanedFormData.phone || '',
        businessPhone: cleanedFormData.businessPhone || '',
        address: cleanedFormData.address || '',
        company: cleanedFormData.company || '',
        preferredLanguage: cleanedFormData.preferredLanguage || 'en'
      };
      
      // Use a more robust token retrieval method that works for all user types
      const token = sessionStorage.getItem('authToken') || 
                   localStorage.getItem('authToken') ||
                   sessionStorage.getItem('gokul_auth_token') ||
                   localStorage.getItem('gokul_auth_token') ||
                   JSON.parse(sessionStorage.getItem('gokul_auth_data') || '{}')?.token ||
                   JSON.parse(localStorage.getItem('gokul_auth_data') || '{}')?.token;
      
      console.log('Updating user profile with token:', token ? 'Token found' : 'No token found');
      console.log('Profile update data:', sanitizedData);
      console.log('User is admin:', isAdmin);
      
      console.log('User update data being sent:', sanitizedData);
      console.log('User update error details:', JSON.stringify(sanitizedData, null, 2));
      console.log('Making PUT request to:', `/api/customer/notification-preferences`);
      console.log('Authentication token being used:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');
      
      // Use the same API endpoint as admin/users for consistency
      let response;
      try {
        response = await apiRequest('PATCH', `/api/users/${user.id}`, sanitizedData);
        console.log('Profile update successful:', response);
      } catch (apiError) {
        console.error('apiRequest failed:', apiError);
        throw new Error(`Failed to update profile: ${(apiError as any)?.message || apiError}`);
      }
      
      // Extract the updated user from the response
      const updatedUser = response.user || response;
      
      // Invalidate all relevant queries to reload the data
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      await queryClient.refetchQueries({ queryKey: ['/api/auth/user'] });
      
      // Update form data with the latest values
      if (updatedUser) {
        setFormData({
          firstName: updatedUser.firstName || formData.firstName,
          lastName: updatedUser.lastName || formData.lastName,
          email: updatedUser.email || formData.email,
          company: updatedUser.company || formData.company,
          address: updatedUser.address || formData.address,
          phone: updatedUser.phone || formData.phone,
          businessPhone: updatedUser.businessPhone || formData.businessPhone,
          preferredLanguage: updatedUser.preferredLanguage || formData.preferredLanguage,
        });
      }
      
      toast({
        title: "Account updated",
        description: "Your account information has been updated successfully.",
        variant: "default",
      });
      setIsEditing(false);
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast({
        title: "Update failed",
        description: error.message || "There was a problem updating your account information.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotificationToggle = async (setting: string, value: boolean) => {
    // Special handling for SMS notifications - show consent dialog
    if (setting === 'smsNotifications' && value && !formData.phone) {
      toast({
        title: "Phone number required",
        description: "Please add your phone number before enabling SMS notifications.",
        variant: "destructive",
      });
      return;
    }

    // Show SMS consent confirmation when enabling SMS notifications
    if (setting === 'smsNotifications' && value) {
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
    }

    const updatedSettings = { ...notificationSettings, [setting]: value };
    setNotificationSettings(updatedSettings);

    try {
      // Use the same working user update approach as language preferences
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      await apiRequest('PUT', `/api/customer/notification-preferences`, { [setting]: value });

      const consentMessage = setting === 'smsNotifications' && value 
        ? "SMS notifications enabled. You have consented to receive text messages. Message and data rates may apply."
        : "Your notification preferences have been saved.";

      toast({
        title: "Notification settings updated",
        description: consentMessage,
        variant: "default",
      });
      
      // Invalidate queries to refresh the data
      await queryClient.invalidateQueries({ queryKey: ['/api/customer/notification-preferences'] });
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    } catch (error: any) {
      // Revert on error
      setNotificationSettings(notificationSettings);
      toast({
        title: "Update failed",
        description: "Failed to update notification settings. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleLanguageChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLanguage = e.target.value;
    const oldLanguage = formData.preferredLanguage;
    
    // Update immediately for better UX
    setFormData(prev => ({ ...prev, preferredLanguage: newLanguage }));
    setIsUpdatingLanguage(true);

    try {
      if (!user?.id) {
        throw new Error('User not authenticated');
      }

      // Save language preference immediately using the same endpoint as admin/users
      await apiRequest('PATCH', `/api/users/${user.id}`, { preferredLanguage: newLanguage });

      // Invalidate queries to refresh the data
      await queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      await queryClient.refetchQueries({ queryKey: ['/api/auth/user'] });

      toast({
        title: "Language preference updated",
        description: `Your preferred language has been set to ${getLanguageName(newLanguage)}.`,
        variant: "default",
      });
    } catch (error: any) {
      // Revert on error
      setFormData(prev => ({ ...prev, preferredLanguage: oldLanguage }));
      toast({
        title: "Update failed",
        description: "Failed to update language preference. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdatingLanguage(false);
    }
  };

  const getLanguageName = (code: string): string => {
    const languageMap: { [key: string]: string } = {
      'en': 'English',
      'es': 'Español (Spanish)',
      'fr': 'Français (French)',
      'de': 'Deutsch (German)',
      'it': 'Italiano (Italian)',
      'pt': 'Português (Portuguese)',
      'ja': '日本語 (Japanese)',
      'zh': '中文 (Chinese)',
      'ko': '한국어 (Korean)',
      'ru': 'Русский (Russian)',
      'hi': 'हिंदी (Hindi)',
      'gu': 'ગુજરાતી (Gujarati)',
      'ar': 'العربية (Arabic)',
      'ur': 'اردو (Urdu)'
    };
    return languageMap[code] || 'English';
  };
  
  if (isLoading) {
    return (
      <AppLayout title="Account" description="Manage your account settings">
        <div className="max-w-2xl mx-auto">
          <div className="mb-6">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-48" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
            </CardContent>
            <CardFooter>
              <Skeleton className="h-10 w-32" />
            </CardFooter>
          </Card>
        </div>
      </AppLayout>
    );
  }
  
  if (!isAuthenticated) {
    return (
      <AppLayout title="Account" description="Manage your account settings">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="max-w-md mx-auto">
            <h1 className="text-2xl font-bold mb-2">Sign in to view your account</h1>
            <p className="text-slate-600 mb-6">
              Please sign in to manage your account settings and preferences.
            </p>
            <a href="/login">
              <Button>Sign In</Button>
            </a>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Account" description="Manage your account settings">
      <div className="max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-2">Account Settings</h1>
          <p className="text-slate-600">
            View and manage your account information
          </p>
        </div>
        
        {/* Quick Actions */}
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 mb-6">
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-lg">Delivery Addresses</h3>
                  <p className="text-sm text-gray-600">Manage your saved delivery locations</p>
                </div>
                <a href="/account/addresses" className="self-start sm:self-auto">
                  <Button variant="outline" className="w-full sm:w-auto">Manage</Button>
                </a>
              </div>
            </CardContent>
          </Card>
          
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-lg">Order History</h3>
                  <p className="text-sm text-gray-600">View your past orders and status</p>
                </div>
                <a href="/account/orders" className="self-start sm:self-auto">
                  <Button variant="outline" className="w-full sm:w-auto">View Orders</Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>
              Your personal and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center space-x-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user?.profileImageUrl} alt={user?.firstName || 'User'} />
                <AvatarFallback className="text-lg">
                  {user?.firstName ? user?.firstName[0] : user?.email ? user.email[0].toUpperCase() : 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-medium">
                  {user?.firstName} {user?.lastName || ''}
                </h3>
                <p className="text-sm text-slate-500">
                  {user?.email}
                </p>
              </div>
            </div>
            
            {/* Personal Information Section - Editable */}
            <div className="grid gap-6">
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div>
                  <Label htmlFor="firstName" className="text-sm font-medium text-slate-700">
                    First Name
                  </Label>
                  {isEditing ? (
                    <Input 
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      placeholder="First Name"
                      className="mt-1"
                    />
                  ) : (
                    <div className="p-3 bg-slate-50 rounded-md mt-1">
                      {user?.firstName || 'Not provided'}
                    </div>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="lastName" className="text-sm font-medium text-slate-700">
                    Last Name
                  </Label>
                  {isEditing ? (
                    <Input 
                      id="lastName"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      placeholder="Last Name"
                      className="mt-1"
                    />
                  ) : (
                    <div className="p-3 bg-slate-50 rounded-md mt-1">
                      {user?.lastName || 'Not provided'}
                    </div>
                  )}
                </div>
              </div>
              
              <div>
                <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                  Email Address
                </Label>
                {isEditing ? (
                  <Input 
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="Email Address"
                    className="mt-1"
                  />
                ) : (
                  <div className="p-3 bg-slate-50 rounded-md mt-1">
                    {user?.email || 'No email provided'}
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="company" className="text-sm font-medium text-slate-700">
                  Company
                </Label>
                {isEditing ? (
                  <Input 
                    id="company"
                    name="company"
                    value={formData.company}
                    onChange={handleInputChange}
                    placeholder="Company Name"
                    className="mt-1"
                  />
                ) : (
                  <div className="p-3 bg-slate-50 rounded-md mt-1">
                    {user?.company || 'No company information'}
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="address" className="text-sm font-medium text-slate-700">
                  Address
                </Label>
                {isEditing ? (
                  <Input 
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Address"
                    className="mt-1"
                  />
                ) : (
                  <div className="p-3 bg-slate-50 rounded-md mt-1">
                    {user?.address || 'No address provided'}
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="phone" className="text-sm font-medium text-slate-700">
                  Primary Phone (SMS Notifications)
                </Label>
                {isEditing ? (
                  <div className="space-y-1">
                    <Input 
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      placeholder="e.g., 6305409910 or +16305409910"
                      className="mt-1"
                    />
                    <p className="text-xs text-slate-500">
                      Primary contact number used for SMS notifications
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-md mt-1">
                    {user?.phone || 'No phone number provided'}
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="businessPhone" className="text-sm font-medium text-slate-700">
                  Business Phone (Optional)
                </Label>
                {isEditing ? (
                  <div className="space-y-1">
                    <Input 
                      id="businessPhone"
                      name="businessPhone"
                      value={formData.businessPhone}
                      onChange={handleInputChange}
                      placeholder="Business phone number"
                      className="mt-1"
                    />
                    <p className="text-xs text-slate-500">
                      Optional business contact number
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 rounded-md mt-1">
                    {user?.businessPhone || 'No business phone provided'}
                  </div>
                )}
              </div>
            </div>
            
            {/* Business Information Section - Locked Fields */}
            <div className="pt-4 border-t border-gray-200">
              <h3 className="font-medium text-lg mb-3">Business Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    FEIN Number (Tax ID)
                  </label>
                  <div className="p-3 bg-slate-50 rounded-md">
                    {user?.feinNumber || 'No FEIN number provided'}
                    {!user?.feinNumber && (
                      <p className="text-xs text-gray-500 mt-1">
                        Contact customer service to update this information
                      </p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    State Tax ID
                  </label>
                  <div className="p-3 bg-slate-50 rounded-md">
                    {user?.stateTaxId || 'No state tax ID provided'}
                    {!user?.stateTaxId && (
                      <p className="text-xs text-gray-500 mt-1">
                        Contact customer service to update this information
                      </p>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Tobacco License Number
                  </label>
                  <div className="p-3 bg-slate-50 rounded-md">
                    {user?.tobaccoLicense || 'No tobacco license provided'}
                    {!user?.tobaccoLicense && (
                      <p className="text-xs text-gray-500 mt-1">
                        Contact customer service to update this information
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Notification Settings Section */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="h-5 w-5 text-blue-600" />
                <h3 className="font-medium text-lg">Communication Preferences</h3>
              </div>
              
              {/* Initial Notification Opt-in Status */}
              <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-3">
                  {(user as any)?.initialNotificationOptinCompleted ? (
                    <>
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-green-900">Notification Setup Complete</h4>
                        <p className="text-sm text-green-700 mt-1">
                          You completed your initial notification preferences on {
                            (user as any)?.initialNotificationOptinDate 
                              ? new Date((user as any).initialNotificationOptinDate).toLocaleDateString()
                              : 'your first login'
                          }.
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {(user as any)?.smsNotifications && (
                            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">SMS Enabled</span>
                          )}
                          {(user as any)?.emailNotifications && (
                            <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full font-medium">Email Enabled</span>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-yellow-900">Initial Notification Setup Pending</h4>
                        <p className="text-sm text-yellow-700 mt-1">
                          The notification opt-in process will appear on your next login. This ensures you receive important updates about your orders and account.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="flex flex-col gap-3 p-3 rounded-lg border border-gray-100">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <MessageSquare className="h-4 w-4 text-gray-500 mt-1" />
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700">
                          SMS Notifications
                        </label>
                        <p className="text-xs text-gray-500 mt-1">
                          Receive text messages on your phone
                        </p>
                        {!formData.phone && (
                          <p className="text-xs text-red-500 mt-1">
                            Phone number required for SMS notifications
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-center sm:justify-end">
                      <Switch
                        checked={notificationSettings.smsNotifications}
                        onCheckedChange={(value) => handleNotificationToggle('smsNotifications', value)}
                        disabled={!formData.phone}
                      />
                    </div>
                  </div>

                  {/* SMS Consent Details - Always visible, grayed out when disabled */}
                  <div className={`ml-6 space-y-3 border-l-2 pl-4 transition-opacity ${notificationSettings.smsNotifications && formData.phone ? 'border-blue-200 opacity-100' : 'border-gray-200 opacity-60'}`}>
                    <div className="space-y-2">
                      <div className="flex items-start space-x-3">
                        <div className={`w-4 h-4 mt-0.5 border rounded ${notificationSettings.smsNotifications && formData.phone ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                          {notificationSettings.smsNotifications && formData.phone && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <label className={`text-sm font-medium ${!notificationSettings.smsNotifications || !formData.phone ? 'text-gray-400' : 'text-slate-700'}`}>
                            Order & Account Updates
                          </label>
                          <p className={`text-xs mt-1 ${!notificationSettings.smsNotifications || !formData.phone ? 'text-gray-400' : 'text-gray-500'}`}>
                            Receive important transactional messages about your orders, deliveries, and account status. Reply STOP to opt out.
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start space-x-3">
                        <div className={`w-4 h-4 mt-0.5 border rounded ${notificationSettings.smsNotifications && formData.phone ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                          {notificationSettings.smsNotifications && formData.phone && (
                            <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1">
                          <label className={`text-sm font-medium ${!notificationSettings.smsNotifications || !formData.phone ? 'text-gray-400' : 'text-slate-700'}`}>
                            Promotions & Special Offers
                          </label>
                          <p className={`text-xs mt-1 ${!notificationSettings.smsNotifications || !formData.phone ? 'text-gray-400' : 'text-gray-500'}`}>
                            Marketing messages with deals, discounts, and promotional offers from Gokul Wholesale, Inc. Up to 2 messages per month. Reply STOP to unsubscribe.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className={`text-xs mt-3 p-2 rounded transition-colors ${notificationSettings.smsNotifications && formData.phone ? 'text-blue-700 bg-blue-100' : 'text-gray-500 bg-gray-100'}`}>
                      <p className="font-medium mb-1">SMS Terms:</p>
                      <ul className="space-y-1">
                        <li>• <strong>Reply STOP to unsubscribe</strong></li>
                        <li>• Message frequency: Up to 4 messages per month</li>
                        <li>• Message and data rates may apply</li>
                        <li>• Reply HELP for assistance</li>
                      </ul>
                      <p className="mt-2 font-medium">
                        By opting in, you consent to receive informational/marketing/customer care text messages from Gokul Wholesale, Inc.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border border-gray-100">
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-gray-500 mt-1" />
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-700">
                        Email Notifications
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Receive notifications via email
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-center sm:justify-end">
                    <Switch
                      checked={notificationSettings.emailNotifications}
                      onCheckedChange={(value) => handleNotificationToggle('emailNotifications', value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border border-gray-100">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-4 w-4 text-gray-500 mt-1" />
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-700">
                        Order Updates
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Get notified when order status changes
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-center sm:justify-end">
                    <Switch
                      checked={notificationSettings.orderUpdates}
                      onCheckedChange={(value) => handleNotificationToggle('orderUpdates', value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border border-gray-100">
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-gray-500 mt-1" />
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-700">
                        Promotional Emails
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Receive promotional offers and deals
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-center sm:justify-end">
                    <Switch
                      checked={notificationSettings.promotionalEmails}
                      onCheckedChange={(value) => handleNotificationToggle('promotionalEmails', value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border border-gray-100">
                  <div className="flex items-start gap-3">
                    <MessageSquare className="h-4 w-4 text-gray-500 mt-1" />
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-700">
                        Delivery Notifications
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Get notified about delivery updates via SMS/email
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-center sm:justify-end">
                    <Switch
                      checked={notificationSettings.deliveryNotifications}
                      onCheckedChange={(value) => handleNotificationToggle('deliveryNotifications', value)}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-lg border border-gray-100">
                  <div className="flex items-start gap-3">
                    <Mail className="h-4 w-4 text-gray-500 mt-1" />
                    <div className="flex-1">
                      <label className="block text-sm font-medium text-slate-700">
                        Stock Alerts
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        Get notified when products are back in stock via email
                      </p>
                    </div>
                  </div>
                  <div className="flex justify-center sm:justify-end">
                    <Switch
                      checked={notificationSettings.stockAlerts}
                      onCheckedChange={(value) => handleNotificationToggle('stockAlerts', value)}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Language Preference Section */}
            <div className="pt-4 border-t border-gray-200">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="h-5 w-5 text-green-600" />
                <h3 className="font-medium text-lg">Language Preference</h3>
              </div>
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <label className="block text-sm font-medium text-slate-700 flex-shrink-0">
                    Preferred Language for Notifications
                  </label>
                  <div className="relative w-full sm:w-auto">
                    <select 
                      className={`border rounded-md px-3 py-2 text-sm w-full sm:min-w-[200px] ${
                        isUpdatingLanguage ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                      value={formData.preferredLanguage || 'en'}
                      onChange={handleLanguageChange}
                      disabled={isUpdatingLanguage}
                    >
                    <option value="en">🇺🇸 English</option>
                    <option value="es">🇪🇸 Español (Spanish)</option>
                    <option value="fr">🇫🇷 Français (French)</option>
                    <option value="de">🇩🇪 Deutsch (German)</option>
                    <option value="it">🇮🇹 Italiano (Italian)</option>
                    <option value="pt">🇧🇷 Português (Portuguese)</option>
                    <option value="ja">🇯🇵 日本語 (Japanese)</option>
                    <option value="zh">🇨🇳 中文 (Chinese)</option>
                    <option value="ko">🇰🇷 한국어 (Korean)</option>
                    <option value="hi">🇮🇳 हिंदी (Hindi)</option>
                    <option value="gu">🇮🇳 ગુજરાતી (Gujarati)</option>
                    <option value="ar">🇸🇦 العربية (Arabic)</option>
                    <option value="ur">🇵🇰 اردو (Urdu)</option>
                      <option value="ru">🇷🇺 Русский (Russian)</option>
                    </select>
                    {isUpdatingLanguage && (
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-xs text-gray-500">
                  All SMS messages and emails will be sent in your preferred language.
                  {isUpdatingLanguage && (
                    <span className="text-green-600 ml-1">Updating...</span>
                  )}
                </p>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col sm:flex-row gap-3 sm:justify-between">
            {isEditing ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSave}
                  disabled={isSaving}
                  className="w-full sm:w-auto"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Button>
              </>
            ) : (
              <>
                <a href="/api/logout" className="w-full sm:w-auto">
                  <Button variant="outline" className="w-full sm:w-auto">Sign Out</Button>
                </a>
                <Button onClick={() => setIsEditing(true)} className="w-full sm:w-auto">
                  Edit Profile
                </Button>
              </>
            )}
          </CardFooter>
        </Card>
      </div>
    </AppLayout>
  );
}
