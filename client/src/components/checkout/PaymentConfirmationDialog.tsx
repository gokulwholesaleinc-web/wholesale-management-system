import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { availableFrom, fmtUSD, owedFromBalance, validatePaymentAmount, balanceText, balanceColor } from '@/lib/credit';
import { AlertTriangle, CheckCircle, XCircle, Shield } from 'lucide-react';

interface PaymentConfirmationDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (paymentData: {
    paymentMethod: 'cash' | 'check' | 'electronic' | 'on_account';
    checkNumber?: string;
    paymentNotes?: string;
    managerOverride?: boolean;
  }) => void;
  orderTotal: number;
  orderNumber: number;
  customerId?: string;
  customerName?: string;
  isManager?: boolean; // For manager override capability
}

export default function PaymentConfirmationDialog({
  open,
  onClose,
  onConfirm,
  orderTotal,
  orderNumber,
  customerId,
  customerName,
  isManager = false,
}: PaymentConfirmationDialogProps) {
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'check' | 'electronic' | 'on_account' | ''>('');
  const [checkNumber, setCheckNumber] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [managerOverride, setManagerOverride] = useState(false);

  const { data: creditAccount, isLoading: creditLoading, error: creditError } = useQuery({
    queryKey: ['/api/admin/customers', customerId, 'credit-account'],
    queryFn: () => apiRequest(`/api/admin/customers/${customerId}/credit-account`),
    enabled: !!(customerId && paymentMethod === 'on_account'),
  });

  // Auto-populate payment notes based on method
  useEffect(() => {
    if (paymentMethod === 'check' && checkNumber.trim()) {
      setPaymentNotes(`Check #${checkNumber.trim()}`);
    } else if (paymentMethod === 'electronic') {
      setPaymentNotes('Electronic payment processed');
    } else if (paymentMethod === 'cash') {
      setPaymentNotes('Cash payment received');
    } else if (paymentMethod === 'on_account' && customerName) {
      setPaymentNotes(`On account payment for ${customerName}`);
    }
  }, [paymentMethod, checkNumber, customerName]);

  // Auto-select on_account if customer has sufficient credit
  useEffect(() => {
    if (paymentMethod === '' && creditAccount && customerId) {
      const available = availableFrom(creditAccount.creditLimit, creditAccount.currentBalance);
      if (available >= orderTotal) {
        setPaymentMethod('on_account');
      }
    }
  }, [creditAccount, paymentMethod, orderTotal, customerId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentMethod) return;
    
    onConfirm({
      paymentMethod,
      checkNumber: paymentMethod === 'check' ? checkNumber : undefined,
      paymentNotes: paymentNotes.trim() || undefined,
      managerOverride: managerOverride || undefined,
    });
    
    // Reset form
    setPaymentMethod('');
    setCheckNumber('');
    setPaymentNotes('');
    setManagerOverride(false);
  };

  const handleClose = () => {
    setPaymentMethod('');
    setCheckNumber('');
    setPaymentNotes('');
    setManagerOverride(false);
    onClose();
  };

  const handlePaymentMethodChange = (value: string) => {
    setPaymentMethod(value as any);
    setManagerOverride(false); // Reset override when changing methods
  };

  // Credit calculations
  const limit = Number(creditAccount?.creditLimit ?? 0);
  const balance = Number(creditAccount?.currentBalance ?? 0);
  const newBalance = balance - orderTotal;
  const available = availableFrom(limit, balance);
  const exceedBy = Math.max(0, owedFromBalance(newBalance) - limit);
  const wouldExceedLimit = exceedBy > 0;

  // Payment validation
  const validation = validatePaymentAmount(orderTotal, balance, false);
  
  // Determine if on_account should be disabled
  const onAccountDisabled = !customerId || limit <= 0 || (wouldExceedLimit && !managerOverride);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Complete Order #{orderNumber}
          </DialogTitle>
          <DialogDescription>
            Please confirm the payment method for this order.
            <br />
            <strong className="text-lg">Total: {fmtUSD(orderTotal)}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="payment-method">Payment Method *</Label>
            <Select value={paymentMethod} onValueChange={handlePaymentMethodChange} required>
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">💵 Cash</SelectItem>
                <SelectItem value="check">📋 Check</SelectItem>
                <SelectItem value="electronic">💳 Electronic Payment</SelectItem>
                <SelectItem 
                  value="on_account" 
                  disabled={onAccountDisabled}
                >
                  🏦 On Account (Credit) {onAccountDisabled && !customerId ? '- No Customer' : onAccountDisabled && limit <= 0 ? '- No Credit Limit' : ''}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {paymentMethod === 'check' && (
            <div className="space-y-2">
              <Label htmlFor="check-number">Check Number *</Label>
              <Input 
                id="check-number" 
                type="text" 
                value={checkNumber} 
                onChange={(e) => setCheckNumber(e.target.value)} 
                placeholder="Enter check number" 
                required 
              />
            </div>
          )}

          {paymentMethod === 'on_account' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-blue-900 flex items-center gap-2">
                  🏦 Credit Payment
                </span>
                <span className="text-blue-700 text-sm">
                  Customer: {customerName || customerId}
                </span>
              </div>

              {creditLoading && (
                <div className="text-gray-500 text-sm flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  Loading credit information...
                </div>
              )}

              {creditError && (
                <Alert className="border-red-200 bg-red-50">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    Failed to load credit information. Please try a different payment method.
                  </AlertDescription>
                </Alert>
              )}

              {creditAccount && !creditLoading && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Current Balance:</span>
                    <span className={`font-semibold ${balanceColor(balance)}`}>
                      {balanceText(balance)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Credit Limit:</span>
                    <span className="font-semibold text-blue-600">{fmtUSD(limit)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Available Before Order:</span>
                    <span className="font-semibold text-green-700">{fmtUSD(available)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Order Total:</span>
                    <span className="font-semibold text-gray-900">{fmtUSD(orderTotal)}</span>
                  </div>
                  <hr className="border-blue-200" />
                  <div className="flex justify-between">
                    <span>New Balance After Order:</span>
                    <span className={`font-bold ${balanceColor(newBalance)}`}>
                      {balanceText(newBalance)}
                    </span>
                  </div>

                  {wouldExceedLimit && (
                    <Alert className="border-orange-200 bg-orange-50">
                      <AlertTriangle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800">
                        <strong>Credit Limit Warning:</strong> This order would exceed the customer's credit limit by {fmtUSD(exceedBy)}.
                        {isManager && (
                          <div className="mt-2 flex items-center gap-2">
                            <Switch
                              id="manager-override"
                              checked={managerOverride}
                              onCheckedChange={setManagerOverride}
                            />
                            <Label htmlFor="manager-override" className="text-sm flex items-center gap-1">
                              <Shield className="h-3 w-3" />
                              Manager Override
                            </Label>
                          </div>
                        )}
                      </AlertDescription>
                    </Alert>
                  )}

                  {!validation.isValid && (
                    <Alert className="border-red-200 bg-red-50">
                      <XCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800">
                        {validation.error}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="payment-notes">Payment Notes</Label>
            <Textarea 
              id="payment-notes" 
              value={paymentNotes} 
              onChange={(e) => setPaymentNotes(e.target.value)} 
              placeholder="Payment details will be auto-filled based on method..." 
              rows={3} 
            />
            <p className="text-xs text-gray-500">
              Notes are automatically populated based on your payment method selection.
            </p>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                !paymentMethod ||
                (paymentMethod === 'check' && !checkNumber.trim()) ||
                (paymentMethod === 'on_account' && (
                  creditLoading || 
                  !!creditError ||
                  !creditAccount || 
                  limit <= 0 || 
                  (wouldExceedLimit && !managerOverride)
                ))
              }
              className="bg-green-600 hover:bg-green-700"
            >
              {paymentMethod === 'on_account' && creditLoading ? (
                <>
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  Loading...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Complete Order
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}