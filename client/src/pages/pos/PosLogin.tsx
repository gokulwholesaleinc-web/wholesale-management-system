import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { 
  Store, Shield, Lock, Mail, Clock, CheckCircle, MapPin,
  User, Key, AlertTriangle, Wifi, Smartphone
} from 'lucide-react';

interface PosLoginProps {
  onLoginSuccess: () => void;
}

export const PosLogin: React.FC<PosLoginProps> = ({ onLoginSuccess }) => {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [credentials, setCredentials] = useState({
    username: '',
    password: '',
    otpCode: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [loginStep, setLoginStep] = useState<'credentials' | 'otp' | 'success'>('credentials');
  const [otpRequired, setOtpRequired] = useState(true);
  const [otpKey, setOtpKey] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [clientIP, setClientIP] = useState('');
  const [rememberDevice, setRememberDevice] = useState(false);
  const [deviceFingerprint, setDeviceFingerprint] = useState('');
  const [isTrustedDevice, setIsTrustedDevice] = useState(false);

  // Generate device fingerprint and check trusted device status
  useEffect(() => {
    const generateDeviceFingerprint = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx!.textBaseline = 'top';
      ctx!.font = '14px Arial';
      ctx!.fillText('Device fingerprint', 2, 2);
      
      const fingerprint = [
        navigator.userAgent,
        navigator.language,
        screen.width + 'x' + screen.height,
        new Date().getTimezoneOffset(),
        canvas.toDataURL()
      ].join('|');
      
      // Simple hash function
      let hash = 0;
      for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      
      return Math.abs(hash).toString(36);
    };

    const checkDeviceStatus = async () => {
      const deviceFP = generateDeviceFingerprint();
      setDeviceFingerprint(deviceFP);
      
      // Check if device is in trusted devices (stored locally for UI feedback)
      const storedTrustedDevices = localStorage.getItem('pos_trusted_devices');
      const trustedDevices = storedTrustedDevices ? JSON.parse(storedTrustedDevices) : [];
      const isDeviceTrusted = trustedDevices.includes(deviceFP);
      
      setIsTrustedDevice(isDeviceTrusted);
      setOtpRequired(!isDeviceTrusted); // Skip OTP if device is trusted
      console.log(`Device status: trusted=${isDeviceTrusted}, fingerprint=${deviceFP}`);
    };

    checkDeviceStatus();
  }, [toast]);

  // Timer for OTP expiration
  useEffect(() => {
    if (timeRemaining > 0) {
      const interval = setInterval(() => {
        setTimeRemaining(prev => {
          const newTime = prev - 1;
          if (newTime <= 0) {
            setLoginStep('credentials');
            setOtpKey('');
            toast({
              title: "OTP Expired",
              description: "Please request a new OTP code.",
              variant: "destructive"
            });
          }
          return newTime;
        });
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [timeRemaining, toast]);

  const handleCredentialLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!credentials.username || !credentials.password) {
      toast({
        title: "Missing Credentials",
        description: "Please enter your username and password.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Use POS-specific login endpoint
      const response = await fetch('/api/pos/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password,
          deviceFingerprint
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Authentication failed');
      }

      const data = await response.json();
      
      if (data.success && data.skipOtp) {
        // Trusted device - skip OTP verification
        localStorage.setItem('pos_auth_token', data.token);
        localStorage.setItem('pos_session', JSON.stringify({
          userId: data.user.id,
          username: data.user.username,
          loginTime: Date.now(),
          deviceFingerprint
        }));
        
        toast({
          title: "Welcome Back",
          description: "Trusted device login successful",
        });
        
        setLoginStep('success');
        setTimeout(() => {
          onLoginSuccess();
        }, 1500);
      } else if (data.success && data.requiresOtp) {
        // Store OTP key and user info for verification step
        setOtpKey(data.otpKey);
        setUserEmail(data.userEmail);
        setTimeRemaining(300); // 5 minutes
        setLoginStep('otp');
        
        toast({
          title: "Verification Code Sent",
          description: `OTP sent to ${data.userEmail}`,
        });
      } else if (data.success && data.user && data.token) {
        // Direct login without OTP (fallback)
        localStorage.setItem('pos_auth_token', data.token);
        localStorage.setItem('pos_session', JSON.stringify({
          userId: data.user.id,
          username: data.user.username,
          loginTime: Date.now(),
          deviceFingerprint
        }));
        
        setLoginStep('success');
        setTimeout(() => {
          onLoginSuccess();
        }, 1500);
      }

    } catch (error: any) {
      toast({
        title: "Login Failed",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };



  const handleOTPVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!credentials.otpCode) {
      toast({
        title: "OTP Required",
        description: "Please enter the OTP code sent to your email.",
        variant: "destructive"
      });
      return;
    }

    await completePosLogin();
  };

  const completePosLogin = async () => {
    setIsLoading(true);
    
    try {
      const response = await fetch('/api/pos/verify-otp', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          otpKey,
          otpCode: credentials.otpCode,
          rememberDevice,
          deviceFingerprint
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Authentication failed');
      }

      const data = await response.json();
      
      if (data.success && data.token) {
        // Store POS authentication data
        localStorage.setItem('pos_auth_token', data.token);
        localStorage.setItem('pos_session', JSON.stringify({
          userId: data.user.id,
          username: data.user.username,
          loginTime: Date.now(),
          deviceFingerprint
        }));
        
        // If device was marked as trusted, store it locally for UI feedback
        if (data.deviceTrusted && rememberDevice) {
          const storedTrustedDevices = localStorage.getItem('pos_trusted_devices');
          const trustedDevices = storedTrustedDevices ? JSON.parse(storedTrustedDevices) : [];
          if (!trustedDevices.includes(deviceFingerprint)) {
            trustedDevices.push(deviceFingerprint);
            localStorage.setItem('pos_trusted_devices', JSON.stringify(trustedDevices));
          }
        }
        
        toast({
          title: "Login Successful",
          description: rememberDevice ? "Device remembered for 30 days" : "Welcome to the POS system",
        });
        
        setLoginStep('success');
        setTimeout(() => {
          onLoginSuccess();
        }, 1500);
      }
      
    } catch (error: any) {
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

  return (
    <>
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-full mb-4">
          <Store className="h-8 w-8" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">POS System</h1>
        <p className="text-gray-600 mt-2">Gokul Wholesale Inc.</p>
        
        {/* Device Status */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <Smartphone className="h-4 w-4 text-gray-500" />
          <span className="text-sm text-gray-600">Device: {deviceFingerprint.substring(0, 8)}...</span>
          {isTrustedDevice ? (
            <Badge variant="secondary" className="bg-green-100 text-green-700">
              <CheckCircle className="h-3 w-3 mr-1" />
              Trusted Device
            </Badge>
          ) : (
            <Badge variant="outline" className="border-blue-300 text-blue-700">
              <Lock className="h-3 w-3 mr-1" />
              New Device
            </Badge>
          )}
        </div>
      </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              {loginStep === 'credentials' && (
                <>
                  <User className="h-5 w-5 text-blue-600" />
                  Staff Authentication
                </>
              )}
              {loginStep === 'otp' && (
                <>
                  <Mail className="h-5 w-5 text-blue-600" />
                  OTP Verification
                </>
              )}
              {loginStep === 'instore_code' && (
                <>
                  <Key className="h-5 w-5 text-blue-600" />
                  Store Access
                </>
              )}
              {loginStep === 'success' && (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Access Granted
                </>
              )}
            </CardTitle>
            <CardDescription>
              {loginStep === 'credentials' && "Enter your staff credentials to access POS"}
              {loginStep === 'otp' && `OTP sent to ${userEmail}`}
              {loginStep === 'instore_code' && "Enter in-store access code"}
              {loginStep === 'success' && "Redirecting to POS dashboard..."}
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {loginStep === 'credentials' && (
              <form onSubmit={handleCredentialLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    value={credentials.username}
                    onChange={(e) => setCredentials(prev => ({ ...prev, username: e.target.value }))}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={credentials.password}
                    onChange={(e) => setCredentials(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>
                
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Authenticating...
                    </div>
                  ) : (
                    'Continue'
                  )}
                </Button>
              </form>
            )}

            {loginStep === 'otp' && (
              <form onSubmit={handleOTPVerification} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otpCode" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    OTP Code
                  </Label>
                  <Input
                    id="otpCode"
                    type="text"
                    placeholder="Enter 6-digit OTP"
                    value={credentials.otpCode}
                    onChange={(e) => setCredentials(prev => ({ ...prev, otpCode: e.target.value }))}
                    maxLength={6}
                    required
                  />
                </div>
                
                {timeRemaining > 0 && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Clock className="h-4 w-4" />
                    OTP expires in: {formatTime(timeRemaining)}
                  </div>
                )}
                
                <div className="flex items-start space-x-3 mb-4">
                  <Checkbox
                    id="remember-device"
                    checked={rememberDevice}
                    onCheckedChange={(checked) => setRememberDevice(checked as boolean)}
                    disabled={isTrustedDevice}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <label
                      htmlFor="remember-device"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Remember this device for 30 days
                    </label>
                    <p className="text-xs text-gray-600">
                      {isTrustedDevice 
                        ? "This device is already trusted for 30 days" 
                        : "Skip OTP authentication on this device for the next 30 days"
                      }
                    </p>
                  </div>
                </div>
                
                <Button type="submit" className="w-full bg-green-600 hover:bg-green-700" disabled={isLoading}>
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Accessing POS...
                    </div>
                  ) : (
                    'Access POS System'
                  )}
                </Button>
              </form>
            )}



            {loginStep === 'success' && (
              <div className="text-center py-6">
                <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-900 mb-2">Access Granted!</p>
                <p className="text-gray-600">Loading POS system...</p>
              </div>
            )}
            
            {/* Info Panel */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start gap-2">
                <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Secure POS Access</p>
                  <p>Enhanced security with OTP verification and device remembering for streamlined access.</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
    </>
  );
};