import { Router, Request, Response } from 'express';
import { z } from 'zod';
import * as arService from '../services/arService';
import { requireAuth } from '../simpleAuth';
import { users } from '../../shared/schema';
import { db } from '../db';
import { eq, and, desc, sql } from 'drizzle-orm';

const router = Router();

// Credit Terms endpoints
router.get('/ar/terms', requireAuth, async (req: Request, res: Response) => {
  try {
    const terms = ['Prepaid', 'Net7', 'Net15', 'Net30', 'Net45'];
    res.json({ terms });
  } catch (error) {
    console.error('Error fetching credit terms:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Customer A/R summary
router.get('/ar/summary/:customerId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    
    // Get customer details with credit info
    const [customer] = await db.select({
      id: users.id,
      username: users.username,
      businessName: users.businessName,
      creditTerm: users.creditTerm,
      creditLimitCents: users.creditLimitCents,
      onCreditHold: users.onCreditHold,
    }).from(users).where(eq(users.id, customerId));

    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Get current exposure
    const exposure = await arService.customerExposureCents(customerId);
    
    // Get aging buckets
    const aging = await arService.agingBuckets(customerId);
    const customerAging = aging.find(a => a.customerId === customerId) || {
      bucket_0_30: 0,
      bucket_31_60: 0,
      bucket_61_90: 0,
      bucket_90_plus: 0,
    };

    res.json({
      customer,
      exposure,
      aging: customerAging,
      available: Math.max(0, customer.creditLimitCents - exposure),
    });
  } catch (error) {
    console.error('Error fetching A/R summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Aging report
router.get('/ar/aging', requireAuth, async (req: Request, res: Response) => {
  try {
    const aging = await arService.agingBuckets();
    
    // Enhance with customer details
    const customerIds = aging.map(a => a.customerId);
    const customerDetails = await db.select({
      id: users.id,
      username: users.username,
      businessName: users.businessName,
      creditTerm: users.creditTerm,
    }).from(users).where(sql`${users.id} = ANY(${customerIds})`);

    const enhancedAging = aging.map(bucket => ({
      ...bucket,
      customer: customerDetails.find(c => c.id === bucket.customerId),
      total: bucket.bucket_0_30 + bucket.bucket_31_60 + bucket.bucket_61_90 + bucket.bucket_90_plus,
    }));

    res.json(enhancedAging);
  } catch (error) {
    console.error('Error fetching aging report:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Customer invoices
router.get('/ar/invoices/:customerId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    
    const invoices = await arService.getCustomerInvoices(customerId, limit);
    res.json(invoices);
  } catch (error) {
    console.error('Error fetching customer invoices:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Invoice detail with lines
router.get('/ar/invoices/detail/:invoiceId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { invoiceId } = req.params;
    const invoice = await arService.getInvoiceWithLines(invoiceId);
    
    if (!invoice) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    
    res.json(invoice);
  } catch (error) {
    console.error('Error fetching invoice detail:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create invoice (manual)
const createInvoiceSchema = z.object({
  customerId: z.string(),
  orderId: z.number().optional(),
  invoiceNo: z.string().optional(),
  issueDate: z.string().optional(),
  dueDate: z.string().optional(),
  lines: z.array(z.object({
    sku: z.string().optional(),
    description: z.string(),
    uom: z.string().optional(),
    quantity: z.number().positive(),
    unitPriceCents: z.number().int().min(0),
    taxCents: z.number().int().min(0).optional(),
  })).min(1),
});

router.post('/ar/invoices', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = createInvoiceSchema.parse(req.body);
    const invoice = await arService.createInvoice(data);
    res.status(201).json(invoice);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error creating invoice:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Customer payments
router.get('/ar/payments/:customerId', requireAuth, async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
    
    const payments = await arService.getCustomerPayments(customerId, limit);
    res.json(payments);
  } catch (error) {
    console.error('Error fetching customer payments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Record payment
const recordPaymentSchema = z.object({
  customerId: z.string(),
  amountCents: z.number().int().positive(),
  method: z.enum(['cash', 'check', 'ach', 'card', 'adjustment']),
  reference: z.string().optional(),
  receivedAt: z.string().optional(),
  allocations: z.array(z.object({
    invoiceId: z.string(),
    amountCents: z.number().int().positive(),
  })).optional(),
});

router.post('/ar/payments', requireAuth, async (req: Request, res: Response) => {
  try {
    const data = recordPaymentSchema.parse(req.body);
    const payment = await arService.recordPayment(data);
    res.status(201).json(payment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error recording payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update customer credit settings
const updateCreditSettingsSchema = z.object({
  creditTerm: z.enum(['Prepaid', 'Net7', 'Net15', 'Net30', 'Net45']).optional(),
  creditLimitCents: z.number().int().min(0).optional(),
  onCreditHold: z.boolean().optional(),
});

router.put('/ar/customers/:customerId/credit', requireAuth, async (req: Request, res: Response) => {
  try {
    const { customerId } = req.params;
    const data = updateCreditSettingsSchema.parse(req.body);
    
    // Check if customer exists
    const [customer] = await db.select().from(users).where(eq(users.id, customerId));
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    // Update credit settings
    const updates: any = {};
    if (data.creditTerm !== undefined) updates.creditTerm = data.creditTerm;
    if (data.creditLimitCents !== undefined) updates.creditLimitCents = data.creditLimitCents;
    if (data.onCreditHold !== undefined) updates.onCreditHold = data.onCreditHold;
    
    if (Object.keys(updates).length > 0) {
      updates.updatedAt = new Date();
      await db.update(users).set(updates).where(eq(users.id, customerId));
    }
    
    // Return updated customer
    const [updatedCustomer] = await db.select({
      id: users.id,
      username: users.username,
      businessName: users.businessName,
      creditTerm: users.creditTerm,
      creditLimitCents: users.creditLimitCents,
      onCreditHold: users.onCreditHold,
    }).from(users).where(eq(users.id, customerId));
    
    res.json(updatedCustomer);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation error', details: error.errors });
    }
    console.error('Error updating credit settings:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;