import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { requireAuth, requireAdmin } from '../simpleAuth';

const router = Router();

const MAX_LIMIT_CENTS = 100_000 * 100; // $100k max

// Security: All credit routes require admin access
router.use(requireAdmin);

// Get unified credit payload for a customer
router.get('/:customerId', async (req, res) => {
  try {
    const id = String(req.params.customerId);
    const { rows } = await db.execute(sql`SELECT * FROM customer_credit_unified WHERE customer_id = ${id}`);
    if (!rows.length) return res.status(404).json({ error: 'customer not found' });
    return res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching customer credit:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Patch limit (dollars or cents), term, hold
const PatchSchema = z.object({
  creditLimit: z.number().nonnegative().max(100_000).optional(), // dollars
  creditLimitCents: z.number().int().nonnegative().max(MAX_LIMIT_CENTS).optional(),
  term: z.enum(['Prepaid','Net7','Net15','Net30','Net45']).optional(),
  onCreditHold: z.boolean().optional(),
});

router.patch('/:customerId', async (req: any, res) => {
  try {
    const id = String(req.params.customerId);
    const p = PatchSchema.safeParse(req.body);
    if (!p.success) return res.status(400).json({ error: 'invalid payload', details: p.error.errors });

    // Fetch BEFORE snapshot for audit
    const beforeQ = await db.execute(sql`SELECT * FROM customer_credit_unified WHERE customer_id = ${id}`);
    const before = beforeQ.rows[0] || null;

    // Apply updates
    if (p.data.creditLimit !== undefined || p.data.term !== undefined || p.data.onCreditHold !== undefined) {
      await db.execute(sql`
        UPDATE customer_credit_unified
        SET creditlimit = COALESCE(${p.data.creditLimit}, creditlimit),
            term = COALESCE(${p.data.term}, term),
            on_credit_hold = COALESCE(${p.data.onCreditHold}, on_credit_hold)
        WHERE customer_id = ${id}
      `);
    }

    // Or accept cents directly
    if (p.data.creditLimitCents !== undefined && p.data.creditLimit === undefined) {
      await db.execute(sql`UPDATE users SET credit_limit_cents = ${p.data.creditLimitCents} WHERE id = ${id}`);
    }

    // Fetch AFTER snapshot
    const afterQ = await db.execute(sql`SELECT * FROM customer_credit_unified WHERE customer_id = ${id}`);
    const after = afterQ.rows[0] || null;

    // Audit log the change
    const auditData = {
      customerId: id,
      before: before,
      after: after,
      changes: p.data,
      adminUser: req.user?.username || req.user?.id,
    };

    await db.execute(sql`
      INSERT INTO audit_logs (user_id, action, ip, user_agent, metadata)
      VALUES (${req.user?.id}, 'credit_update', ${req.ip}, ${req.get('User-Agent')}, ${JSON.stringify(auditData)})
    `);

    return res.json(after);
  } catch (error) {
    console.error('Error updating customer credit:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Optional: a legacy-shaped GET for existing pages expecting {creditLimit,currentBalance}
router.get('/legacy/:customerId', async (req, res) => {
  try {
    const id = String(req.params.customerId);
    const { rows } = await db.execute(sql`SELECT customer_id AS id, creditlimit AS "creditLimit", currentbalance AS "currentBalance" FROM customer_credit_unified WHERE customer_id = ${id}`);
    if (!rows.length) return res.status(404).json({ error: 'customer not found' });
    return res.json(rows[0]);
  } catch (error) {
    console.error('Error fetching legacy customer credit:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all customers with credit info (for admin dashboard)
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.execute(sql`
      SELECT 
        ccu.*,
        u.username,
        u.business_name,
        u.email
      FROM customer_credit_unified ccu
      LEFT JOIN users u ON u.id = ccu.customer_id
      ORDER BY u.username
    `);
    return res.json(rows);
  } catch (error) {
    console.error('Error fetching all customer credit:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;