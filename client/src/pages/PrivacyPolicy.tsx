import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Phone, Mail, MapPin, Clock, Home, Building2 } from "lucide-react";
import { Link } from "wouter";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Business Header with Logo */}
        <div className="bg-white rounded-lg shadow-sm border mb-8 p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <img 
                src="/images/gokul-header-logo.png" 
                alt="Gokul Wholesale Logo" 
                className="h-16 w-auto"
                onError={(e) => {
                  // Fallback to generic building icon if logo fails to load
                  e.currentTarget.style.display = 'none';
                  const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                  if (nextElement) {
                    nextElement.style.display = 'block';
                  }
                }}
              />
              <Building2 className="h-16 w-16 text-blue-600 hidden" />
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Gokul Wholesale Inc</h2>
                <p className="text-gray-600">Your Trusted Wholesale Partner</p>
              </div>
            </div>
            <Link to="/">
              <Button variant="outline" className="flex items-center gap-2">
                <Home className="h-4 w-4" />
                Return to Home
              </Button>
            </Link>
          </div>
          
          {/* Business Information */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4 text-blue-600" />
              <span>Serving Nationwide</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Phone className="h-4 w-4 text-blue-600" />
              <span>Contact Support Available</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Shield className="h-4 w-4 text-blue-600" />
              <span>TCPA Compliant</span>
            </div>
          </div>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-gray-900">Privacy Policy</h1>
          </div>
          <p className="text-gray-600">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="space-y-6">
          {/* Email Communications Policy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-green-600" />
                Email Communications Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Email Consent Collection Process</h3>
                <p className="text-gray-700 mb-4">
                  <strong>Account Registration Consent:</strong> During account creation at shopgokul.com, you provide express consent by checking the email notifications checkbox. This covers transactional emails (order confirmations, delivery updates, account notifications, customer service communications). Your consent is not required as a condition of purchasing goods or services from us.
                </p>
                
                <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
                  <p className="text-green-800">
                    <strong>CAN-SPAM Compliance:</strong> We comply with the CAN-SPAM Act and all applicable federal regulations regarding commercial email communications. All emails include clear identification, honest subject lines, and easy unsubscribe options.
                  </p>
                </div>
                
                <h3 className="font-semibold mb-2">Types of Email Communications</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
                  <li><strong>Transactional Emails:</strong> Order confirmations, shipping notifications, account updates, password resets, and customer service communications</li>
                  <li><strong>Marketing Emails:</strong> Product announcements, promotional offers, newsletters, seasonal campaigns (only with explicit consent)</li>
                  <li><strong>Administrative Emails:</strong> System updates, policy changes, account notifications, and security alerts</li>
                </ul>
                
                <h3 className="font-semibold mb-2">Email Privacy and Security</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
                  <li>We never sell, rent, or share your email address with third parties for marketing purposes</li>
                  <li>Your email address is used exclusively for communications you have consented to receive</li>
                  <li>All emails are sent through secure, authenticated email service providers</li>
                  <li>We maintain detailed consent records and email delivery logs for compliance</li>
                </ul>
                
                <h3 className="font-semibold mb-2">Email Frequency and Content Standards</h3>
                <p className="text-gray-700 mb-2">
                  <strong>Message Frequency:</strong> Transactional emails are sent as needed for order processing and account management. Marketing emails are limited to no more than 8 messages per month for opted-in subscribers.
                </p>
                <p className="text-gray-700 mb-4">
                  <strong>Content Standards:</strong> All emails contain honest subject lines, clear sender identification, and relevant content. We do not send misleading, deceptive, or fraudulent email communications.
                </p>
                
                <h3 className="font-semibold mb-2">How to Unsubscribe</h3>
                <p className="text-gray-700 mb-2">
                  You can opt-out of email communications at any time using any of these methods:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
                  <li>Update your preferences at https://shopgokul.com/account/settings to turn off email notifications</li>
                  <li>Click the unsubscribe link in any marketing email</li>
                  <li>Email us at sales@gokulwholesaleinc.com with your unsubscribe request</li>
                  <li>Call us at (630) 540-9910</li>
                </ul>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Required Email Elements</h4>
                  <p className="text-sm text-gray-700 mb-2">
                    All our marketing emails include the following required elements:
                  </p>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>• Clear identification of sender: Gokul Wholesale Inc</li>
                    <li>• Physical mailing address: 1141 W Bryn Mawr Ave, Itasca, IL 60143</li>
                    <li>• Clear instructions on how to opt-out via account settings</li>
                    <li>• Link to this Privacy Policy</li>
                    <li>• Honest subject line that reflects email content</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* SMS Communications Policy */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-blue-600" />
                SMS Communications Policy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">SMS/Text Message Consent Collection</h3>
                <p className="text-gray-700 mb-4">
                  <strong>Account Registration Consent:</strong> During account creation at shopgokul.com, you provide explicit consent by checking dedicated consent boxes for SMS communications. We collect separate consent for transactional and promotional SMS messages. Your consent is not required as a condition of purchasing goods or services from us.
                </p>
                
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
                  <p className="text-yellow-800">
                    <strong>Two-Step Consent Process:</strong> First, you opt-in to SMS notifications generally, then choose specific categories: transactional messages (order updates, account notifications) and/or promotional messages (special offers, marketing communications). This ensures clear, informed consent for each message type.
                  </p>
                </div>
                
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                  <p className="text-blue-800">
                    <strong>TCPA Compliance Notice:</strong> We comply with the Telephone Consumer Protection Act (TCPA) and all applicable federal and state regulations regarding automated text messaging. We maintain records of all consent given, including the date, time, method of consent, and IP address.
                  </p>
                </div>
                
                <h3 className="font-semibold mb-2">Types of SMS Messages with Brand Identification</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
                  <li><strong>Transactional Messages:</strong> All messages begin with "Gokul Wholesale:" followed by order confirmations, delivery updates, account notifications, and customer service communications</li>
                  <li><strong>Promotional Messages (Separate Opt-in):</strong> Marketing messages include "Gokul Wholesale:" brand prefix, special offers, new product announcements, and promotional campaigns</li>
                  <li><strong>Compliance Features:</strong> All promotional messages include STOP instructions and are limited to 160 characters for optimal delivery</li>
                </ul>
                
                <h3 className="font-semibold mb-2">Consent Record Keeping and Privacy Protection</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
                  <li><strong>Comprehensive Records:</strong> We maintain detailed consent records including date/time of consent, IP address, specific consent types (transactional vs promotional), and user interaction logs</li>
                  <li><strong>Privacy Protection:</strong> Your phone number is never shared with third parties and is used exclusively for communications you have explicitly consented to receive</li>
                  <li><strong>Data Transfer:</strong> When your account is approved, all consent preferences are automatically transferred to your active user account</li>
                  <li><strong>Compliance Monitoring:</strong> All SMS communications are logged and monitored for TCPA and CTA verification compliance</li>
                </ul>
                
                <h3 className="font-semibold mb-2">Message Frequency and Charges</h3>
                <p className="text-gray-700 mb-2">
                  <strong>Message Frequency:</strong> Message frequency varies based on your notification preferences and business activity. You may receive up to 10 messages per month for transactional communications and up to 4 promotional messages per month (if opted in to marketing).
                </p>
                <p className="text-gray-700 mb-4">
                  <strong>Carrier Charges:</strong> Standard message and data rates may apply according to your mobile carrier's plan. Gokul Wholesale Inc is not responsible for carrier charges.
                </p>
                
                <h3 className="font-semibold mb-2">How to Opt-Out</h3>
                <p className="text-gray-700 mb-2">
                  You can opt-out of SMS communications at any time using any of these methods:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-gray-700 mb-4">
                  <li>Reply "STOP" to any text message from us for immediate unsubscribe</li>
                  <li>Text STOP to (630) 647-8042</li>
                  <li>Update your preferences at https://shopgokul.com/account/settings</li>
                  <li>Call us at (630) 540-9910</li>
                  <li>Email us at sales@gokulwholesaleinc.com</li>
                </ul>
                
                <h3 className="font-semibold mb-2">Carrier and Help Information</h3>
                <p className="text-gray-700 mb-2">
                  <strong>Supported Carriers:</strong> Our SMS service is available on major U.S. carriers including AT&T, Verizon, Sprint, T-Mobile, U.S. Cellular, Boost Mobile, Cricket, and Metro PCS. Carrier availability may vary.
                </p>
                <p className="text-gray-700 mb-4">
                  <strong>Help and Support:</strong> For help with SMS services, text "HELP" to any message from us, or contact us at 630-540-9910 or sales@gokulwholesaleinc.com. If you have questions about your text plan or data plan, contact your wireless provider.
                </p>
                
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Legal Disclosures</h4>
                  <p className="text-sm text-gray-700 mb-2">
                    <strong>Company Information:</strong> Gokul Wholesale Inc, located at 1141 W Bryn Mawr Ave, Itasca, IL 60143, is the sender of these text messages.
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Terms and Privacy:</strong> By participating in our SMS program, you agree to our Terms of Service and this Privacy Policy. We reserve the right to modify or terminate our SMS service at any time with reasonable notice.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Collection and Use */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-600" />
                Information We Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Business Information</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>Business name, contact information, and tax details</li>
                  <li>Authorized representatives and contact persons</li>
                  <li>Order history, preferences, and purchase patterns</li>
                  <li>Communication preferences and consent records</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-2">Technical Information</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-700">
                  <li>IP addresses, browser information, and device identifiers</li>
                  <li>Login activity and security information</li>
                  <li>Website usage patterns and preferences</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* How We Use Information */}
          <Card>
            <CardHeader>
              <CardTitle>How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Process and fulfill your wholesale orders</li>
                <li>Provide customer service and support</li>
                <li>Send order confirmations and delivery notifications</li>
                <li>Maintain accurate business records and accounts</li>
                <li>Comply with legal and regulatory requirements</li>
                <li>Improve our products and services</li>
                <li>Send promotional offers via email and SMS (only with explicit consent)</li>
                <li>Provide multi-language customer support and communications</li>
              </ul>
            </CardContent>
          </Card>

          {/* Data Protection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                Data Protection and Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. This includes:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Encrypted data transmission (HTTPS/TLS)</li>
                <li>Secure database storage with access controls</li>
                <li>Regular security audits and updates</li>
                <li>Staff training on privacy and data protection</li>
                <li>Limited access on a need-to-know basis</li>
              </ul>
            </CardContent>
          </Card>

          {/* Third Party Sharing */}
          <Card>
            <CardHeader>
              <CardTitle>Information Sharing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-700">
                We do not sell, trade, or rent your personal information to third parties. We may share information only in these limited circumstances:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-700">
                <li>Service providers who help us operate our business (e.g., payment processors, delivery services, email service providers like SendGrid)</li>
                <li>Legal requirements (court orders, government requests)</li>
                <li>Protection of our rights and property</li>
                <li>Business transfers (with appropriate protections)</li>
              </ul>
            </CardContent>
          </Card>

          {/* A2P Compliance Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-purple-600" />
                A2P Campaign Compliance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-purple-50 border-l-4 border-purple-400 p-4">
                <h4 className="font-semibold text-purple-900 mb-2">Registered A2P Campaign</h4>
                <p className="text-purple-800 text-sm">
                  This business operates registered Application-to-Person (A2P) messaging campaigns in compliance with carrier requirements and CTIA guidelines. Our campaigns are registered with appropriate oversight bodies for consumer protection.
                </p>
              </div>
              
              <div className="space-y-3">
                <div>
                  <h4 className="font-semibold mb-2">Campaign Details</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li><strong>Business Name:</strong> Gokul Wholesale Inc</li>
                    <li><strong>Campaign Type:</strong> Mixed (Transactional and Promotional)</li>
                    <li><strong>Use Case:</strong> Order notifications, delivery updates, customer service, promotional offers</li>
                    <li><strong>Opt-in Methods:</strong> Website forms, account registration, verbal consent with confirmation</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Consumer Rights</h4>
                  <ul className="text-sm text-gray-700 space-y-1">
                    <li>Right to opt-out at any time without penalty</li>
                    <li>Right to receive help information by texting "HELP"</li>
                    <li>Right to file complaints with carrier or regulatory authorities</li>
                    <li>Right to access and review consent records</li>
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Message Content Standards</h4>
                  <p className="text-sm text-gray-700">
                    All messages are reviewed for compliance with TCPA, CAN-SPAM Act, and carrier guidelines. We do not send:
                  </p>
                  <ul className="text-sm text-gray-700 space-y-1 mt-2">
                    <li>• Messages to numbers on the National Do Not Call Registry (unless exempt)</li>
                    <li>• Misleading or deceptive content</li>
                    <li>• Phishing or fraudulent messages</li>
                    <li>• Content violating carrier policies</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Us</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">
                If you have questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  <span>Phone: 630-540-9910</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  <span>Email: sales@gokulwholesaleinc.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <span>Address: 1141 W Bryn Mawr Ave, Itasca, IL 60143</span>
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-semibold mb-3">Easy Unsubscribe Options</h4>
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail className="h-5 w-5 text-blue-600" />
                    <span className="font-medium text-blue-900">One-Click Email Unsubscribe</span>
                  </div>
                  <p className="text-blue-800 mb-3">
                    You can easily unsubscribe from all marketing emails without logging into your account:
                  </p>
                  <a 
                    href="/unsubscribe" 
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    <Mail className="h-4 w-4 mr-2" />
                    Unsubscribe Now
                  </a>
                  <p className="text-sm text-blue-700 mt-2">
                    Simply enter your email address - no login required
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <h5 className="font-medium mb-2">SMS/Text Messages:</h5>
                    <ul className="list-disc pl-6 space-y-1 text-gray-600">
                      <li>Reply "STOP" to any text message</li>
                      <li>Call us at 630-540-9910</li>
                      <li>Email sales@gokulwholesaleinc.com</li>
                    </ul>
                  </div>
                  <div>
                    <h5 className="font-medium mb-2">All Email Communication Options:</h5>
                    <ul className="list-disc pl-6 space-y-1 text-gray-600">
                      <li><strong>One-click unsubscribe:</strong> Visit <a href="/unsubscribe" className="text-blue-600 hover:underline font-medium">our unsubscribe page</a> and enter your email</li>
                      <li>Click "Unsubscribe" button in any marketing email</li>
                      <li>Update preferences in your account settings</li>
                      <li>Email sales@gokulwholesaleinc.com</li>
                      <li>Call us at 630-540-9910</li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Updates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Policy Updates
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700">
                We may update this Privacy Policy periodically to reflect changes in our practices or applicable laws. When we make significant changes, we will notify you through our website or other appropriate communication methods. The "Last Updated" date at the top of this policy indicates when the most recent changes were made.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Gokul Wholesale. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}