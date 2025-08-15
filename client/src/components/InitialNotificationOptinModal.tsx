import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, MessageSquare, Mail, Shield, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface InitialNotificationOptinModalProps {
  isOpen: boolean;
  onComplete: () => void;
  userName?: string;
}

export function InitialNotificationOptinModal({
  isOpen,
  onComplete,
  userName = 'Valued Customer'
}: InitialNotificationOptinModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [currentStep, setCurrentStep] = useState<'intro' | 'preferences' | 'sms-consent' | 'success'>('intro');
  const { toast } = useToast();

  const handleNext = () => {
    if (currentStep === 'intro') {
      setCurrentStep('preferences');
    } else if (currentStep === 'preferences') {
      if (smsNotifications) {
        setCurrentStep('sms-consent');
      } else {
        handleSubmit();
      }
    } else if (currentStep === 'sms-consent') {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      // Submit notification preferences with proper consent tracking
      await apiRequest('POST', '/api/initial-notification-optin', {
        emailNotifications,
        smsNotifications,
        marketingConsent,
        smsConsentGiven: smsNotifications,
        marketingSmsConsent: marketingConsent && smsNotifications,
        transactionalSmsConsent: smsNotifications, // Always enable transactional if SMS is enabled
        consentMethod: 'first_login_modal',
        confirmationText: smsNotifications ? 'I agree to receive SMS notifications from Gokul Wholesale including order updates and promotional messages. Standard message and data rates may apply. Text STOP to opt out.' : null
      });

      setCurrentStep('success');
      
      // Auto-close after success
      setTimeout(() => {
        onComplete();
      }, 2000);

    } catch (error) {
      console.error('Error saving notification preferences:', error);
      toast({
        title: "Error",
        description: "Failed to save notification preferences. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderIntroStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
          <Bell className="w-8 h-8 text-blue-600" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Welcome, {userName}!</h2>
          <p className="text-gray-600 mt-2">
            Let's set up your notification preferences so you never miss important updates about your orders and account.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-2">
          <CardHeader className="text-center pb-2">
            <Mail className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <CardTitle className="text-lg">Email Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-center">
              Order confirmations, shipping updates, and important account information
            </CardDescription>
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardHeader className="text-center pb-2">
            <MessageSquare className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <CardTitle className="text-lg">SMS Notifications</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription className="text-center">
              Real-time order updates and time-sensitive notifications sent directly to your phone
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      <Button onClick={handleNext} className="w-full">
        Continue to Preferences
      </Button>
    </div>
  );

  const renderPreferencesStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-semibold text-gray-900">Choose Your Notification Preferences</h2>
        <p className="text-gray-600">
          You can always change these settings later in your account preferences.
        </p>
      </div>

      <div className="space-y-4">
        <Card className={`border-2 ${emailNotifications ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
          <CardContent className="pt-6">
            <div className="flex items-start space-x-4">
              <Checkbox 
                id="email-notifications"
                checked={emailNotifications}
                onCheckedChange={(checked) => setEmailNotifications(checked as boolean)}
              />
              <div className="flex-1">
                <Label htmlFor="email-notifications" className="text-base font-medium cursor-pointer">
                  Email Notifications
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Receive order confirmations, shipping notifications, and important account updates via email.
                </p>
              </div>
              <Mail className="w-5 h-5 text-green-600 mt-0.5" />
            </div>
          </CardContent>
        </Card>

        <Card className={`border-2 ${smsNotifications ? 'border-blue-200 bg-blue-50' : 'border-gray-200'}`}>
          <CardContent className="pt-6">
            <div className="flex items-start space-x-4">
              <Checkbox 
                id="sms-notifications"
                checked={smsNotifications}
                onCheckedChange={(checked) => setSmsNotifications(checked as boolean)}
              />
              <div className="flex-1">
                <Label htmlFor="sms-notifications" className="text-base font-medium cursor-pointer">
                  SMS Notifications (Optional)
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Get real-time text message updates for urgent order information and delivery notifications.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Standard message and data rates may apply. Text STOP to opt out anytime.
                </p>
              </div>
              <MessageSquare className="w-5 h-5 text-blue-600 mt-0.5" />
            </div>
          </CardContent>
        </Card>

        <Card className={`border-2 ${marketingConsent ? 'border-purple-200 bg-purple-50' : 'border-gray-200'}`}>
          <CardContent className="pt-6">
            <div className="flex items-start space-x-4">
              <Checkbox 
                id="marketing-consent"
                checked={marketingConsent}
                onCheckedChange={(checked) => setMarketingConsent(checked as boolean)}
              />
              <div className="flex-1">
                <Label htmlFor="marketing-consent" className="text-base font-medium cursor-pointer">
                  Promotional Emails (Optional)
                </Label>
                <p className="text-sm text-gray-600 mt-1">
                  Receive special offers, new product announcements, and exclusive deals via email.
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  You can unsubscribe anytime with one click.
                </p>
              </div>
              <Bell className="w-5 h-5 text-purple-600 mt-0.5" />
            </div>
          </CardContent>
        </Card>

        {smsNotifications && (
          <Card className={`border-2 ${marketingConsent && smsNotifications ? 'border-orange-200 bg-orange-50' : 'border-gray-200'}`}>
            <CardContent className="pt-6">
              <div className="flex items-start space-x-4">
                <Checkbox 
                  id="marketing-sms-consent"
                  checked={marketingConsent && smsNotifications}
                  onCheckedChange={(checked) => {
                    if (checked && smsNotifications) {
                      setMarketingConsent(true);
                    }
                  }}
                  disabled={!smsNotifications}
                />
                <div className="flex-1">
                  <Label htmlFor="marketing-sms-consent" className="text-base font-medium cursor-pointer">
                    Marketing SMS (Optional)
                  </Label>
                  <p className="text-sm text-gray-600 mt-1">
                    Also receive promotional offers and deals via SMS when available.
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Only available if SMS notifications are enabled above.
                  </p>
                </div>
                <MessageSquare className="w-5 h-5 text-orange-600 mt-0.5" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <Button 
        onClick={handleNext} 
        className="w-full"
        disabled={isSubmitting}
      >
        {smsNotifications ? 'Continue to SMS Consent' : 'Save Preferences'}
      </Button>
    </div>
  );

  const renderSmsConsentStep = () => (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <Shield className="w-12 h-12 text-blue-600 mx-auto" />
        <h2 className="text-xl font-semibold text-gray-900">SMS Consent Confirmation</h2>
        <p className="text-gray-600">
          Please review and confirm your SMS notification preferences.
        </p>
      </div>

      <Card className="border-2 border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="text-sm">
              <p className="font-medium text-gray-900 mb-2">By clicking "Confirm", you agree to:</p>
              <ul className="space-y-1 text-gray-700">
                <li>• Receive SMS notifications from Gokul Wholesale</li>
                <li>• Receive order updates and delivery notifications via text</li>
                {marketingConsent && smsNotifications && <li>• Receive promotional offers and marketing messages via text</li>}
                {marketingConsent && <li>• Receive promotional emails and special offers</li>}
                <li>• Standard message and data rates may apply (SMS only)</li>
                <li>• You can text STOP to opt out of SMS or unsubscribe from emails anytime</li>
                <li>• You can text HELP for support</li>
              </ul>
            </div>
            
            <div className="text-xs text-gray-600 bg-white p-3 rounded border">
              <p className="font-medium mb-1">Legal Notice:</p>
              <p>
                This consent is compliant with TCPA regulations. Your phone number will only be used 
                for the purposes you've agreed to. We will never share your number with third parties 
                for marketing purposes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex space-x-3">
        <Button 
          variant="outline" 
          onClick={() => setSmsNotifications(false)}
          className="flex-1"
        >
          Skip SMS
        </Button>
        <Button 
          onClick={handleNext} 
          className="flex-1"
          disabled={isSubmitting}
        >
          Confirm SMS Consent
        </Button>
      </div>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="text-center space-y-6">
      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-8 h-8 text-green-600" />
      </div>
      
      <div>
        <h2 className="text-xl font-semibold text-gray-900">All Set!</h2>
        <p className="text-gray-600 mt-2">
          Your notification preferences have been saved successfully.
        </p>
      </div>

      <div className="text-sm text-gray-600 space-y-1">
        <p>✅ Email notifications: {emailNotifications ? 'Enabled' : 'Disabled'}</p>
        <p>✅ SMS notifications: {smsNotifications ? 'Enabled' : 'Disabled'}</p>
        {smsNotifications && (
          <p>✅ Marketing SMS: {marketingConsent ? 'Enabled' : 'Disabled'}</p>
        )}
      </div>

      <p className="text-xs text-gray-500">
        You can change these settings anytime in your Account Settings.
      </p>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'intro':
        return renderIntroStep();
      case 'preferences':
        return renderPreferencesStep();
      case 'sms-consent':
        return renderSmsConsentStep();
      case 'success':
        return renderSuccessStep();
      default:
        return renderIntroStep();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}} modal>
      <DialogContent className="sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="sr-only">Initial Notification Setup</DialogTitle>
          <DialogDescription className="sr-only">
            Set up your notification preferences for the first time
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-2">
          {renderCurrentStep()}
        </div>
      </DialogContent>
    </Dialog>
  );
}