// Centralized helpers for credit/ledger math and formatting.
// Convention used across the app:
//   currentBalance > 0  => customer has store CREDIT
//   currentBalance < 0  => customer OWES money (debit)
//   "owed" is the positive amount owed: max(0, -currentBalance)

export function owedFromBalance(balance: number | null | undefined) {
  const b = typeof balance === 'number' ? balance : 0;
  return Math.max(0, -b);
}

export function availableFrom(
  limit: number | null | undefined,
  balance: number | null | undefined
) {
  const L = typeof limit === 'number' ? limit : 0;
  const owed = owedFromBalance(balance);
  // Available credit cannot be negative.
  return Math.max(0, L - owed);
}

export function isOverLimit(
  limit: number | null | undefined,
  balance: number | null | undefined
) {
  const L = typeof limit === 'number' ? limit : 0;
  const owed = owedFromBalance(balance);
  return owed > L;
}

export function fmtUSD(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
}

// Helper functions for balance display and coloring
export function balanceText(balance: number | null | undefined): string {
  const b = typeof balance === 'number' ? balance : 0;
  if (b >= 0) {
    return `${fmtUSD(b)} Credit`;
  } else {
    return `${fmtUSD(-b)} Owed`;
  }
}

export function balanceColor(balance: number | null | undefined): string {
  const b = typeof balance === 'number' ? balance : 0;
  return b >= 0 ? 'text-green-600' : 'text-red-600';
}

// Validation helper for payment amounts
export function validatePaymentAmount(
  amount: number,
  customerBalance: number | null | undefined,
  allowOverpayment: boolean = true
): { isValid: boolean; error?: string } {
  if (!Number.isFinite(amount) || amount <= 0) {
    return { isValid: false, error: 'Please enter a valid payment amount.' };
  }
  
  if (!allowOverpayment) {
    const owed = owedFromBalance(customerBalance);
    if (amount > owed) {
      return { 
        isValid: false, 
        error: `Payment amount cannot exceed owed amount of ${fmtUSD(owed)}.` 
      };
    }
  }
  
  return { isValid: true };
}

// --- Optional fixed-point helpers (recommended if backend supports "cents") ---
// Use these to keep all money as integers (cents) to avoid float rounding.
// export const toCents = (s: string) => Math.round(Number(s) * 100);
// export const fromCents = (cents: number) => (cents / 100);