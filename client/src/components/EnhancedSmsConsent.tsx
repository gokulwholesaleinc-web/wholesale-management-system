import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageCircle, Shield, Clock, Tag, Phone, AlertTriangle, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface EnhancedSmsConsentProps {
  isOpen: boolean;
  onClose: () => void;
  onConsent: (data: ConsentData) => void;
  phoneNumber?: string;
}

interface ConsentData {
  transactionalSmsConsent: boolean;
  marketingSmsConsent: boolean;
  privacyPolicyAccepted: boolean;
  consentMethod: string;
  phoneNumber: string;
  ctaVerification: boolean;
}

export function EnhancedSmsConsent({ isOpen, onClose, onConsent, phoneNumber = '' }: EnhancedSmsConsentProps) {
  const [phone, setPhone] = useState(phoneNumber);
  const [transactionalConsent, setTransactionalConsent] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [privacyPolicyAccepted, setPrivacyPolicyAccepted] = useState(false);
  const [ctaVerification, setCtaVerification] = useState(false);

  const handleSubmit = () => {
    if (!phone || !privacyPolicyAccepted || !ctaVerification || (!transactionalConsent && !marketingConsent)) {
      return;
    }

    onConsent({
      transactionalSmsConsent: transactionalConsent,
      marketingSmsConsent: marketingConsent,
      privacyPolicyAccepted,
      consentMethod: 'web_form',
      phoneNumber: phone,
      ctaVerification
    });
  };

  const isValid = phone && privacyPolicyAccepted && ctaVerification && (transactionalConsent || marketingConsent);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <MessageCircle className="h-6 w-6 text-blue-600" />
            SMS Communication Consent - Gokul Wholesale
          </DialogTitle>
          <DialogDescription>
            Federal law requires explicit consent for SMS communications. Please review and consent to receive text messages.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Phone Number Input */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Mobile Phone Number
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                type="tel"
                placeholder="Enter your mobile phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="text-center text-lg"
              />
            </CardContent>
          </Card>

          {/* CTA Verification Section - Key for Twilio Approval */}
          <Card className="border-2 border-orange-200 bg-orange-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-orange-800">
                <AlertTriangle className="h-4 w-4" />
                Call to Action (CTA) Verification
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-orange-200">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  <strong>Important:</strong> By proceeding with this consent form, you are responding to our business communication invitation. 
                  This constitutes a clear Call to Action (CTA) for SMS opt-in consent as required by federal regulations and carrier policies.
                </AlertDescription>
              </Alert>
              
              <div className="bg-white p-4 rounded border">
                <h4 className="font-semibold text-orange-900 mb-2">How You Reached This Consent Form:</h4>
                <ul className="text-sm text-orange-800 space-y-1 list-disc pl-4">
                  <li>You logged into your Gokul Wholesale business account</li>
                  <li>You accessed notification settings or account preferences</li>
                  <li>You clicked on SMS notification setup options</li>
                  <li>This consent form appeared as direct response to your action</li>
                </ul>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox 
                  id="cta-verification" 
                  checked={ctaVerification}
                  onCheckedChange={setCtaVerification}
                  className="mt-1"
                />
                <label htmlFor="cta-verification" className="text-sm font-medium text-orange-800">
                  I acknowledge that I requested this SMS consent form through my direct actions on the Gokul Wholesale website, 
                  and this constitutes a verifiable Call to Action for SMS communications.
                </label>
              </div>
            </CardContent>
          </Card>

          {/* Privacy Policy Section */}
          <Card className="border-2 border-blue-200 bg-blue-50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2 text-blue-800">
                <Shield className="h-4 w-4" />
                Privacy Policy & Data Protection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-white p-4 rounded border">
                <p className="text-sm text-blue-800 mb-3">
                  <strong>Gokul Wholesale SMS Privacy Commitment:</strong>
                </p>
                <ul className="text-xs text-blue-700 space-y-2 list-disc pl-4">
                  <li>Your mobile number will <strong>never</strong> be shared with third parties for marketing purposes</li>
                  <li>All SMS communications will clearly identify Gokul Wholesale as the sender</li>
                  <li>We maintain detailed consent records including timestamp, IP address, and consent method</li>
                  <li>You retain full control over your SMS preferences at all times</li>
                  <li>Our complete privacy policy is available at: <strong>shopgokul.com/privacy-policy</strong></li>
                </ul>
              </div>

              <div className="flex items-start gap-3">
                <Checkbox 
                  id="privacy-policy" 
                  checked={privacyPolicyAccepted}
                  onCheckedChange={setPrivacyPolicyAccepted}
                  className="mt-1"
                />
                <label htmlFor="privacy-policy" className="text-sm font-medium text-blue-800">
                  I have read and accept the privacy policy terms for SMS communications, including consent tracking and data protection measures.
                </label>
              </div>
            </CardContent>
          </Card>

          {/* SMS Consent Types */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">SMS Message Types & Consent</h3>
            
            {/* Transactional SMS */}
            <Card className={`border-2 ${transactionalConsent ? 'border-green-200 bg-green-50' : 'border-gray-200'}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Clock className="h-5 w-5 text-green-600 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-green-900">Business Transaction Notifications</h4>
                      <Checkbox
                        id="transactional-sms"
                        checked={transactionalConsent}
                        onCheckedChange={setTransactionalConsent}
                      />
                    </div>
                    <p className="text-sm text-green-800 mb-3">
                      Essential business communications related to your orders, account, and transactions.
                    </p>
                    <div className="bg-white p-3 rounded border">
                      <p className="text-xs font-semibold text-green-900 mb-1">Message Examples:</p>
                      <ul className="text-xs text-green-700 space-y-1">
                        <li>• "Order #12345 confirmed ($247.50) - Expected delivery Mon 2/12"</li>
                        <li>• "Your order #12345 is ready for pickup at Gokul Wholesale"</li>
                        <li>• "Payment reminder: Invoice #INV-001 due in 3 days"</li>
                        <li>• "Account alert: Password changed successfully"</li>
                      </ul>
                      <p className="text-xs text-green-600 mt-2">
                        <strong>Frequency:</strong> 1-3 messages per order/transaction
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Marketing SMS */}
            <Card className={`border-2 ${marketingConsent ? 'border-purple-200 bg-purple-50' : 'border-gray-200'}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Tag className="h-5 w-5 text-purple-600 mt-1" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-purple-900">Promotional & Marketing Messages</h4>
                      <Checkbox
                        id="marketing-sms"
                        checked={marketingConsent}
                        onCheckedChange={setMarketingConsent}
                      />
                    </div>
                    <p className="text-sm text-purple-800 mb-3">
                      Special offers, new product announcements, and promotional deals for wholesale customers.
                    </p>
                    <div className="bg-white p-3 rounded border">
                      <p className="text-xs font-semibold text-purple-900 mb-1">Message Examples:</p>
                      <ul className="text-xs text-purple-700 space-y-1">
                        <li>• "Special: 20% off electronics this week! Code: SAVE20"</li>
                        <li>• "New arrivals: Premium kitchen appliances now in stock"</li>
                        <li>• "Flash sale: Additional 10% off clearance items ends tonight"</li>
                        <li>• "Monthly newsletter: February deals and product updates"</li>
                      </ul>
                      <p className="text-xs text-purple-600 mt-2">
                        <strong>Frequency:</strong> Maximum 4 promotional messages per month
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Opt-out Information */}
          <Card className="border-2 border-gray-200">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Easy Opt-out Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                <div className="p-3 bg-gray-50 rounded">
                  <MessageCircle className="h-6 w-6 mx-auto mb-2 text-gray-600" />
                  <p className="text-xs font-semibold">Text Message</p>
                  <p className="text-xs text-gray-600">Reply <strong>STOP</strong> to any message</p>
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <Shield className="h-6 w-6 mx-auto mb-2 text-gray-600" />
                  <p className="text-xs font-semibold">Account Settings</p>
                  <p className="text-xs text-gray-600">Update preferences anytime</p>
                </div>
                <div className="p-3 bg-gray-50 rounded">
                  <Phone className="h-6 w-6 mx-auto mb-2 text-gray-600" />
                  <p className="text-xs font-semibold">Phone Call</p>
                  <p className="text-xs text-gray-600"><strong>630-540-9910</strong></p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Legal Compliance Footer */}
          <div className="bg-gray-100 p-4 rounded-lg text-xs text-gray-600">
            <p className="mb-2">
              <strong>Compliance Notice:</strong> This SMS consent process complies with TCPA regulations, FCC guidelines, and carrier requirements for A2P 10DLC campaigns.
            </p>
            <p className="mb-2">
              <strong>Carrier Support:</strong> Messages supported on major carriers including Verizon, AT&T, T-Mobile, Sprint, and regional carriers.
            </p>
            <p>
              <strong>Business Contact:</strong> Gokul Wholesale | 1141 W Bryn Mawr Ave, Itasca, IL 60143 | info@shopgokul.com
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col space-y-2">
          {!isValid && (
            <Alert className="w-full">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Please complete all required fields: phone number, CTA verification, privacy policy acceptance, and at least one message type selection.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex gap-2 w-full">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={!isValid}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm SMS Consent
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}