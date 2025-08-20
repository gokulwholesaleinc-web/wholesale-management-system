import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Mail, AlertCircle, CheckCircle2, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PasswordResetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PasswordResetDialog({ open, onOpenChange }: PasswordResetDialogProps) {
  const [loading, setLoading] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [channel, setChannel] = useState<"auto" | "email" | "sms">("auto");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const { toast } = useToast();

  const handleReset = () => {
    setIdentifier("");
    setChannel("auto");
    setMessage("");
    setError("");
    setLoading(false);
  };

  const handleRequestReset = async () => {
    if (!identifier.trim()) {
      setError("Please enter your email, username, or phone number");
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
        body: JSON.stringify({ identifier: identifier.trim(), channel }),
        credentials: 'include'
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`${response.status}: ${errorText}`);
      }

      const responseData = await response.json();

      const channelText = channel === "sms" ? "SMS" : channel === "email" ? "email" : "email/SMS";
      setMessage(`Password reset link sent! Check your ${channelText} for the reset link. The link expires in 15 minutes.`);
      
      toast({
        title: "Reset Link Sent",
        description: `Check your ${channelText} for the password reset link`,
        variant: "default"
      });

      // Auto-close after showing success message
      setTimeout(() => {
        onOpenChange(false);
        handleReset();
      }, 3000);

    } catch (error: any) {
      console.error("Password reset request failed:", error);
      setError("Failed to send reset link. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      handleReset();
    }
    onOpenChange(nextOpen);
  };

  const handleClose = () => {
    onOpenChange(false);
    handleReset();
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-blue-600" />
            Reset Password
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {message && (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="identifier">Email, Username, or Phone Number</Label>
            <Input
              id="identifier"
              placeholder="Enter your email, username, or phone number"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              disabled={loading}
              onKeyDown={(e) => e.key === 'Enter' && handleRequestReset()}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="channel">Delivery Method</Label>
            <Select value={channel} onValueChange={(value: "auto" | "email" | "sms") => setChannel(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select delivery method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <MessageSquare className="h-4 w-4" />
                    <span>Auto (Email preferred)</span>
                  </div>
                </SelectItem>
                <SelectItem value="email">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>Email Only</span>
                  </div>
                </SelectItem>
                <SelectItem value="sms">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    <span>SMS Only</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleRequestReset} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Send Reset Link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}