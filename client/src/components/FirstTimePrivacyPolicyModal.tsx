import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface FirstTimePrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccepted: () => void;
  userName?: string;
}

export default function FirstTimePrivacyPolicyModal({ 
  isOpen, 
  onClose, 
  onAccepted, 
  userName 
}: FirstTimePrivacyPolicyModalProps) {
  const [agreed, setAgreed] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [timeoutEnabled, setTimeoutEnabled] = useState(false);

  // Enable checkbox after 10 seconds as fallback for mobile scroll issues
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setTimeoutEnabled(true);
        setScrolledToBottom(true);
      }, 10000); // 10 seconds for first-time login
      
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const acceptPrivacyPolicyMutation = useMutation({
    mutationFn: () => apiRequest('/api/privacy-policy/first-time-accept', {
      method: 'POST',
      body: {
        agreed: true,
        version: '2.0'
      }
    }),
    onSuccess: () => {
      onAccepted();
    },
    onError: (error) => {
      console.error('Failed to accept privacy policy:', error);
    }
  });

  const handleScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    // More lenient scroll detection - consider "scrolled to bottom" when within 30px
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 30;
    setScrolledToBottom(isAtBottom);
    
    // Also enable after significant scroll (70% of content viewed)
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
    if (scrollPercentage >= 0.7) {
      setScrolledToBottom(true);
    }
  };

  const handleAccept = () => {
    if (agreed && scrolledToBottom) {
      acceptPrivacyPolicyMutation.mutate();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}} modal={true}>
      <DialogContent 
        className="max-w-2xl h-[90vh] sm:h-[85vh] flex flex-col overflow-hidden m-2 sm:m-4" 
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="flex-shrink-0 pb-3">
          <DialogTitle className="flex items-center gap-2 text-xl sm:text-lg">
            <Shield className="h-5 w-5 text-blue-600" />
            Welcome{userName ? `, ${userName}` : ''}!
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Before you begin, please review and accept our privacy policy
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-md flex-shrink-0">
          <CheckCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <p className="text-xs text-blue-800 font-medium">
            First-time setup - this only takes a moment
          </p>
        </div>

        <div 
          className="flex-1 overflow-y-auto p-4 border rounded-md bg-gray-50 touch-pan-y" 
          onScroll={handleScroll}
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="font-semibold text-gray-900 mb-2">Privacy & Data Protection</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li><strong>Your Information is Secure:</strong> We use enterprise-grade encryption to protect your business data</li>
                <li><strong>No Data Selling:</strong> We never sell or share your information with unauthorized third parties</li>
                <li><strong>Business-Focused:</strong> We only collect information necessary for your wholesale account</li>
                <li><strong>Full Control:</strong> You control your notification preferences and data settings</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 mb-2">How We Use Your Information</h3>
              <div className="space-y-3 text-gray-700">
                <p>
                  <strong>Order Management:</strong> We use your contact information to process orders, 
                  send confirmations, and provide delivery updates.
                </p>
                
                <p>
                  <strong>Account Security:</strong> We log IP addresses and login activity to protect 
                  your account from unauthorized access and maintain security.
                </p>

                <p>
                  <strong>Business Communications:</strong> We may send you important account updates, 
                  new product notifications, and wholesale pricing information.
                </p>

                <p>
                  <strong>Optional Marketing:</strong> You can choose to receive promotional emails 
                  and SMS notifications. You can opt out at any time.
                </p>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 mb-2">Your Rights & Choices</h3>
              <div className="space-y-2 text-gray-700">
                <p>• <strong>Access:</strong> View and update your account information anytime</p>
                <p>• <strong>Communication Preferences:</strong> Control what notifications you receive</p>
                <p>• <strong>Data Deletion:</strong> Request account deletion (contact support)</p>
                <p>• <strong>SMS Opt-Out:</strong> Text STOP to any SMS to unsubscribe immediately</p>
                <p>• <strong>Email Unsubscribe:</strong> Use unsubscribe links in any email</p>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 mb-2">Contact & Support</h3>
              <p className="text-gray-700">
                Questions about privacy? Contact us at (630) 540-9910 or sales@gokulwholesaleinc.com. 
                We're here to help and respect your privacy choices.
              </p>
            </section>

            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                Last updated: {new Date().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Version 2.0 - Enhanced privacy protections and user control
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3 flex-shrink-0">
          {!scrolledToBottom && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-2">
              <p className="text-xs text-amber-800 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                <span className="sm:hidden">Scroll up or wait 10 seconds</span>
                <span className="hidden sm:inline">Please scroll through the policy above or wait 10 seconds</span>
              </p>
            </div>
          )}

          <div className="flex items-start space-x-2">
            <Checkbox 
              id="first-time-privacy-agreement" 
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked === true)}
              disabled={!scrolledToBottom}
              className="mt-0.5"
            />
            <label 
              htmlFor="first-time-privacy-agreement" 
              className={`text-sm leading-relaxed ${!scrolledToBottom ? 'text-gray-400' : 'text-gray-900'}`}
            >
              I understand and accept the Privacy Policy (Version 2.0) and agree to the collection 
              and use of my information as described above.
            </label>
          </div>
        </div>

        <div className="flex-shrink-0 mt-3 pt-3 border-t">
          <Button 
            onClick={handleAccept}
            disabled={!agreed || !scrolledToBottom || acceptPrivacyPolicyMutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-md transition-colors"
            size="lg"
          >
            {acceptPrivacyPolicyMutation.isPending ? 'Accepting...' : 'Accept & Continue to Account'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}