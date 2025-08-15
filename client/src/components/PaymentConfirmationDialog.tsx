import { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface PaymentConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (paymentData: {
    paymentMethod: string;
    checkNumber?: string;
    paymentNotes?: string;
  }) => void;
  orderTotal: number;
  orderNumber: number;
  customerId?: string;
  customerName?: string;
}

export default function PaymentConfirmationDialog({
  open,
  onClose,
  onConfirm,
  orderTotal,
  orderNumber,
  customerId,
  customerName,
}: PaymentConfirmationDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [checkNumber, setCheckNumber] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");

  // Fetch customer credit account when on_account is selected
  const { data: creditAccount } = useQuery({
    queryKey: ['/api/admin/customers', customerId, 'credit-account'],
    queryFn: () => apiRequest(`/api/admin/customers/${customerId}/credit-account`),
    enabled: !!(customerId && paymentMethod === 'on_account')
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentMethod) return;

    onConfirm({
      paymentMethod,
      checkNumber: paymentMethod === "check" ? checkNumber : undefined,
      paymentNotes: paymentNotes.trim() || undefined,
    });

    // Reset form
    setPaymentMethod("");
    setCheckNumber("");
    setPaymentNotes("");
  };

  const handleClose = () => {
    // Reset form when closing
    setPaymentMethod("");
    setCheckNumber("");
    setPaymentNotes("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Complete Order #{orderNumber}</DialogTitle>
          <DialogDescription>
            Please confirm the payment method for this order.
            <br />
            <strong>Total: ${orderTotal.toFixed(2)}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="payment-method">Payment Method *</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod} required>
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="electronic">Electronic Payment</SelectItem>
                <SelectItem value="on_account">On Account (Credit)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paymentMethod === "check" && (
            <div className="space-y-2">
              <Label htmlFor="check-number">Check Number *</Label>
              <Input
                id="check-number"
                type="text"
                value={checkNumber}
                onChange={(e) => setCheckNumber(e.target.value)}
                placeholder="Enter check number"
                required={paymentMethod === "check"}
                className="text-lg"
              />
            </div>
          )}

          {paymentMethod === "on_account" && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-blue-900">Credit Payment</span>
                <span className="text-blue-700 text-sm">Customer: {customerName || customerId}</span>
              </div>
              
              {creditAccount ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Current Balance:</span>
                    <span className={`font-semibold ${parseFloat(creditAccount.currentBalance || '0') >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${Math.abs(parseFloat(creditAccount.currentBalance || '0')).toFixed(2)} {parseFloat(creditAccount.currentBalance || '0') >= 0 ? 'Credit' : 'Debit'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Credit Limit:</span>
                    <span className="font-semibold text-blue-600">
                      ${parseFloat(creditAccount.creditLimit || '0').toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Order Total:</span>
                    <span className="font-semibold text-gray-900">${orderTotal.toFixed(2)}</span>
                  </div>
                  <hr className="border-blue-200" />
                  <div className="flex justify-between">
                    <span>New Balance After Order:</span>
                    <span className={`font-bold ${(parseFloat(creditAccount.currentBalance || '0') - orderTotal) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${Math.abs(parseFloat(creditAccount.currentBalance || '0') - orderTotal).toFixed(2)} {(parseFloat(creditAccount.currentBalance || '0') - orderTotal) >= 0 ? 'Credit' : 'Debit'}
                    </span>
                  </div>
                  
                  {parseFloat(creditAccount.creditLimit || '0') <= 0 && (
                    <div className="text-red-600 text-xs font-medium bg-red-50 p-2 rounded border border-red-200">
                      ⚠️ Credit account not set up. Contact admin to establish credit terms before using account payment.
                    </div>
                  )}
                  
                  {parseFloat(creditAccount.creditLimit || '0') > 0 && (parseFloat(creditAccount.currentBalance || '0') - orderTotal) < -(parseFloat(creditAccount.creditLimit || '0')) && (
                    <div className="text-red-600 text-xs font-medium bg-red-50 p-2 rounded border border-red-200">
                      ⚠️ This order would exceed the customer's credit limit by ${((parseFloat(creditAccount.currentBalance || '0') - orderTotal) + parseFloat(creditAccount.creditLimit || '0')).toFixed(2)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-gray-500 text-sm">Loading credit information...</div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="payment-notes">Payment Notes (Optional)</Label>
            <Textarea
              id="payment-notes"
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="Any additional payment details..."
              rows={3}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={
                !paymentMethod || 
                (paymentMethod === "check" && !checkNumber.trim()) ||
                (paymentMethod === "on_account" && (
                  !creditAccount || 
                  parseFloat(creditAccount.creditLimit || '0') <= 0 ||
                  (parseFloat(creditAccount.currentBalance || '0') - orderTotal) < -(parseFloat(creditAccount.creditLimit || '0'))
                ))
              }
              className="bg-green-600 hover:bg-green-700"
            >
              Complete Order
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}