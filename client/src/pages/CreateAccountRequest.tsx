import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ArrowLeft, Building, Send } from "lucide-react";

// Validation schema
const accountRequestSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  contactFirstName: z.string().min(1, "First name is required"),
  contactLastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email is required"),
  phone: z.string().min(10, "Primary phone number is required"),
  businessPhone: z.string().optional(),
  feinNumber: z.string().optional(),
  requestedUsername: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  businessType: z.array(z.string()).optional().default([]),
  businessAddress: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  stateTaxId: z.string().optional(),
  tobaccoLicense: z.string().optional(),
  businessDescription: z.string().optional(),
  privacyPolicyAgreement: z.boolean().refine(val => val === true, {
    message: "You must agree to the Privacy Policy to continue"
  }),
  // SMS and Email consent fields
  emailNotifications: z.boolean().default(false),
  smsNotifications: z.boolean().default(false),
  transactionalSmsConsent: z.boolean().default(false),
  marketingSmsConsent: z.boolean().default(false),
});

type AccountRequestForm = z.infer<typeof accountRequestSchema>;

export default function CreateAccountRequest() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<AccountRequestForm>({
    resolver: zodResolver(accountRequestSchema),
    defaultValues: {
      businessName: "",
      contactFirstName: "",
      contactLastName: "",
      email: "",
      phone: "",
      businessPhone: "",
      feinNumber: "",
      requestedUsername: "",
      password: "",
      businessType: [],
      businessAddress: "",
      city: "",
      state: "",
      postalCode: "",
      stateTaxId: "",
      tobaccoLicense: "",
      businessDescription: "",
      privacyPolicyAgreement: false,
      // SMS and Email consent defaults
      emailNotifications: false,
      smsNotifications: false,
      transactionalSmsConsent: false,
      marketingSmsConsent: false,
    },
  });

  const createRequestMutation = useMutation({
    mutationFn: async (data: AccountRequestForm) => {
      // Clean up multiline text fields to prevent JSON parsing errors
      const cleanData = {
        ...data,
        businessDescription: data.businessDescription ? data.businessDescription.replace(/\r?\n/g, ' ').trim() : ""
      };
      
      console.log('Sending account request data:', cleanData);
      
      return apiRequest("/api/account-requests", {
        method: "POST",
        body: cleanData, // Let apiRequest handle JSON.stringify
      });
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Account Request Submitted",
        description: "Your account request has been submitted successfully. You will be contacted once it's reviewed.",
      });
    },
    onError: (error: any) => {
      console.error('=== ACCOUNT CREATION ERROR DEBUG ===');
      console.error('Raw error object:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error?.message);
      console.error('Error stack:', error?.stack);
      
      // Enhanced error debugging
      if (error?.response) {
        console.error('HTTP Response:', error.response);
        console.error('Response status:', error.response?.status);
        console.error('Response data:', error.response?.data);
      }
      
      // Parse error response for better user feedback
      let errorMessage = "Failed to submit account request";
      let errorTitle = "Error";
      let debugInfo = "";
      
      if (error?.error) {
        errorMessage = error.error;
        debugInfo = `Server error: ${error.error}`;
        
        // Customize title based on error type
        if (error.missing_fields || error.invalid_fields) {
          errorTitle = "Form Validation Error";
          debugInfo += ` | Missing/Invalid fields: ${JSON.stringify(error.missing_fields || error.invalid_fields)}`;
        } else if (error.conflict_fields) {
          errorTitle = "Duplicate Information";
          debugInfo += ` | Conflict fields: ${JSON.stringify(error.conflict_fields)}`;
        }
      } else if (error?.message) {
        errorMessage = error.message;
        debugInfo = `Client error: ${error.message}`;
        
        // Check for specific error patterns
        if (error.message.includes('JSON')) {
          debugInfo += " | JSON parsing issue detected";
        } else if (error.message.includes('401')) {
          debugInfo += " | Authentication issue";
        } else if (error.message.includes('400')) {
          debugInfo += " | Bad request - check form data";
        } else if (error.message.includes('500')) {
          debugInfo += " | Server error";
        }
      } else {
        debugInfo = "Unknown error - no error message available";
      }
      
      console.error('Processed error info:', { errorTitle, errorMessage, debugInfo });
      
      // Log validation errors to console for debugging
      if (error?.validation_errors) {
        console.error('Validation errors:', error.validation_errors);
      }
      
      // Log form data that was being submitted
      console.error('Form data being submitted:', form.getValues());
      console.error('=== END ACCOUNT CREATION ERROR DEBUG ===');
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
        duration: 8000, // Show longer for detailed error messages
      });
    },
  });

  const onSubmit = (data: AccountRequestForm) => {
    createRequestMutation.mutate(data);
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <Send className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-800">Request Submitted</CardTitle>
            <CardDescription>
              Thank you for your interest in Gokul Wholesale. Your account request has been submitted successfully.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-gray-600">
              <p>Our team will review your application and contact you within 1-2 business days.</p>
              <p className="mt-2">You will receive an email confirmation once your account is approved.</p>
            </div>
            <Button asChild className="w-full">
              <Link href="/">
                Return to Home
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <img 
                src="/gokul-logo.png" 
                alt="Gokul Wholesale Logo" 
                className="h-10 w-10 object-contain"
              />
              <span className="ml-2 text-xl font-bold text-gray-900">Gokul Wholesale</span>
            </div>
            <Button asChild variant="ghost">
              <Link href="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Home
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <Building className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Account Request</h1>
            <p className="text-lg text-gray-600">
              Submit your business information to request a wholesale account
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>
                Please provide accurate business information. All fields marked with * are required.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="businessName"
                      render={({ field }) => (
                        <FormItem className="md:col-span-2">
                          <FormLabel>Business Name *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Your Business Name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactFirstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact First Name *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="John" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="contactLastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Contact Last Name *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Doe" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email *</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="john@company.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="flex items-center gap-2">
                            Cell Phone Number *
                            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                              SMS Notifications
                            </span>
                          </FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="(555) 123-4567 - For SMS notifications" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="businessPhone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Phone Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="(555) 123-4567 - Business/landline (optional)" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="feinNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>FEIN Number</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="12-3456789 (optional)" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="requestedUsername"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Requested Username *</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Choose a username" />
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
                          <FormLabel>Password *</FormLabel>
                          <FormControl>
                            <Input {...field} type="password" placeholder="Enter a secure password" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="businessType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Type (Select all that apply)</FormLabel>
                          <div className="space-y-3">
                            {[
                              { value: "retail", label: "Retail Store" },
                              { value: "convenience", label: "Convenience Store" },
                              { value: "gas-station", label: "Gas Station" },
                              { value: "restaurant", label: "Restaurant" },
                              { value: "liquor-store", label: "Liquor Store" },
                              { value: "smoke-shop", label: "Smoke Shop" },
                              { value: "distributor", label: "Distributor" },
                              { value: "other", label: "Other" }
                            ].map((businessType) => (
                              <div key={businessType.value} className="flex items-center space-x-2">
                                <Checkbox
                                  id={businessType.value}
                                  checked={field.value?.includes(businessType.value) || false}
                                  onCheckedChange={(checked) => {
                                    const currentValues = field.value || [];
                                    if (checked) {
                                      field.onChange([...currentValues, businessType.value]);
                                    } else {
                                      field.onChange(currentValues.filter((value) => value !== businessType.value));
                                    }
                                  }}
                                />
                                <label
                                  htmlFor={businessType.value}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                  {businessType.label}
                                </label>
                              </div>
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="businessAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Address</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="123 Main St" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>City</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Chicago" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="IL" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Postal Code</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="60601" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="stateTaxId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>State Tax ID</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Optional" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="tobaccoLicense"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tobacco License</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Optional" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>



                    <FormField
                      control={form.control}
                      name="businessDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Business Description</FormLabel>
                          <FormControl>
                            <Textarea 
                              {...field} 
                              placeholder="Tell us about your business, number of locations, years in operation, etc."
                              rows={4}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Communication Consent Section */}
                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h3 className="text-lg font-semibold mb-3 text-blue-900">Communication Preferences</h3>
                      <p className="text-sm text-blue-800 mb-4">
                        Choose how you'd like to receive notifications from Gokul Wholesale. You can change these preferences anytime.
                      </p>

                      {/* Email Notifications */}
                      <FormField
                        control={form.control}
                        name="emailNotifications"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 mb-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-medium">
                                Email Notifications
                              </FormLabel>
                              <p className="text-xs text-muted-foreground">
                                Receive order confirmations, updates, and account information via email
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />

                      {/* SMS Notifications */}
                      <FormField
                        control={form.control}
                        name="smsNotifications"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 mb-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-medium">
                                SMS Text Notifications
                              </FormLabel>
                              <p className="text-xs text-muted-foreground">
                                By opting in, you agree to receive <strong>informational/marketing/customer care</strong> (adjust per their use-case) related text messages from <strong>Gokul Wholesale, Inc</strong>. You may receive up to <strong>4 messages</strong> per month/week. Reply STOP to unsubscribe. Message and data rates may apply. Message frequency varies.
                              </p>
                            </div>
                          </FormItem>
                        )}
                      />

                      {/* SMS Consent Types - Always visible, disabled when SMS is not enabled */}
                      <div className={`ml-6 space-y-3 border-l-2 pl-4 transition-opacity ${form.watch("smsNotifications") ? 'border-blue-200 opacity-100' : 'border-gray-200 opacity-60'}`}>
                        <FormField
                          control={form.control}
                          name="transactionalSmsConsent"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={!form.watch("smsNotifications")}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className={`text-sm font-medium ${!form.watch("smsNotifications") ? 'text-gray-400' : ''}`}>
                                  Order & Account Updates
                                </FormLabel>
                                <p className={`text-xs ${!form.watch("smsNotifications") ? 'text-gray-400' : 'text-muted-foreground'}`}>
                                  Receive important transactional messages about your orders, deliveries, and account status. Reply STOP to opt out.
                                </p>
                              </div>
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="marketingSmsConsent"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                  disabled={!form.watch("smsNotifications")}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className={`text-sm font-medium ${!form.watch("smsNotifications") ? 'text-gray-400' : ''}`}>
                                  Promotions & Special Offers
                                </FormLabel>
                                <p className={`text-xs ${!form.watch("smsNotifications") ? 'text-gray-400' : 'text-muted-foreground'}`}>
                                  Marketing messages with deals, discounts, and promotional offers from Gokul Wholesale, Inc. Up to 2 messages per month. Reply STOP to unsubscribe.
                                </p>
                              </div>
                            </FormItem>
                          )}
                        />

                        <div className={`text-xs mt-3 p-2 rounded transition-colors ${form.watch("smsNotifications") ? 'text-blue-700 bg-blue-100' : 'text-gray-500 bg-gray-100'}`}>
                          <p className="font-medium mb-1">SMS Terms:</p>
                          <ul className="space-y-1">
                            <li>• <strong>Reply STOP to unsubscribe</strong></li>
                            <li>• Message frequency: Up to 4 messages per month</li>
                            <li>• Message and data rates may apply</li>
                            <li>• Reply HELP for assistance</li>
                          </ul>
                          <p className="mt-2 font-medium">
                            By opting in, you consent to receive informational/marketing/customer care text messages from Gokul Wholesale, Inc.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Privacy Policy Agreement */}
                  <FormField
                    control={form.control}
                    name="privacyPolicyAgreement"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            I agree to the{" "}
                            <Link href="/privacy-policy" className="text-blue-600 hover:text-blue-800 underline">
                              Privacy Policy
                            </Link>{" "}
                            and Terms of Service *
                          </FormLabel>
                          <FormMessage />
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-4">
                    <Button type="button" variant="outline" asChild>
                      <Link href="/">Cancel</Link>
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createRequestMutation.isPending}
                      className="min-w-[120px]"
                    >
                      {createRequestMutation.isPending ? "Submitting..." : "Submit Request"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}