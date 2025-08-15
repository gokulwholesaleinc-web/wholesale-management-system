import { v4 as uuid } from 'uuid';
import type { PosCartItem, PosSale, PosRegister, InventoryAdjustment } from '../../shared/pos-types';

export const POS_DB = {
  registers: new Map<string, PosRegister>(),
  sales: new Map<string, PosSale>(),
  inventory_ledger: [] as InventoryAdjustment[]
};

// TODO replace with your real catalog lookup
export async function lookupSku(sku: string) {
  return {
    sku,
    name: `Product ${sku}`,
    unit_price: 999,          // cents
    line_tax_rate: 0.10,      // generic 10%
    is_il_otp_item: sku.startsWith('TOB') || sku.includes('ECIG')
  };
}

export function computeIlOtp(items: PosCartItem[]) {
  let otp = 0;
  for (const it of items) {
    const base = it.qty * it.unit_price;
    // prefer explicit per-line OTP if provided
    const explicit = it.il_otp_cents ?? 0;
    otp += explicit;
    // infer 45% for OTP items if not explicitly passed
    if (!explicit && (it as any).is_il_otp_item) otp += Math.round(base * 0.45);
  }
  return otp;
}

export function computeTotals(items: PosCartItem[], discount = 0) {
  const subtotal = items.reduce((a, i) => a + i.qty * i.unit_price, 0);
  const tax_other = items.reduce((a, i) => a + Math.round(i.qty * i.unit_price * (i.line_tax_rate || 0)), 0);
  const tax_il_otp = computeIlOtp(items);
  const total = subtotal + tax_other + tax_il_otp - discount;
  return { subtotal, tax_other, tax_il_otp, total };
}

export async function recordInventory(items: PosCartItem[], reason: InventoryAdjustment['reason']) {
  const now = new Date().toISOString();
  for (const i of items) POS_DB.inventory_ledger.push({ sku: i.sku, delta: reason === 'POS_SALE' ? -i.qty : i.qty, reason, at: now });
}

export function openRegister(store_id: string, name: string, opening_float_cents: number) {
  const id = `REG-${(POS_DB.registers.size + 1).toString().padStart(2, '0')}`;
  const reg: PosRegister = { id, store_id, name, is_open: true, opening_float_cents, opened_at: new Date().toISOString(), z_seq: 0 };
  POS_DB.registers.set(id, reg);
  return reg;
}

export function closeRegister(id: string) {
  const reg = POS_DB.registers.get(id);
  if (!reg) throw new Error('Register not found');
  reg.is_open = false; reg.closed_at = new Date().toISOString();
  POS_DB.registers.set(id, reg);
  return reg;
}

export async function createSale(input: Omit<PosSale, 'id' | 'created_at' | 'change_due'>) {
  const id = `POS-${new Date().toISOString().slice(0,10).replace(/-/g,'')}-${uuid().slice(0,8).toUpperCase()}`;
  const sale: PosSale = { ...input, id, created_at: new Date().toISOString(), change_due: 0 };
  const paid = sale.tenders.reduce((a, t) => a + t.amount, 0);
  if (paid < sale.total - 1) throw new Error('Insufficient payment');
  sale.change_due = Math.max(0, paid - sale.total);
  await recordInventory(sale.items, 'POS_SALE');
  POS_DB.sales.set(sale.id, sale);
  return sale;
}