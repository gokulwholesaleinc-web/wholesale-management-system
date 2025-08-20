import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Lock, Shield, AlertTriangle } from 'lucide-react';

interface ManagerOverrideProps {
  isOpen: boolean;
  onClose: () => void;
  onApprove: (managerId: string, reason: string) => void;
  action: string;
  details?: string;
}

export default function ManagerOverride({ 
  isOpen, 
  onClose, 
  onApprove, 
  action, 
  details 
}: ManagerOverrideProps) {
  const [managerId, setManagerId] = useState('');
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!managerId || !password || !reason) {
      toast({
        title: "Missing Information",
        description: "Manager ID, password, and reason are required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Validate manager credentials
      const response = await fetch('/api/pos/manager-override', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify({
          managerId,
          password,
          action,
          reason,
          details
        })
      });

      if (response.ok) {
        const result = await response.json();
        if (result.approved) {
          onApprove(managerId, reason);
          toast({
            title: "Override Approved",
            description: `Manager ${managerId} approved: ${action}`,
          });
          resetForm();
          onClose();
        } else {
          toast({
            title: "Override Denied",
            description: result.message || "Invalid manager credentials",
            variant: "destructive",
          });
        }
      } else {
        throw new Error('Manager override request failed');
      }
    } catch (error) {
      console.error('Manager override error:', error);
      toast({
        title: "Override Failed",
        description: "Failed to process manager override",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setManagerId('');
    setPassword('');
    setReason('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-orange-600">
            <Shield className="h-5 w-5" />
            Manager Override Required
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-medium text-orange-800">Action Requires Authorization</h4>
                <p className="text-sm text-orange-700 mt-1">
                  <strong>Action:</strong> {action}
                </p>
                {details && (
                  <p className="text-sm text-orange-700">
                    <strong>Details:</strong> {details}
                  </p>
                )}
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="managerId">Manager ID</Label>
              <Input
                id="managerId"
                type="text"
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                placeholder="Enter manager ID"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter manager password"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Override</Label>
              <Input
                id="reason"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Enter reason for this override"
                required
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Lock className="h-4 w-4 mr-2 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Authorize
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}