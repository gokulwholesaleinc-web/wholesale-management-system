export type OrderStatus =
  | 'NEW'
  | 'PAID'
  | 'PACKED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED'
  | 'ON_HOLD'
  | 'RETURN_REQUESTED';

export interface OrderItem {
  id: string;
  sku: string;
  name: string;
  qty: number;
  unit_price: number;      // in cents
  line_tax_rate: number;   // 0..1
}

export interface Payment {
  id: string;
  provider: string;
  external_id?: string;
  amount: number; // in cents (+charge, -refund)
  type: 'charge' | 'refund';
  status: 'succeeded' | 'failed' | 'pending';
  created_at: string;
}

export interface Shipment {
  id: string;
  carrier: string;
  service: string;
  tracking?: string;
  label_url?: string;
  weight_oz?: number;
  cost?: number; // in cents
  created_at: string;
}

export interface Order {
  id: string;
  channel?: string;
  currency: 'USD';
  customer_id: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;

  items: OrderItem[];
  subtotal: number;     // cents (computed)
  tax_il_otp: number;   // cents (explicit)
  tax_other: number;    // cents
  shipping: number;     // cents
  discount: number;     // cents
  total: number;        // cents
  paid: number;         // cents
  balance: number;      // cents

  status: OrderStatus;
  created_at: string;
  updated_at: string;

  shipments?: Shipment[];
  payments?: Payment[];
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  from_status: OrderStatus;
  to_status: OrderStatus;
  actor_id: string;
  reason?: string;
  created_at: string;
}

/**
 * Your PDF generator must ALWAYS render the text:
 * "45% IL TOBACCO TAX PAID"
 * even when tax_il_otp === 0 (to satisfy compliance).
 *
 * Make sure layout avoids overlap for SKUs, loyalty points, and tax description.
 * Source totals ONLY from server `recalc()` (do not compute on client).
 */