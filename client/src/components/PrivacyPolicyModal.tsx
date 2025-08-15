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
// ScrollArea not needed - using native scrolling
import { Shield, AlertTriangle } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccepted: () => void;
}

export default function PrivacyPolicyModal({ isOpen, onClose, onAccepted }: PrivacyPolicyModalProps) {
  const [agreed, setAgreed] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [timeoutEnabled, setTimeoutEnabled] = useState(false);

  // Enable checkbox after 30 seconds as fallback for mobile scroll issues
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setTimeoutEnabled(true);
        setScrolledToBottom(true);
      }, 15000); // 15 seconds
      
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const acceptPrivacyPolicyMutation = useMutation({
    mutationFn: () => apiRequest('/api/privacy-policy/accept', {
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
    // More lenient scroll detection - consider "scrolled to bottom" when within 50px
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 50;
    setScrolledToBottom(isAtBottom);
    
    // Also enable after significant scroll (75% of content viewed)
    const scrollPercentage = (scrollTop + clientHeight) / scrollHeight;
    if (scrollPercentage >= 0.75) {
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
        className="max-w-2xl h-[85vh] sm:max-h-[90vh] flex flex-col overflow-hidden m-2 sm:m-8" 
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="flex-shrink-0 pb-2">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-4 w-4 text-blue-600" />
            Privacy Policy Update
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-600">
            Review and accept our updated privacy policy to continue
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 p-2 bg-amber-50 border border-amber-200 rounded-md flex-shrink-0">
          <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />
          <p className="text-xs text-amber-800 font-medium">
            Enhanced privacy protections - please review and accept
          </p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 border rounded-md bg-gray-50" onScroll={handleScroll}>
          <div className="space-y-4 text-sm">
            <section>
              <h3 className="font-semibold text-gray-900 mb-2">What's New in Version 2.0</h3>
              <ul className="list-disc list-inside space-y-2 text-gray-700">
                <li><strong>One-Click Email Unsubscribe:</strong> You can now easily unsubscribe from marketing emails without logging in</li>
                <li><strong>Enhanced Data Control:</strong> Better control over your notification preferences</li>
                <li><strong>Improved Privacy Protections:</strong> Strengthened data security measures</li>
                <li><strong>TCPA Compliance:</strong> Enhanced SMS consent tracking and management</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 mb-2">Key Privacy Points</h3>
              <div className="space-y-3 text-gray-700">
                <p>
                  <strong>Your Email Communications:</strong> We respect your communication preferences. 
                  You can unsubscribe from promotional emails at any time using the unsubscribe link 
                  in any email or by visiting our unsubscribe page directly.
                </p>
                
                <p>
                  <strong>Essential Communications:</strong> We will continue to send you important 
                  order confirmations, account updates, and service notifications as these are 
                  essential for your wholesale account management.
                </p>

                <p>
                  <strong>Data Security:</strong> Your personal and business information is encrypted 
                  and stored securely. We never sell or share your data with unauthorized third parties.
                </p>

                <p>
                  <strong>SMS Communications:</strong> If you've opted in to receive SMS notifications, 
                  you can opt out at any time by texting STOP to our SMS number.
                </p>

                <p>
                  <strong>Activity Tracking:</strong> We log account activities (including IP addresses) 
                  for security and compliance purposes. This helps us protect your account and 
                  maintain audit trails.
                </p>

                <p>
                  <strong>Contact Us:</strong> If you have any questions about our privacy practices 
                  or want to exercise your privacy rights, please contact our support team.
                </p>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-gray-900 mb-2">Your Rights</h3>
              <p className="text-gray-700">
                You have the right to access, update, or delete your personal information. 
                You can manage your account settings, notification preferences, and privacy 
                choices through your account dashboard or by contacting us directly.
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

        <div className="space-y-2 flex-shrink-0">
          {!scrolledToBottom && (
            <div className="bg-amber-50 border border-amber-200 rounded-md p-2">
              <p className="text-xs text-amber-800 flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 flex-shrink-0" />
                Scroll above or wait 15 seconds to unlock
              </p>
            </div>
          )}

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="privacy-agreement" 
              checked={agreed}
              onCheckedChange={(checked) => setAgreed(checked === true)}
              disabled={!scrolledToBottom}
            />
            <label 
              htmlFor="privacy-agreement" 
              className={`text-sm ${!scrolledToBottom ? 'text-gray-400' : 'text-gray-900'}`}
            >
              I accept the Privacy Policy (Version 2.0)
            </label>
          </div>
        </div>

        <div className="flex-shrink-0 mt-2 pt-2 border-t">
          <Button 
            onClick={handleAccept}
            disabled={!agreed || !scrolledToBottom || acceptPrivacyPolicyMutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors text-sm"
          >
            {acceptPrivacyPolicyMutation.isPending ? 'Accepting...' : 'Accept and Continue'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}