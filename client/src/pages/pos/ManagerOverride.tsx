import React, { useState } from 'react';
import { Shield, AlertTriangle, Key, User, DollarSign, Clock, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface ManagerOverrideProps {
  isOpen: boolean;
  onClose: () => void;
  overrideType: 'price' | 'discount' | 'void' | 'return' | 'till_variance';
  originalValue?: number;
  newValue?: number;
  transactionId?: number;
  onApproved: (overrideData: any) => void;
}

export default function ManagerOverride({
  isOpen,
  onClose,
  overrideType,
  originalValue,
  newValue,
  transactionId,
  onApproved
}: ManagerOverrideProps) {
  const [managerUsername, setManagerUsername] = useState('');
  const [managerPassword, setManagerPassword] = useState('');
  const [reason, setReason] = useState('');
  const [attempts, setAttempts] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const overrideLabels = {
    price: 'Price Override',
    discount: 'Discount Override',
    void: 'Transaction Void',
    return: 'Return Override',
    till_variance: 'Till Variance Override'
  };

  const getImpactLevel = () => {
    if (!originalValue || !newValue) return 'medium';
    const difference = Math.abs(newValue - originalValue);
    if (difference < 10) return 'low';
    if (difference < 50) return 'medium';
    return 'high';
  };

  const requestOverrideMutation = useMutation({
    mutationFn: async (data: {
      overrideType: string;
      managerUsername: string;
      managerPassword: string;
      reason: string;
      originalValue?: number;
      newValue?: number;
      transactionId?: number;
    }) => {
      return await apiRequest('/api/pos/manager-override', 'POST', data);
    },
    onSuccess: (result) => {
      toast({
        title: "Override Approved",
        description: `${overrideLabels[overrideType]} has been authorized`,
      });
      onApproved(result);
      handleClose();
    },
    onError: (error) => {
      setAttempts(prev => prev + 1);
      if (attempts >= 2) {
        toast({
          title: "Access Denied",
          description: "Too many failed attempts. Please contact a manager.",
          variant: "destructive",
        });
        handleClose();
      } else {
        toast({
          title: "Authentication Failed",
          description: error.message || "Invalid manager credentials",
          variant: "destructive",
        });
      }
    },
  });

  const handleSubmit = () => {
    if (!managerUsername.trim()) {
      toast({
        title: "Username Required",
        description: "Please enter manager username",
        variant: "destructive",
      });
      return;
    }
    
    if (!managerPassword.trim()) {
      toast({
        title: "Password Required",
        description: "Please enter manager password",
        variant: "destructive",
      });
      return;
    }

    if (!reason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for this override",
        variant: "destructive",
      });
      return;
    }

    requestOverrideMutation.mutate({
      overrideType,
      managerUsername,
      managerPassword,
      reason,
      originalValue,
      newValue,
      transactionId,
    });
  };

  const handleClose = () => {
    setManagerUsername('');
    setManagerPassword('');
    setReason('');
    setAttempts(0);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-amber-600" />
            Manager Override Required
          </DialogTitle>
          <DialogDescription>
            This action requires manager authorization to proceed.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Override Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Override Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Type:</span>
                <Badge variant="outline">{overrideLabels[overrideType]}</Badge>
              </div>
              
              {originalValue !== undefined && newValue !== undefined && (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Original Value:</span>
                    <span className="text-sm">${originalValue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">New Value:</span>
                    <span className="text-sm font-semibold">${newValue.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Difference:</span>
                    <span className={`text-sm font-bold ${
                      newValue > originalValue ? 'text-red-600' : 'text-green-600'
                    }`}>
                      {newValue > originalValue ? '+' : ''}${(newValue - originalValue).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm font-medium">Impact Level:</span>
                    <Badge variant={
                      getImpactLevel() === 'high' ? 'destructive' :
                      getImpactLevel() === 'medium' ? 'default' : 'secondary'
                    }>
                      {getImpactLevel().toUpperCase()}
                    </Badge>
                  </div>
                </>
              )}

              {transactionId && (
                <div className="flex justify-between">
                  <span className="text-sm font-medium">Transaction ID:</span>
                  <span className="text-sm font-mono">#{transactionId}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Manager Authentication */}
          <div className="space-y-3">
            <Label htmlFor="managerUsername" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Manager Username
            </Label>
            <Input
              id="managerUsername"
              type="text"
              value={managerUsername}
              onChange={(e) => setManagerUsername(e.target.value)}
              placeholder="Enter manager username"
              autoComplete="username"
            />

            <Label htmlFor="managerPassword" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              Manager Password
            </Label>
            <Input
              id="managerPassword"
              type="password"
              value={managerPassword}
              onChange={(e) => setManagerPassword(e.target.value)}
              placeholder="Enter manager password"
              autoComplete="current-password"
            />

            <Label htmlFor="overrideReason">Reason for Override</Label>
            <Textarea
              id="overrideReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this override is necessary..."
              rows={3}
            />
          </div>

          {/* Attempt Counter */}
          {attempts > 0 && (
            <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">
                Authentication failed. {3 - attempts} attempts remaining.
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
              disabled={requestOverrideMutation.isPending}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              className="flex-1"
              disabled={requestOverrideMutation.isPending}
            >
              {requestOverrideMutation.isPending ? (
                <>
                  <Clock className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Authorize
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}