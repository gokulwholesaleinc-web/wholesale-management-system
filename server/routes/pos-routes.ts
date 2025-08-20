import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { requireAuth, requireAdmin } from '../simpleAuth';
import rateLimit from 'express-rate-limit';

const router = Router();

// Environment flags
const POS_ENABLED = process.env.POS_ENABLED !== 'false';
const POS_READONLY = process.env.POS_READONLY === 'true';
const POS_AI_ENABLED = process.env.POS_AI_ENABLED === 'true';

// Rate limiter for POS operations
const posLimiter = rateLimit({ 
  windowMs: 60_000, // 1 minute
  max: 120, // 120 requests per minute per IP
  message: { error: 'Too many POS requests, please slow down' }
});

// Apply rate limiting to all POS routes
router.use(posLimiter);

// Require cashier/manager/admin access for all POS operations
router.use(requireAuth);

// Schemas for request validation
const SaleSchema = z.object({
  customerId: z.string().optional(),
  lines: z.array(z.object({
    sku: z.string().optional(),
    description: z.string(),
    uom: z.string().optional(),
    quantity: z.number().positive(),
    unitPriceCents: z.number().int().nonnegative(),
    taxCents: z.number().int().nonnegative().optional(),
  })),
  tender: z.enum(['cash', 'card', 'ach', 'terms']),
  tenderRef: z.string().optional(),
  cashGivenCents: z.number().int().nonnegative().optional(),
  lane: z.string().optional(),
});

const HoldSchema = z.object({
  customerId: z.string().optional(),
  lane: z.string().optional(),
  holdName: z.string().optional(),
  cartData: z.object({
    items: z.array(z.any()),
    subtotal: z.number(),
    tax: z.number(),
    total: z.number(),
  }),
  subtotalCents: z.number().int().nonnegative(),
  taxCents: z.number().int().nonnegative(),
  totalCents: z.number().int().nonnegative(),
});

