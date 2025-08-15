import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Store, Shield, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";

export default function InstoreLogin() {
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!credentials.username || !credentials.password || !credentials.instoreCode) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields including the in-store access code.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // First authenticate with regular credentials
      const loginResponse = await apiRequest('/api/login', {
        method: 'POST',
        body: JSON.stringify({
          username: credentials.username,
          password: credentials.password
        })
      });

      if (!loginResponse.ok) {
        throw new Error('Invalid credentials');
      }

      const authData = await loginResponse.json();
      
      // Then verify in-store access code
      const instoreResponse = await fetch('/api/auth/verify-instore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.token}`
        },
        body: JSON.stringify({
          instoreCode: credentials.instoreCode,
          emergencyOverride: showEmergencyOverride
        })
      });

      if (!instoreResponse.ok) {
        const errorData = await instoreResponse.json().catch(() => ({}));
        
        // Handle IP restriction error
        if (errorData.requiresEmergencyOverride) {
          setClientIP(errorData.clientIP || 'Unknown');
          setShowEmergencyOverride(true);
          toast({
            title: "Location Restricted",
            description: `Access denied from IP: ${errorData.clientIP}. Admin emergency override available.`,
            variant: "destructive"
          });
          setIsLoading(false);
          return;
        }
        
        throw new Error(errorData.error || 'Invalid in-store access code');
      }

      // Set authentication token and redirect to POS
      localStorage.setItem('authToken', authData.token);
      localStorage.setItem('user', JSON.stringify(authData.user));
      
      toast({
        title: "Access Granted",
        description: "Welcome to the in-store POS system.",
      });
      
      setLocation('/instore/pos');
    } catch (error) {
      console.error('Login failed:', error);
      toast({
        title: "Access Denied",
        description: "Invalid credentials or in-store access code.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-2 border-blue-200">
        <CardHeader className="text-center bg-blue-50 rounded-t-lg">
          <div className="flex justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full">
              <Store className="w-8 h-8 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-blue-900">
            In-Store Access
          </CardTitle>
          <CardDescription className="text-blue-700">
            Secure POS System Login
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="font-medium text-orange-800">Authorized Personnel Only</h4>
                <p className="text-sm text-orange-700 mt-1">
                  This system is for authorized store employees only. All access is logged and monitored.
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
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
            
            {showEmergencyOverride && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <h4 className="font-medium text-red-800">Emergency Admin Override</h4>
                    <p className="text-sm text-red-700 mt-1">
                      Your IP address ({clientIP}) is not authorized for POS access.
                    </p>
                    <p className="text-sm text-red-700 mt-2">
                      <strong>Admin users only:</strong> Check this box to override location restrictions.
                      This action will be logged and monitored.
                    </p>
                    <div className="flex items-center space-x-2 mt-3">
                      <input
                        type="checkbox"
                        id="emergencyOverride"
                        checked={showEmergencyOverride}
                        onChange={(e) => setShowEmergencyOverride(e.target.checked)}
                        className="rounded border-red-300"
                      />
                      <Label htmlFor="emergencyOverride" className="text-sm text-red-800">
                        I am an admin and authorize emergency access
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={isLoading}
            >
              {isLoading ? "Verifying Access..." : "Access POS System"}
            </Button>
          </form>
          
          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Need help? Contact store management for assistance.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}