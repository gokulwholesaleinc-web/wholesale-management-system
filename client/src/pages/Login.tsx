import { AppLayout } from "@/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { LogIn, User, Fingerprint, Smartphone, KeyRound } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState, useEffect } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { login, logAuthStatus } from "@/lib/auth";
// Unified auth removed during cleanup
import { queryClient } from "@/lib/queryClient";
import { useLocation, Link } from "wouter";
import { useBiometricAuth } from "@/hooks/useBiometricAuth";
import { PasswordResetDialog } from "@/components/auth/PasswordResetDialog";
// Logo removed during cleanup - using text instead

// Login form schema
const formSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof formSchema>;

export default function Login() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [location, setLocation] = useLocation();
  const [showPasswordReset, setShowPasswordReset] = useState(false);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    console.log("🔐 Login form submitted with data:", {
      username: data.username,
      passwordLength: data.password?.length || 0,
      usernameType: typeof data.username,
      passwordType: typeof data.password
    });
    
    // Validate data before submission
    if (!data.username || !data.password) {
      console.error("❌ Missing credentials in form data");
      toast({
        title: "Validation Error",
        description: "Please enter both username and password",
        variant: "destructive",
      });
      return;
    }
    
    setIsLoggingIn(true);
    
    try {
      console.log("🚀 Calling login function with:", data.username, "and password of length", data.password.length);
      let result;
        result = await login(data.username.trim(), data.password.trim());
      console.log("📥 Login result received:", result);
      
      if (result.success) {
        // Store authentication data in working format
        sessionStorage.setItem('authToken', result.token);
        sessionStorage.setItem('gokul_auth_data', JSON.stringify({
          token: result.token,
          userData: result.user,
          expiresAt: Date.now() + (24 * 60 * 60 * 1000) // 24 hours
        }));
        
        console.log('Auth data stored successfully');
        
        // Trigger custom event to notify useAuth hook of state change
        window.dispatchEvent(new CustomEvent('authStateChanged'));
        
        // Invalidate queries to force refresh
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        queryClient.setQueryData(["/api/auth/user"], result.user);
        
        
        // Always redirect to dashboard after successful login
        const returnUrl = localStorage.getItem('redirectAfterLogin');
        
        if (returnUrl && returnUrl !== '/' && returnUrl !== '/login') {
          // Redirect to specific page if stored
          window.location.href = returnUrl;
        } else {
          // Default redirect to dashboard
          window.location.href = '/dashboard';
        }
        
        // Clean up redirect URL
        localStorage.removeItem('redirectAfterLogin');
      } else {
        toast({
          title: "Login Failed",
          description: "Incorrect username or password. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("🚨 Login error details:", {
        message: error?.message || 'Unknown error',
        stack: error?.stack || 'No stack trace',
        username: data.username,
        timestamp: new Date().toISOString()
      });
      
      // Parse error message to determine the exact issue
      const errorMessage = error?.message || '';
      console.log("Error message analysis:", errorMessage);
      
      if (errorMessage.includes('401') || errorMessage.includes('Unauthorized') || errorMessage.includes('Invalid credentials') || errorMessage.includes('Incorrect password')) {
        toast({
          title: "Login Failed",
          description: "Incorrect username or password. Please try again.",
          variant: "destructive",
        });
      } else if (errorMessage.includes('fetch failed') || errorMessage.includes('NetworkError') || errorMessage.includes('Failed to fetch')) {
        toast({
          title: "Connection Error",
          description: "Unable to connect to server. Please check your connection and try again.",
          variant: "destructive",
        });
      } else if (errorMessage.includes('timeout')) {
        toast({
          title: "Request Timeout",
          description: "The server is taking too long to respond. Please try again.",
          variant: "destructive",
        });
      } else {
        // Default to showing the actual error for better debugging
        toast({
          title: "Login Error",
          description: errorMessage.includes('password') ? "Incorrect username or password. Please try again." : "Login failed. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoggingIn(false);
    }
  };

  // If user is loading, show loading state
  if (isLoading) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  // If user is already authenticated, redirect to home page
  if (user) {
    return (
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-white">
          <div className="text-center">
            <p className="text-gray-600 mb-4">You are already logged in. Redirecting...</p>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100">
      {/* Mobile Layout */}
      <div className="md:hidden min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
        {/* Header with logo */}
        <header className="py-5 bg-white shadow-sm">
          <div className="container mx-auto px-4 flex justify-center">
            <span className="text-2xl font-bold text-blue-600">Gokul Wholesale</span>
          </div>
        </header>

        <div className="flex-1 flex flex-col container mx-auto px-4 py-8">
          {/* Content */}
          <div className="w-full mb-8 flex flex-col justify-center">
            <h1 className="text-3xl font-bold text-blue-800 mb-6">
              Welcome to Gokul Wholesale
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Your trusted partner for wholesale inventory management. Log in to browse products,
              place orders, and schedule deliveries.
            </p>

            <div className="bg-blue-50 rounded-lg p-6 border border-blue-100 mb-4">
              <h2 className="text-lg font-semibold text-blue-800 mb-2">Wholesale Business Solutions</h2>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  Easy inventory browsing
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  Streamlined order placement
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  Multiple delivery addresses
                </li>
                <li className="flex items-center">
                  <svg className="w-5 h-5 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  Order status tracking
                </li>
              </ul>
            </div>

            <div className="text-center text-gray-500 text-sm mt-8">
              <p>Need assistance? Contact us at: 630-540-9910</p>
              <p>Address: 1141 W Bryn Mawr Ave, Itasca, IL 60143</p>
            </div>
          </div>

          {/* Login form */}
          <div className="w-full">
            <Card className="shadow-lg border-t-4 border-t-blue-600">
              <CardHeader>
                <CardTitle className="text-2xl text-center">Sign In</CardTitle>
                <CardDescription className="text-center">
                  Enter your credentials to access your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      form.handleSubmit(onSubmit)(e);
                    }} 
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter your username" 
                              {...field} 
                              autoComplete="username"
                              className="py-6" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                {...field}
                                autoComplete="current-password"
                                className="py-6 pr-12"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full py-6 mt-4 text-lg bg-blue-600 hover:bg-blue-700" 
                      disabled={isLoggingIn}
                    >
                      {isLoggingIn ? "Logging in..." : "Sign In"}
                    </Button>

                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                      <div className="text-center">
                        <Button 
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          onClick={() => setShowPasswordReset(true)}
                        >
                          <KeyRound className="w-4 h-4 mr-2" />
                          Forgot Password?
                        </Button>
                      </div>
                      
                      <p className="text-center text-sm text-gray-600">
                        Don't have an account?
                      </p>
                      <Button asChild variant="outline" className="w-full py-6 text-lg">
                        <Link href="/create-account">Create Account</Link>
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>

        <footer className="py-4 bg-gray-50 border-t border-gray-200 mt-auto">
          <div className="container mx-auto px-4 text-center text-gray-500 text-sm">
            © {new Date().getFullYear()} Gokul Wholesale. All rights reserved.
          </div>
        </footer>
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:flex min-h-screen">
        {/* Left side - centered content with larger logo */}
        <div className="w-1/2 flex flex-col justify-center items-center bg-gradient-to-br from-blue-600 to-blue-800 text-white px-16">
          <div className="text-center max-w-lg">
            <div className="bg-white p-4 rounded-xl shadow-lg mb-8 mx-auto">
              <span className="text-3xl font-bold text-blue-600">Gokul Wholesale</span>
            </div>
            <h1 className="text-5xl font-bold mb-6">
              Welcome to<br />Gokul Wholesale
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              Your trusted partner for wholesale inventory management
            </p>

            <div className="bg-blue-700/50 rounded-lg p-8 backdrop-blur-sm border border-blue-400/30">
              <h2 className="text-2xl font-semibold mb-6">Business Solutions</h2>
              <ul className="space-y-4 text-lg">
                <li className="flex items-center">
                  <svg className="w-6 h-6 mr-3 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  Easy inventory browsing
                </li>
                <li className="flex items-center">
                  <svg className="w-6 h-6 mr-3 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  Streamlined order placement
                </li>
                <li className="flex items-center">
                  <svg className="w-6 h-6 mr-3 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  Multiple delivery addresses
                </li>
                <li className="flex items-center">
                  <svg className="w-6 h-6 mr-3 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  Order status tracking
                </li>
              </ul>
            </div>

            <div className="mt-8 text-blue-200 text-sm">
              <p>Need assistance? Contact us at: 630-540-9910</p>
              <p>1141 W Bryn Mawr Ave, Itasca, IL 60143</p>
            </div>
          </div>
        </div>

        {/* Right side - login form */}
        <div className="w-1/2 flex flex-col justify-center items-center bg-white px-16">
          <div className="w-full max-w-md">
            <Card className="shadow-2xl border-0">
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-3xl font-bold text-gray-800 mb-2">Sign In</CardTitle>
                <CardDescription className="text-lg text-gray-600">
                  Enter your credentials to access your account
                </CardDescription>
              </CardHeader>
              <CardContent className="px-8">
                <Form {...form}>
                  <form 
                    onSubmit={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      form.handleSubmit(onSubmit)(e);
                    }} 
                    className="space-y-6"
                  >
                    <FormField
                      control={form.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">Username</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Enter your username" 
                              {...field} 
                              autoComplete="username"
                              className="py-4 text-lg border-2 border-gray-200 focus:border-blue-500" 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input
                                type={showPassword ? "text" : "password"}
                                placeholder="Enter your password"
                                {...field}
                                autoComplete="current-password"
                                className="py-4 text-lg border-2 border-gray-200 focus:border-blue-500 pr-12"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                                onClick={() => setShowPassword(!showPassword)}
                              >
                                {showPassword ? (
                                  <EyeOff className="h-5 w-5" />
                                ) : (
                                  <Eye className="h-5 w-5" />
                                )}
                              </Button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button 
                      type="submit" 
                      className="w-full py-4 mt-8 text-lg font-semibold bg-blue-600 hover:bg-blue-700 transition-colors" 
                      disabled={isLoggingIn}
                    >
                      {isLoggingIn ? "Logging in..." : "Sign In"}
                    </Button>

                    <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
                      <div className="text-center">
                        <Button 
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          onClick={() => setShowPasswordReset(true)}
                        >
                          <KeyRound className="w-4 h-4 mr-2" />
                          Forgot Password?
                        </Button>
                      </div>
                      
                      <p className="text-center text-sm text-gray-600">
                        Don't have an account?
                      </p>
                      <Button asChild variant="outline" className="w-full py-4 text-lg">
                        <Link href="/create-account">Create Account</Link>
                      </Button>
                    </div>
                  </form>
                </Form>
              </CardContent>
              <CardFooter className="text-center pt-4 pb-8">
                <p className="text-sm text-gray-500">
                  © {new Date().getFullYear()} Gokul Wholesale. All rights reserved.
                </p>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Password Reset Dialog */}
      <PasswordResetDialog 
        open={showPasswordReset} 
        onOpenChange={setShowPasswordReset} 
      />
    </div>
  );
}