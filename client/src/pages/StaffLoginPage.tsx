import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useLocation } from 'wouter';
import { 
  Mail, 
  Phone, 
  Shield, 
  KeyRound, 
  Clock, 
  CheckCircle,
  Store,
  Users,
  ArrowLeft
} from 'lucide-react';

interface OTPResponse {
  success: boolean;
  message: string;
  sessionId?: string;
}

interface VerifyResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: any;
}

export default function StaffLoginPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Form states
  const [staffId, setStaffId] = useState('');
  const [contactMethod, setContactMethod] = useState<'email' | 'sms'>('email');
  const [contactValue, setContactValue] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [sessionId, setSessionId] = useState('');
  
  // UI states
  const [currentStep, setCurrentStep] = useState<'login' | 'verify'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // Send OTP
  const sendOTP = async () => {
    if (!staffId || !contactValue) {
      toast({
        title: "Missing Information",
        description: "Please provide both Staff ID and contact information",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response: OTPResponse = await apiRequest('POST', '/api/staff/auth/send-otp', {
        staffId,
        contactMethod,
        contactValue
      });

      if (response.success) {
        setSessionId(response.sessionId || '');
        setCurrentStep('verify');
        setTimeLeft(300); // 5 minutes
        
        toast({
          title: "OTP Sent",
          description: `Verification code sent to your ${contactMethod === 'email' ? 'email' : 'phone'}`,
          variant: "default"
        });

        // Start countdown timer
        const timer = setInterval(() => {
          setTimeLeft(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        toast({
          title: "Failed to Send OTP",
          description: response.message || "Please check your credentials and try again",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Authentication Error",
        description: error.message || "Failed to send verification code",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP
  const verifyOTP = async () => {
    if (!otpCode || !sessionId) {
      toast({
        title: "Missing Code",
        description: "Please enter the verification code",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const response: VerifyResponse = await apiRequest('POST', '/api/staff/auth/verify-otp', {
        sessionId,
        code: otpCode
      });

      if (response.success && response.token) {
        // Store the staff token
        localStorage.setItem('staffToken', response.token);
        localStorage.setItem('staffUser', JSON.stringify(response.user));
        
        toast({
          title: "Login Successful",
          description: "Welcome to the POS system",
          variant: "default"
        });

        // Redirect to POS system
        setTimeout(() => {
          setLocation('/instore');
        }, 1000);
      } else {
        toast({
          title: "Invalid Code",
          description: response.message || "Please check the verification code and try again",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      toast({
        title: "Verification Error",
        description: error.message || "Failed to verify code",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Format time remaining
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Go back to login step
  const goBack = () => {
    setCurrentStep('login');
    setOtpCode('');
    setSessionId('');
    setTimeLeft(0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
      
      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <Store className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Staff Access</h1>
          <p className="text-gray-600">Secure authentication for POS system</p>
          <Badge variant="outline" className="mt-2">
            <Shield className="h-3 w-3 mr-1" />
            Two-Factor Authentication
          </Badge>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="text-center pb-2">
            <CardTitle className="flex items-center justify-center gap-2">
              {currentStep === 'login' ? (
                <>
                  <Users className="h-5 w-5" />
                  Staff Login
                </>
              ) : (
                <>
                  <KeyRound className="h-5 w-5" />
                  Verify Code
                </>
              )}
            </CardTitle>
            <CardDescription>
              {currentStep === 'login' 
                ? "Enter your staff credentials to receive a verification code"
                : "Enter the verification code sent to your device"
              }
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {currentStep === 'login' ? (
              // Login Step
              <div className="space-y-4">
                {/* Staff ID */}
                <div className="space-y-2">
                  <Label htmlFor="staffId">Staff ID</Label>
                  <Input
                    id="staffId"
                    type="text"
                    placeholder="Enter your staff ID"
                    value={staffId}
                    onChange={(e) => setStaffId(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                {/* Contact Method Selection */}
                <div className="space-y-3">
                  <Label>Verification Method</Label>
                  <Tabs value={contactMethod} onValueChange={(value) => setContactMethod(value as 'email' | 'sms')}>
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="email" className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        Email
                      </TabsTrigger>
                      <TabsTrigger value="sms" className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        SMS
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="email" className="mt-3">
                      <Input
                        type="email"
                        placeholder="Enter your work email"
                        value={contactValue}
                        onChange={(e) => setContactValue(e.target.value)}
                        disabled={isLoading}
                      />
                    </TabsContent>
                    
                    <TabsContent value="sms" className="mt-3">
                      <Input
                        type="tel"
                        placeholder="Enter your phone number"
                        value={contactValue}
                        onChange={(e) => setContactValue(e.target.value)}
                        disabled={isLoading}
                      />
                    </TabsContent>
                  </Tabs>
                </div>

                {/* Send OTP Button */}
                <Button 
                  onClick={sendOTP}
                  disabled={isLoading || !staffId || !contactValue}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Sending Code...
                    </div>
                  ) : (
                    <>
                      Send Verification Code
                      <KeyRound className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>

                {/* Back to Home */}
                <Button 
                  variant="outline" 
                  onClick={() => setLocation('/')}
                  className="w-full"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Home
                </Button>
              </div>
            ) : (
              // Verification Step
              <div className="space-y-4">
                {/* Timer */}
                <div className="text-center">
                  <div className="flex items-center justify-center gap-2 text-sm text-gray-600 mb-4">
                    <Clock className="h-4 w-4" />
                    Code expires in: {formatTime(timeLeft)}
                  </div>
                  {timeLeft === 0 && (
                    <Badge variant="destructive" className="mb-4">
                      Code Expired
                    </Badge>
                  )}
                </div>

                {/* OTP Input */}
                <div className="space-y-2">
                  <Label htmlFor="otpCode">Verification Code</Label>
                  <Input
                    id="otpCode"
                    type="text"
                    placeholder="Enter 6-digit code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    disabled={isLoading || timeLeft === 0}
                    className="text-center text-lg letter-spacing-wider"
                  />
                  <p className="text-xs text-gray-500 text-center">
                    Check your {contactMethod === 'email' ? 'email' : 'phone'} for the verification code
                  </p>
                </div>

                {/* Verify Button */}
                <Button 
                  onClick={verifyOTP}
                  disabled={isLoading || otpCode.length !== 6 || timeLeft === 0}
                  className="w-full"
                  size="lg"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Verifying...
                    </div>
                  ) : (
                    <>
                      Verify & Login
                      <CheckCircle className="h-4 w-4 ml-2" />
                    </>
                  )}
                </Button>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={goBack}
                    className="flex-1"
                    disabled={isLoading}
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  
                  <Button 
                    variant="secondary" 
                    onClick={sendOTP}
                    className="flex-1"
                    disabled={isLoading || timeLeft > 240} // Allow resend after 1 minute
                  >
                    Resend Code
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Having trouble? Contact your manager or IT support
          </p>
          <Badge variant="secondary" className="mt-2">
            Gokul Wholesale • Staff Portal
          </Badge>
        </div>
      </div>
    </div>
  );
}