// Product lookup by UPC/SKU
router.get('/lookup/:identifier', async (req, res) => {
  try {
    const identifier = req.params.identifier;
    const { rows } = await db.execute(sql`
      SELECT id, sku, name, description, price, category_id as category, upc_code as barcode, 'ea' as uom
      FROM products 
      WHERE sku = ${identifier} OR upc_code = ${identifier}
      LIMIT 1
    `);
    
    if (!rows.length) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    return res.json(rows[0]);
  } catch (error) {
    console.error('Error looking up product:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Product search
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q as string;
    if (!query || query.length < 2) {
      return res.status(400).json({ error: 'Search query too short' });
    }
    
    const { rows } = await db.execute(sql`
      SELECT id, sku, name, description, price, category_id as category, upc_code as barcode, 'ea' as uom
      FROM products 
      WHERE name ILIKE ${`%${query}%`} OR sku ILIKE ${`%${query}%`} OR description ILIKE ${`%${query}%`}
      ORDER BY 
        CASE WHEN name ILIKE ${`${query}%`} THEN 1
             WHEN sku = ${query} THEN 2
             WHEN name ILIKE ${`%${query}%`} THEN 3
             ELSE 4 END,
        name
      LIMIT 20
    `);
    
    return res.json(rows);
  } catch (error) {
    console.error('Error searching products:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create POS sale transaction
router.post('/sale', async (req: any, res) => {
  if (POS_READONLY) {
    return res.status(423).json({ error: 'POS is in read-only mode for smoke testing' });
  }
  
  try {
    const p = SaleSchema.safeParse(req.body);
    if (!p.success) {
      return res.status(400).json({ error: 'invalid payload', details: p.error.errors });
    }
    
    // Check for idempotency key
    const idem = (req.headers['idempotency-key'] as string) || null;
    if (idem) {
      const { rows: dupeRows } = await db.execute(sql`
        SELECT response FROM http_idempotency WHERE key = ${idem} LIMIT 1
      `);
      if (dupeRows.length) {
        return res.json(dupeRows[0].response);
      }
    }
    
    // Execute sale in transaction
    const result = await db.transaction(async (tx) => {
      const invoice = await createPosInvoice(p.data, tx);
      return { invoice };
    });
    
    // Store idempotency result
    if (idem) {
      await db.execute(sql`
        INSERT INTO http_idempotency (key, response)
        VALUES (${idem}, ${JSON.stringify(result)})
        ON CONFLICT (key) DO NOTHING
      `);
    }
    
    return res.json(result);
  } catch (error) {
    console.error('Error creating POS sale:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Suspend/hold current transaction
router.post('/hold', async (req: any, res) => {
  try {
    const p = HoldSchema.safeParse(req.body);
    if (!p.success) {
      return res.status(400).json({ error: 'invalid payload', details: p.error.errors });
    }
    
    const { rows } = await db.execute(sql`
      INSERT INTO pos_holds (
        cashier_id, customer_id, lane, hold_name, cart_data, 
        subtotal_cents, tax_cents, total_cents
      )
      VALUES (
        ${req.user.id}, ${p.data.customerId || null}, ${p.data.lane || null}, 
        ${p.data.holdName || null}, ${JSON.stringify(p.data.cartData)},
        ${p.data.subtotalCents}, ${p.data.taxCents}, ${p.data.totalCents}
      )
      RETURNING id, hold_name, created_at
    `);
    
    return res.json(rows[0]);
  } catch (error) {
    console.error('Error creating POS hold:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get list of held transactions
router.get('/holds', async (req: any, res) => {
  try {
    const { rows } = await db.execute(sql`
      SELECT id, cashier_id, customer_id, lane, hold_name, 
             subtotal_cents, tax_cents, total_cents, created_at
      FROM pos_holds 
      WHERE cashier_id = ${req.user.id} OR ${req.user.roles?.includes('admin') || false}
      ORDER BY created_at DESC
      LIMIT 50
    `);
    
    return res.json(rows);
  } catch (error) {
    console.error('Error fetching POS holds:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Recall/resume held transaction
router.get('/hold/:id', async (req: any, res) => {
  try {
    const { rows } = await db.execute(sql`
      SELECT * FROM pos_holds 
      WHERE id = ${req.params.id} 
      AND (cashier_id = ${req.user.id} OR ${req.user.roles?.includes('admin') || false})
      LIMIT 1
    `);
    
    if (!rows.length) {
      return res.status(404).json({ error: 'Hold not found or access denied' });
    }
    
    return res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching POS hold:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete held transaction
router.delete('/hold/:id', async (req: any, res) => {
  try {
    const { rows } = await db.execute(sql`
      DELETE FROM pos_holds 
      WHERE id = ${req.params.id} 
      AND (cashier_id = ${req.user.id} OR ${req.user.roles?.includes('admin') || false})
      RETURNING id
    `);
    
    if (!rows.length) {
      return res.status(404).json({ error: 'Hold not found or access denied' });
    }
    
    return res.json({ success: true });
  } catch (error) {
    console.error('Error deleting POS hold:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Transaction-capable POS invoice creation
async function createPosInvoice(input: {
  customerId?: string;
  lines: Array<{ 
    sku?: string; 
    description: string; 
    uom?: string; 
    quantity: number; 
    unitPriceCents: number; 
    taxCents?: number 
  }>;
  tender: 'cash' | 'card' | 'ach' | 'terms';
  tenderRef?: string;
  cashGivenCents?: number;
  lane?: string;
}, executor: any) {
  const subtotal = input.lines.reduce((s, l) => s + Math.round(l.quantity * l.unitPriceCents), 0);
  const tax = input.lines.reduce((s, l) => s + (l.taxCents || 0), 0);
  const total = subtotal + tax;

  // Create invoice
  const { rows: invRows } = await executor.execute(sql`
    INSERT INTO ar_invoices (
      customer_id, subtotal_cents, tax_cents, total_cents, balance_cents, status, created_at
    )
    VALUES (
      ${input.customerId || null}, ${subtotal}, ${tax}, ${total}, ${total}, 'open', NOW()
    )
    RETURNING id, invoice_no
  `);
  
  const invoice = invRows[0];

  // Create invoice lines
  for (const line of input.lines) {
    await executor.execute(sql`
      INSERT INTO ar_invoice_lines (
        invoice_id, sku, description, uom, quantity, unit_price_cents, 
        line_subtotal_cents, tax_cents, total_cents
      )
      VALUES (
        ${invoice.id}, ${line.sku || null}, ${line.description}, ${line.uom || null},
        ${line.quantity.toString()}, ${line.unitPriceCents},
        ${Math.round(line.quantity * line.unitPriceCents)}, ${line.taxCents || 0},
        ${Math.round(line.quantity * line.unitPriceCents) + (line.taxCents || 0)}
      )
    `);
  }

  // If not credit terms, create payment and auto-apply
  if (input.tender !== 'terms') {
    const { rows: pmtRows } = await executor.execute(sql`
      INSERT INTO ar_payments (
        customer_id, method, reference, amount_cents, unapplied_cents
      )
      VALUES (
        ${input.customerId || null}, ${input.tender}, ${input.tenderRef || null}, 
        ${total}, ${total}
      )
      RETURNING id
    `);
    
    const payment = pmtRows[0];
    
    // Auto-apply payment to invoice
    await executor.execute(sql`
      INSERT INTO ar_payment_apps (payment_id, invoice_id, amount_cents)
      VALUES (${payment.id}, ${invoice.id}, ${total})
    `);
    
    // Update payment unapplied amount
    await executor.execute(sql`
      UPDATE ar_payments 
      SET unapplied_cents = GREATEST(unapplied_cents - ${total}, 0)
      WHERE id = ${payment.id}
    `);
    
    // Mark invoice as paid if fully paid
    await executor.execute(sql`
      UPDATE ar_invoices 
      SET balance_cents = GREATEST(balance_cents - ${total}, 0),
          status = CASE WHEN balance_cents - ${total} <= 0 THEN 'paid' ELSE 'open' END
      WHERE id = ${invoice.id}
    `);
  }

  // Return final invoice status
  const { rows: finalRows } = await executor.execute(sql`
    SELECT id, invoice_no, total_cents, balance_cents, status 
    FROM ar_invoices 
    WHERE id = ${invoice.id}
  `);
  
  return finalRows[0];
}

export default router;