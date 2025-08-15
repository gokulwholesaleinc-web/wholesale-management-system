export type TenderType = 'CASH' | 'CARD' | 'OTHER';

export interface PosCartItem {
  sku: string;
  name: string;
  qty: number;            // integer
  unit_price: number;     // cents
  line_tax_rate: number;  // 0..1 (non-IL OTP tax)
  il_otp_cents?: number;  // explicit IL OTP (per-line), optional
}

export interface PosSale {
  id: string;             // POS-YYYYMMDD-XXXX
  store_id: string;
  register_id: string;
  created_at: string;
  cashier_id: string;
  items: PosCartItem[];
  subtotal: number;
  tax_il_otp: number;
  tax_other: number;
  discount: number;
  total: number;
  tenders: { type: TenderType; amount: number; ref?: string }[];
  change_due: number;
  customer_id?: string;
  note?: string;
}

export interface PosRegister {
  id: string;
  store_id: string;
  name: string;
  is_open: boolean;
  opening_float_cents: number;
  opened_at?: string;
  closed_at?: string;
  z_seq?: number;
}

export interface InventoryAdjustment {
  sku: string;
  delta: number; // negative on sale
  reason: 'POS_SALE' | 'POS_REFUND' | 'MANUAL';
  at: string;
}