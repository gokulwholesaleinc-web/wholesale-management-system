import React, { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Store, Shield, Mail, Clock, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

export default function InstoreLoginNew() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isLoading: authLoading } = useAuth();
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    instoreCode: '',
    otpCode: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [otpStep, setOtpStep] = useState<'login' | 'otp' | 'complete'>('login');
  const [otpKey, setOtpKey] = useState('');
  const [otpExpiration, setOtpExpiration] = useState<number>(0);
  const [userEmail, setUserEmail] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(0);

  // Timer for OTP expiration
  React.useEffect(() => {
    if (otpExpiration > 0) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((otpExpiration - Date.now()) / 1000));
        setTimeRemaining(remaining);
        
        if (remaining === 0) {
          setOtpStep('login');
          setOtpKey('');
          setOtpExpiration(0);
          toast({
            title: "OTP Expired",
            description: "Please request a new OTP code.",
            variant: "destructive"
          });
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [otpExpiration, toast]);

  const handleRequestOTP = async () => {
    if (!credentials.username || !credentials.password) {
      toast({
        title: "Credentials Required",
        description: "Please enter your username and password first.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // First authenticate with regular credentials
      const authData = await apiRequest('POST', '/api/login', {
        username: credentials.username,
        password: credentials.password
      });
      setUserEmail(authData.user.email || authData.user.username);
      
      // Request OTP
      const otpResponse = await fetch('/api/auth/generate-instore-otp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.token}`
        }
      });

      if (!otpResponse.ok) {
        const error = await otpResponse.json();
        throw new Error(error.error || 'Failed to generate OTP');
      }

      const otpData = await otpResponse.json();
      setOtpKey(otpData.otpKey);
      setOtpExpiration(Date.now() + (otpData.expiresIn * 1000));
      setOtpStep('otp');
      
      // Store auth token for later use
      localStorage.setItem('tempAuthToken', authData.token);
      
      toast({
        title: "OTP Sent",
        description: `One-time password sent to ${authData.user.email || 'your email'}`,
      });
      
    } catch (error: any) {
      console.error('OTP request failed:', error);
      toast({
        title: "OTP Request Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLoading) return;
    setIsLoading(true);
    
    try {
      const authToken = localStorage.getItem('tempAuthToken');
      if (!authToken) {
        throw new Error('Authentication session expired. Please request OTP again.');
      }
      
      // Verify in-store access with OTP
      const instoreResponse = await fetch('/api/auth/verify-instore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          instoreCode: credentials.instoreCode,
          otpCode: credentials.otpCode,
          otpKey: otpKey
        })
      });

      if (!instoreResponse.ok) {
        const errorData = await instoreResponse.json().catch(() => ({}));
        throw new Error(errorData.error || 'Invalid verification');
      }

      // Set authentication token and redirect to POS
      localStorage.setItem('authToken', authToken);
      localStorage.removeItem('tempAuthToken');
      
      toast({
        title: "Access Granted",
        description: "Welcome to the in-store POS system.",
      });
      
      setOtpStep('complete');
      setTimeout(() => setLocation('/instore/pos'), 1500);
    } catch (error: any) {
      console.error('OTP verification failed:', error);
      toast({
        title: "Access Denied",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // For in-store access, always require OTP authentication regardless of existing login
  // This ensures complete isolation of the POS system

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
            <Store className="w-6 h-6 text-blue-600" />
          </div>
          <CardTitle>In-Store POS Access</CardTitle>
          <CardDescription>
            {otpStep === 'login' && "Secure authentication required"}
            {otpStep === 'otp' && "Enter OTP code sent to your email"}
            {otpStep === 'complete' && "Access granted - redirecting..."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {otpStep === 'login' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  value={credentials.username}
                  onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                  placeholder="Enter your username"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  placeholder="Enter your password"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="instoreCode" className="flex items-center">
                  <Shield className="w-4 h-4 mr-2 text-blue-600" />
                  In-Store Access Code
                </Label>
                <Input
                  id="instoreCode"
                  type="password"
                  value={credentials.instoreCode}
                  onChange={(e) => setCredentials({ ...credentials, instoreCode: e.target.value })}
                  placeholder="Enter in-store access code"
                  required
                />
              </div>
              
              <Button 
                onClick={handleRequestOTP}
                disabled={isLoading || !credentials.username || !credentials.password || !credentials.instoreCode}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Requesting OTP...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4 mr-2" />
                    Send OTP to Email
                  </>
                )}
              </Button>
            </>
          )}
          
          {otpStep === 'otp' && (
            <form onSubmit={handleVerifyOTP} className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                <Mail className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                <p className="text-sm text-blue-800">
                  OTP sent to: <strong>{userEmail}</strong>
                </p>
                <div className="flex items-center justify-center mt-2 text-blue-600">
                  <Clock className="w-4 h-4 mr-1" />
                  <span className="font-mono text-sm">
                    {formatTime(timeRemaining)}
                  </span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="otpCode">Enter OTP Code</Label>
                <Input
                  id="otpCode"
                  value={credentials.otpCode}
                  onChange={(e) => setCredentials({ ...credentials, otpCode: e.target.value })}
                  placeholder="000000"
                  maxLength={6}
                  className="text-center text-2xl font-mono tracking-widest"
                  required
                />
              </div>
              
              <Button 
                type="submit"
                disabled={isLoading || !credentials.otpCode || credentials.otpCode.length !== 6}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Verifying...
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4 mr-2" />
                    Verify & Access POS
                  </>
                )}
              </Button>
              
              <Button 
                type="button"
                onClick={() => {
                  setOtpStep('login');
                  setOtpKey('');
                  setOtpExpiration(0);
                  localStorage.removeItem('tempAuthToken');
                }}
                variant="outline"
                className="w-full"
                disabled={isLoading}
              >
                Back to Login
              </Button>
            </form>
          )}
          
          {otpStep === 'complete' && (
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-green-600 font-medium">Access Granted!</p>
              <p className="text-sm text-gray-600">Redirecting to POS system...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}