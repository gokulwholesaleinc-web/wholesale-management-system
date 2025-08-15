import { Router } from 'express';
import { z } from 'zod';
import type { PosCartItem, PosSale, PosRegister } from '../../shared/pos-types';
import { 
  POS_DB, 
  lookupSku, 
  computeTotals, 
  openRegister, 
  closeRegister, 
  createSale,
  recordInventory 
} from '../services/pos-db';
import { getCurrentPosRegister, getPosStatistics } from '../services/pos-manager';

const router = Router();

// Register Management
router.get('/register/status', (_req, res) => {
  const register = getCurrentPosRegister();
  res.json({ data: register });
});

router.post('/register/open', (req, res) => {
  const schema = z.object({
    store_id: z.string(),
    name: z.string(),
    opening_float_cents: z.number()
  });
  
  const { store_id, name, opening_float_cents } = schema.parse(req.body);
  const register = openRegister(store_id, name, opening_float_cents);
  res.json({ data: register });
});

router.post('/register/close', (req, res) => {
  const schema = z.object({
    register_id: z.string()
  });
  
  const { register_id } = schema.parse(req.body);
  const register = closeRegister(register_id);
  res.json({ data: register });
});

// Product Lookup
router.get('/products/:sku', async (req, res) => {
  try {
    const { sku } = req.params;
    const product = await lookupSku(sku);
    res.json({ data: product });
  } catch (error) {
    res.status(404).json({ error: 'Product not found' });
  }
});

// Sales Management
router.post('/sales', async (req, res) => {
  try {
    const saleSchema = z.object({
      store_id: z.string(),
      register_id: z.string(),
      cashier_id: z.string(),
      items: z.array(z.object({
        sku: z.string(),
        name: z.string(),
        qty: z.number(),
        unit_price: z.number(),
        line_tax_rate: z.number(),
        il_otp_cents: z.number().optional()
      })),
      discount: z.number().default(0),
      tenders: z.array(z.object({
        type: z.enum(['CASH', 'CARD', 'OTHER']),
        amount: z.number(),
        ref: z.string().optional()
      })),
      customer_id: z.string().optional(),
      note: z.string().optional()
    });
    
    const saleData = saleSchema.parse(req.body);
    const totals = computeTotals(saleData.items, saleData.discount);
    
    const saleInput = {
      ...saleData,
      ...totals
    };
    
    const sale = await createSale(saleInput);
    res.json({ data: sale });
  } catch (error) {
    console.error('Sale creation error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Failed to create sale' });
  }
});

router.get('/sales', (_req, res) => {
  const sales = Array.from(POS_DB.sales.values())
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  res.json({ data: sales });
});

router.get('/sales/:id', (req, res) => {
  const { id } = req.params;
  const sale = POS_DB.sales.get(id);
  if (!sale) {
    return res.status(404).json({ error: 'Sale not found' });
  }
  res.json({ data: sale });
});

// Inventory Management
router.get('/inventory', (_req, res) => {
  res.json({ data: POS_DB.inventory_ledger });
});

router.post('/inventory/adjust', async (req, res) => {
  const schema = z.object({
    sku: z.string(),
    delta: z.number(),
    reason: z.enum(['POS_SALE', 'POS_REFUND', 'MANUAL'])
  });
  
  const { sku, delta, reason } = schema.parse(req.body);
  const adjustment = {
    sku,
    delta,
    reason,
    at: new Date().toISOString()
  };
  
  POS_DB.inventory_ledger.push(adjustment);
  res.json({ data: adjustment });
});

// Statistics and Reports
router.get('/stats', (_req, res) => {
  const stats = getPosStatistics();
  res.json({ data: stats });
});

router.get('/reports/daily/:date', (req, res) => {
  const { date } = req.params;
  const sales = Array.from(POS_DB.sales.values())
    .filter(s => s.created_at.startsWith(date));
    
  const totalRevenue = sales.reduce((sum, s) => sum + s.total, 0);
  const totalTax = sales.reduce((sum, s) => sum + s.tax_il_otp + s.tax_other, 0);
  const totalIlOtp = sales.reduce((sum, s) => sum + s.tax_il_otp, 0);
  
  res.json({
    data: {
      date,
      sales_count: sales.length,
      total_revenue: totalRevenue,
      total_tax: totalTax,
      il_otp_tax: totalIlOtp,
      sales
    }
  });
});

// Health Check
router.get('/health', (_req, res) => {
  const registers = POS_DB.registers.size;
  const sales = POS_DB.sales.size;
  const inventory_entries = POS_DB.inventory_ledger.length;
  
  res.json({
    ok: true,
    system: 'POS',
    store_id: process.env.POS_STORE_ID || 'ITASCA',
    register_id: process.env.POS_REGISTER_ID || 'REG-01',
    stats: { registers, sales, inventory_entries }
  });
});

export default router;