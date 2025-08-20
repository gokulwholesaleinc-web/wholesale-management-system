import React from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, KeyRound, CheckCircle2, AlertCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function ResetPasswordPage() {
  const [, setLocation] = useLocation();
  const [token, setToken] = React.useState("");
  const [validating, setValidating] = React.useState(true);
  const [valid, setValid] = React.useState(false);
  const [error, setError] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [success, setSuccess] = React.useState(false);

  // grab token from querystring and check if SMS verification is needed
  React.useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const t = qs.get("token") || "";
    const fromSms = qs.get("sms") === "true";
    setToken(t);
    
    (async () => {
      try {
        const res = await fetch(`/api/auth/password-reset/validate?token=${encodeURIComponent(t)}`, { credentials: "include" });
        const data = await res.json();
        setValid(data.valid === true);
        setValidating(false);
        if (!data.valid) {
          setError("This reset link is invalid or has expired.");
        } else if (fromSms) {
          // Send SMS opt-out verification message when reset link came from SMS
          try {
            await apiRequest("POST", "/api/auth/sms-opt-out-verify", { token: t });
          } catch (smsError) {
            console.error("SMS opt-out verification failed:", smsError);
          }
        }
      } catch (e) {
        setValid(false);
        setValidating(false);
        setError("Could not validate reset link. Please request a new one.");
      }
    })();
  }, []);

  const handleSubmit = async () => {
    setError("");
    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiRequest("POST", "/api/auth/password-reset/complete", { token, newPassword });
      if (res.success) {
        setSuccess(true);
        setTimeout(() => setLocation("/login"), 1500);
      } else {
        setError(res.message || "Unable to complete password reset.");
      }
    } catch (e: any) {
      setError(e?.message || "Unable to complete password reset.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTokenPaste = (pastedToken: string) => {
    const cleanToken = pastedToken.trim();
    if (cleanToken) {
      setToken(cleanToken);
      setValidating(true);
      setValid(false);
      setError("");
      
      // Validate the pasted token
      (async () => {
        try {
          const res = await fetch(`/api/auth/password-reset/validate?token=${encodeURIComponent(cleanToken)}`, { credentials: "include" });
          const data = await res.json();
          setValid(data.valid === true);
          setValidating(false);
          if (!data.valid) setError("This reset token is invalid or has expired.");
        } catch (e) {
          setValid(false);
          setValidating(false);
          setError("Could not validate reset token. Please request a new one.");
        }
      })();
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-blue-600" />
            Reset your password
          </CardTitle>
          <CardDescription>
            {validating ? "Checking your reset link..." : valid ? "Enter a new password below." : "Invalid or expired link"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {validating && <div className="flex items-center justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" /></div>}
          
          {!validating && !valid && !token && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">Don't have a reset link? Paste your reset token here:</p>
              <div>
                <label className="text-sm font-medium">Reset Token</label>
                <Input
                  placeholder="Paste your reset token here"
                  onChange={(e) => handleTokenPaste(e.target.value)}
                />
              </div>
            </div>
          )}

          {!validating && valid && !success && (
            <>
              <div>
                <label className="text-sm font-medium">New Password</label>
                <Input
                  type="password"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Confirm Password</label>
                <Input
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                />
              </div>
              <Button className="w-full" onClick={handleSubmit} disabled={submitting}>
                {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</> : "Update Password"}
              </Button>
            </>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Password updated. Redirecting to login…
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}