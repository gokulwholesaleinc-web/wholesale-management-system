
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageCircle, Shield, ArrowLeft } from 'lucide-react';
import { Link } from 'wouter';


export default function ConsentDemo() {

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Home
            </Link>
          </Button>
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">SMS Consent Demo</h1>
            <p className="text-gray-600">Preview the SMS consent collection process</p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* SMS Consent Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-blue-600" />
                SMS Consent Form
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                SMS consent is now collected during account creation with proper TCPA compliance and CTA verification.
              </p>
              <Button 
                asChild
                className="w-full"
              >
                <Link href="/create-account">
                  View Account Creation Form
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Privacy Policy Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                Privacy Policy
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 mb-4">
                Our privacy policy includes SMS-specific compliance language for TCPA regulations.
              </p>
              <Button 
                asChild 
                variant="outline" 
                className="w-full"
              >
                <Link href="/privacy-policy">
                  View Privacy Policy
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Access Information */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Where Users Can Access SMS Consent Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900">For Logged-in Users:</h4>
                <ol className="list-decimal list-inside mt-2 space-y-1 text-gray-600">
                  <li>Login to their account</li>
                  <li>Go to Account Settings or Dashboard</li>
                  <li>Click "Notification Settings"</li>
                  <li>Look for "SMS Notification Preferences" section</li>
                </ol>
              </div>
              
              <div>
                <h4 className="font-semibold text-gray-900">Privacy Policy Access:</h4>
                <ul className="list-disc list-inside mt-2 space-y-1 text-gray-600">
                  <li>Homepage footer - "Privacy Policy" link</li>
                  <li>Public catalog footer - "Privacy Policy" link</li>
                  <li>Direct URL: <code className="bg-gray-100 px-2 py-1 rounded text-sm">/privacy-policy</code></li>
                  <li>All SMS consent forms include privacy policy links</li>
                </ul>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">CTA Verification Features:</h4>
                <ul className="list-disc list-inside space-y-1 text-blue-800 text-sm">
                  <li>Users must acknowledge they initiated the consent process</li>
                  <li>Clear explanation of how they reached the consent form</li>
                  <li>Complete audit trail with IP address and timestamps</li>
                  <li>Separate consent for transactional vs marketing messages</li>
                  <li>Multiple opt-out methods (STOP, web, phone)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>


    </div>
  );
}