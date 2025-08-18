import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: (accepted: boolean) => void;
  userName?: string;
}

export function PrivacyPolicyModal({ isOpen, onClose, userName }: PrivacyPolicyModalProps) {
  const [isAccepted, setIsAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleAccept = async () => {
    if (!isAccepted) {
      toast({
        title: "Agreement Required",
        description: "Please accept the privacy policy to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Use the existing API endpoint format
      await apiRequest('POST', '/api/privacy-policy/accept', {
        agreed: true,
        version: '2.0'
      });

      toast({
        title: "Privacy Policy Accepted",
        description: "Thank you for accepting our privacy policy.",
      });
      
      onClose(true);
    } catch (error: any) {
      console.error('Privacy policy acceptance error:', error);
      toast({
        title: "Error",
        description: "Failed to record privacy policy acceptance. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => !isSubmitting && onClose(false)}>
      <DialogContent className="max-w-4xl w-[95vw] h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-blue-600" />
            <div>
              <DialogTitle className="text-xl font-semibold">Privacy Policy Agreement</DialogTitle>
              <p className="text-sm text-gray-600 mt-1">
                {userName ? `Welcome ${userName}! ` : ''}Please review and accept our privacy policy to continue.
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full px-6 py-4">
            <div className="space-y-6 text-sm leading-relaxed">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-blue-900 mb-2">Important Notice</h3>
                    <p className="text-blue-800">
                      This privacy policy is required for account activation. Your acceptance will be recorded 
                      with your IP address and timestamp for compliance purposes.
                    </p>
                  </div>
                </div>
              </div>

              <section>
                <h2 className="text-lg font-semibold mb-3 text-gray-900">Gokul Wholesale Privacy Policy</h2>
                <p className="text-gray-700 mb-4">
                  <strong>Effective Date:</strong> August 18, 2025<br />
                  <strong>Version:</strong> 2.0
                </p>
              </section>

              <section>
                <h3 className="text-base font-semibold mb-2 text-gray-900">1. Information We Collect</h3>
                <p className="text-gray-700 mb-3">
                  We collect information you provide when creating an account, placing orders, and using our services:
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>Business information (company name, tax ID, business type)</li>
                  <li>Contact details (name, email, phone, business address)</li>
                  <li>Account credentials and preferences</li>
                  <li>Order history and purchasing patterns</li>
                  <li>Payment and billing information</li>
                  <li>Communication preferences and consent records</li>
                </ul>
              </section>

              <section>
                <h3 className="text-base font-semibold mb-2 text-gray-900">2. How We Use Your Information</h3>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>Process and fulfill your orders</li>
                  <li>Provide customer support and account management</li>
                  <li>Send order confirmations and status updates</li>
                  <li>Communicate important account and service information</li>
                  <li>Improve our products and services</li>
                  <li>Comply with legal and regulatory requirements</li>
                </ul>
              </section>

              <section>
                <h3 className="text-base font-semibold mb-2 text-gray-900">3. SMS and Email Communications</h3>
                <p className="text-gray-700 mb-3">
                  With your consent, we may send you:
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li><strong>Transactional SMS:</strong> Order confirmations, shipping updates, account alerts</li>
                  <li><strong>Marketing SMS:</strong> Promotional offers, product announcements (optional)</li>
                  <li><strong>Email notifications:</strong> Account updates, newsletters, promotional content</li>
                </ul>
                <p className="text-gray-700 mt-3">
                  You can opt out of marketing communications at any time by replying STOP to SMS or using unsubscribe links in emails.
                </p>
              </section>

              <section>
                <h3 className="text-base font-semibold mb-2 text-gray-900">4. Information Sharing and Disclosure</h3>
                <p className="text-gray-700 mb-3">
                  We do not sell or rent your personal information. We may share information only:
                </p>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>With service providers who help us operate our business</li>
                  <li>When required by law or to protect our rights</li>
                  <li>In connection with a business sale or merger</li>
                  <li>With your explicit consent</li>
                </ul>
              </section>

              <section>
                <h3 className="text-base font-semibold mb-2 text-gray-900">5. Data Security</h3>
                <p className="text-gray-700">
                  We implement appropriate technical and organizational measures to protect your personal information 
                  against unauthorized access, alteration, disclosure, or destruction.
                </p>
              </section>

              <section>
                <h3 className="text-base font-semibold mb-2 text-gray-900">6. Your Rights</h3>
                <p className="text-gray-700 mb-3">You have the right to:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-700 ml-4">
                  <li>Access and update your personal information</li>
                  <li>Request deletion of your data (subject to legal requirements)</li>
                  <li>Opt out of marketing communications</li>
                  <li>Contact us with privacy concerns</li>
                </ul>
              </section>

              <section>
                <h3 className="text-base font-semibold mb-2 text-gray-900">7. Contact Information</h3>
                <p className="text-gray-700">
                  For privacy-related questions or concerns, please contact us at:<br />
                  <strong>Email:</strong> privacy@gokulwholesale.com<br />
                  <strong>Phone:</strong> (your business phone)<br />
                  <strong>Address:</strong> (your business address)
                </p>
              </section>

              <section>
                <h3 className="text-base font-semibold mb-2 text-gray-900">8. Changes to This Policy</h3>
                <p className="text-gray-700">
                  We may update this privacy policy from time to time. We will notify you of significant changes 
                  by email or through our platform.
                </p>
              </section>
            </div>
          </ScrollArea>
        </div>

        <div className="border-t bg-gray-50 px-6 py-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-start gap-3">
              <Checkbox 
                id="privacy-accept"
                checked={isAccepted}
                onCheckedChange={(checked) => setIsAccepted(checked as boolean)}
                className="mt-1"
              />
              <label 
                htmlFor="privacy-accept" 
                className="text-sm text-gray-700 leading-relaxed cursor-pointer"
              >
                I have read and agree to the Gokul Wholesale Privacy Policy. I understand that my acceptance 
                will be recorded with my IP address and timestamp for compliance purposes.
              </label>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3 sm:justify-end">
              <Button
                variant="outline"
                onClick={() => onClose(false)}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
              >
                I'll Review Later
              </Button>
              <Button
                onClick={handleAccept}
                disabled={!isAccepted || isSubmitting}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Recording...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Accept and Continue
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}