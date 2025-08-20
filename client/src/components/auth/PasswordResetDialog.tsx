import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, AlertCircle, CheckCircle2, Key } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface PasswordResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PasswordResetDialog({ open, onOpenChange }: PasswordResetDialogProps) {
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [loading, setLoading] = useState(false);
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { toast } = useToast();

  const handleReset = () => {
    setStep('request');
    setEmailOrUsername("");
    setTempPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setMessage("");
    setError("");
    setLoading(false);
  };

  const handleRequestReset = async () => {
    if (!emailOrUsername.trim()) {
      setError("Please enter your email or username");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Use direct fetch for public endpoint to avoid adding auth headers
      const response = await fetch('/api/auth/password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ emailOrUsername: emailOrUsername.trim() }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }

      const responseData = await response.json();

      setMessage("Password reset email sent! Please check your inbox for the temporary password.");
      setStep('reset');
      
      toast({
        title: "Reset Email Sent",
        description: "Check your email for the temporary password",
        variant: "default"
      });

    } catch (error: any) {
      console.error("Password reset request failed:", error);
      setError("Failed to send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteReset = async () => {
    if (!tempPassword.trim()) {
      setError("Please enter the temporary password from your email");
      return;
    }

    if (!newPassword.trim()) {
      setError("Please enter a new password");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Use direct fetch for public endpoint to avoid adding auth headers
      const response = await fetch('/api/auth/complete-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: emailOrUsername.trim(),
          tempPassword: tempPassword.trim(),
          newPassword: newPassword.trim(),
          confirmPassword: confirmPassword.trim()
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }

      const responseData = await response.json();

      if (responseData.success) {
        toast({
          title: "Password Updated",
          description: "You can now log in with your new password",
          variant: "default"
        });
        
        setMessage("Password successfully updated! You can now log in with your new password.");
        
        // Close dialog after a short delay
        setTimeout(() => {
          onOpenChange(false);
          handleReset();
        }, 2000);
      } else {
        setError(responseData.message || "Failed to update password");
      }

    } catch (error: any) {
      console.error("Password reset completion failed:", error);
      setError(error.message || "Failed to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    handleReset();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {step === 'request' ? (
              <>
                <Mail className="h-5 w-5 text-blue-600" />
                Reset Password
              </>
            ) : (
              <>
                <Key className="h-5 w-5 text-green-600" />
                Set New Password
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {step === 'request'
              ? "Enter your email or username to receive a temporary password"
              : "Enter the temporary password from your email and create a new password"
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {step === 'request' ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="emailOrUsername">Email or Username</Label>
                <Input
                  id="emailOrUsername"
                  type="text"
                  placeholder="Enter your email or username"
                  value={emailOrUsername}
                  onChange={(e) => setEmailOrUsername(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleRequestReset()}
                  disabled={loading}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="tempPassword">Temporary Password</Label>
                <Input
                  id="tempPassword"
                  type="text"
                  placeholder="Enter temporary password from email"
                  value={tempPassword}
                  onChange={(e) => setTempPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password (min 8 characters)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={loading}
                />
              </div>
              
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleCompleteReset()}
                  disabled={loading}
                />
              </div>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {message && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{message}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          
          {step === 'request' ? (
            <Button onClick={handleRequestReset} disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Reset Email
            </Button>
          ) : (
            <>
              <Button 
                variant="outline" 
                onClick={() => setStep('request')} 
                disabled={loading}
              >
                Back
              </Button>
              <Button onClick={handleCompleteReset} disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Update Password
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}