import { and, desc, eq, gt, lte, sql } from 'drizzle-orm';
import { db } from '../db';
import { arInvoices, arInvoiceLines, arPayments, arPaymentApps, type CreditTerm, type PaymentMethod, type ArInvoice, type InsertArInvoice } from '../../shared/ar-schema';

export type { CreditTerm, PaymentMethod };

export function termToDays(term: CreditTerm): number {
  switch (term) {
    case 'Net7': return 7;
    case 'Net15': return 15;
    case 'Net30': return 30;
    case 'Net45': return 45;
    default: return 0; // Prepaid
  }
}

export function calculateDueDate(issueDate: Date, term: CreditTerm): Date {
  const days = termToDays(term);
  const dueDate = new Date(issueDate);
  dueDate.setDate(dueDate.getDate() + days);
  return dueDate;
}

export async function customerExposureCents(customerId: string): Promise<number> {
  try {
    const result = await db.execute(sql`
      SELECT COALESCE(SUM(balance_cents), 0) AS open 
      FROM ar_invoices 
      WHERE customer_id = ${customerId} AND status = 'open'
    `);
    
    return Number(result.rows[0]?.open || 0);
  } catch (error) {
    console.error('Error calculating customer exposure:', error);
    return 0;
  }
}

export async function agingBuckets(customerId?: string) {
  try {
    const whereClause = customerId ? sql`AND customer_id = ${customerId}` : sql``;
    
    const result = await db.execute(sql`
      SELECT customer_id,
        SUM(CASE WHEN CURRENT_DATE - due_date <= 30 THEN balance_cents ELSE 0 END) AS bucket_0_30,
        SUM(CASE WHEN CURRENT_DATE - due_date BETWEEN 31 AND 60 THEN balance_cents ELSE 0 END) AS bucket_31_60,
        SUM(CASE WHEN CURRENT_DATE - due_date BETWEEN 61 AND 90 THEN balance_cents ELSE 0 END) AS bucket_61_90,
        SUM(CASE WHEN CURRENT_DATE - due_date > 90 THEN balance_cents ELSE 0 END) AS bucket_90_plus
      FROM ar_invoices
      WHERE status = 'open' AND due_date IS NOT NULL ${whereClause}
      GROUP BY customer_id
    `);
    
    return result.rows.map(row => ({
      customerId: row.customer_id,
      bucket_0_30: Number(row.bucket_0_30 || 0),
      bucket_31_60: Number(row.bucket_31_60 || 0),
      bucket_61_90: Number(row.bucket_61_90 || 0),
      bucket_90_plus: Number(row.bucket_90_plus || 0),
    }));
  } catch (error) {
    console.error('Error calculating aging buckets:', error);
    return [];
  }
}

export async function createInvoice(input: {
  customerId: string;
  orderId?: number;
  invoiceNo?: string;
  issueDate?: string; // YYYY-MM-DD
  dueDate?: string;   // YYYY-MM-DD
  lines: Array<{
    sku?: string;
    description: string;
    uom?: string;
    quantity: number;
    unitPriceCents: number;
    taxCents?: number;
  }>;
}): Promise<ArInvoice> {
  try {
    const subtotal = input.lines.reduce((s, l) => s + Math.round(l.quantity * l.unitPriceCents), 0);
    const lineTaxes = input.lines.reduce((s, l) => s + (l.taxCents || 0), 0);
    const total = subtotal + lineTaxes;

    // Generate invoice number if not provided
    const invoiceNo = input.invoiceNo || await generateInvoiceNumber();

    const [invoice] = await db.insert(arInvoices).values({
      customerId: input.customerId,
      orderId: input.orderId,
      invoiceNo,
      issueDate: input.issueDate ? new Date(input.issueDate) : new Date(),
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
      subtotalCents: subtotal,
      taxCents: lineTaxes,
      totalCents: total,
      balanceCents: total,
    }).returning();

    // Insert invoice lines
    if (input.lines.length > 0) {
      await db.insert(arInvoiceLines).values(input.lines.map(line => ({
        invoiceId: invoice.id,
        sku: line.sku,
        description: line.description,
        uom: line.uom,
        quantity: String(line.quantity),
        unitPriceCents: line.unitPriceCents,
        lineSubtotalCents: Math.round(line.quantity * line.unitPriceCents),
        taxCents: line.taxCents || 0,
        totalCents: Math.round(line.quantity * line.unitPriceCents) + (line.taxCents || 0),
      })));
    }

    // Return the created invoice
    const [freshInvoice] = await db.select().from(arInvoices).where(eq(arInvoices.id, invoice.id));
    return freshInvoice;
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw new Error('Failed to create invoice');
  }
}

export async function recordPayment(input: {
  customerId: string;
  amountCents: number;
  method: PaymentMethod;
  reference?: string;
  receivedAt?: string; // YYYY-MM-DD
  allocations?: Array<{ invoiceId: string; amountCents: number }>; // if omitted, auto-apply oldest first
}) {
  try {
    const [payment] = await db.insert(arPayments).values({
      customerId: input.customerId,
      method: input.method,
      reference: input.reference,
      receivedAt: input.receivedAt ? new Date(input.receivedAt) : new Date(),
      amountCents: input.amountCents,
      unappliedCents: input.amountCents,
    }).returning();

    if (input.allocations && input.allocations.length > 0) {
      // Manual allocations
      for (const allocation of input.allocations) {
        await applyToInvoice(payment.id, allocation.invoiceId, allocation.amountCents);
      }
    } else {
      // Auto-apply to oldest invoices
      await autoApplyOldest(payment.id);
    }

    return payment;
  } catch (error) {
    console.error('Error recording payment:', error);
    throw new Error('Failed to record payment');
  }
}

export async function applyToInvoice(paymentId: string, invoiceId: string, amountCents: number) {
  try {
    if (amountCents <= 0) return;

    // Load payment
    const [payment] = await db.select().from(arPayments).where(eq(arPayments.id, paymentId));
    if (!payment) throw new Error('Payment not found');
    if (payment.unappliedCents < amountCents) throw new Error('Insufficient unapplied amount');

    // Load invoice
    const [invoice] = await db.select().from(arInvoices).where(eq(arInvoices.id, invoiceId));
    if (!invoice) throw new Error('Invoice not found');

    const toApply = Math.min(amountCents, invoice.balanceCents);
    if (toApply <= 0) return;

    // Create application
    await db.insert(arPaymentApps).values({
      paymentId,
      invoiceId,
      amountCents: toApply
    });

    // Update payment unapplied amount
    await db.update(arPayments)
      .set({ unappliedCents: payment.unappliedCents - toApply })
      .where(eq(arPayments.id, paymentId));

    // Trigger will handle invoice balance update
    return toApply;
  } catch (error) {
    console.error('Error applying payment to invoice:', error);
    throw new Error('Failed to apply payment');
  }
}

export async function autoApplyOldest(paymentId: string) {
  try {
    // Apply to oldest open invoices for that payment's customer
    const [payment] = await db.select().from(arPayments).where(eq(arPayments.id, paymentId));
    if (!payment) throw new Error('Payment not found');

    let remaining = payment.unappliedCents;
    if (remaining <= 0) return;

    // Get open invoices ordered by due date (oldest first)
    const openInvoices = await db.select()
      .from(arInvoices)
      .where(and(
        eq(arInvoices.customerId, payment.customerId),
        eq(arInvoices.status, 'open'),
        gt(arInvoices.balanceCents, 0)
      ))
      .orderBy(arInvoices.dueDate, arInvoices.issueDate);

    for (const invoice of openInvoices) {
      if (remaining <= 0) break;
      
      const toApply = Math.min(remaining, invoice.balanceCents);
      if (toApply > 0) {
        await applyToInvoice(paymentId, invoice.id, toApply);
        remaining -= toApply;
      }
    }
  } catch (error) {
    console.error('Error auto-applying payment:', error);
    throw new Error('Failed to auto-apply payment');
  }
}

async function generateInvoiceNumber(): Promise<string> {
  try {
    const today = new Date();
    const year = today.getFullYear();
    const month = (today.getMonth() + 1).toString().padStart(2, '0');
    
    // Get the next sequence number for this month
    const result = await db.execute(sql`
      SELECT COUNT(*) + 1 as next_seq 
      FROM ar_invoices 
      WHERE DATE_PART('year', issue_date) = ${year} 
      AND DATE_PART('month', issue_date) = ${parseInt(month)}
    `);
    
    const sequence = Number(result.rows[0]?.next_seq || 1);
    return `INV-${year}${month}-${sequence.toString().padStart(4, '0')}`;
  } catch (error) {
    console.error('Error generating invoice number:', error);
    // Fallback to timestamp-based
    return `INV-${Date.now()}`;
  }
}

export async function getCustomerInvoices(customerId: string, limit: number = 50) {
  try {
    return await db.select()
      .from(arInvoices)
      .where(eq(arInvoices.customerId, customerId))
      .orderBy(desc(arInvoices.createdAt))
      .limit(limit);
  } catch (error) {
    console.error('Error fetching customer invoices:', error);
    return [];
  }
}

export async function getInvoiceWithLines(invoiceId: string) {
  try {
    const [invoice] = await db.select().from(arInvoices).where(eq(arInvoices.id, invoiceId));
    if (!invoice) return null;

    const lines = await db.select().from(arInvoiceLines).where(eq(arInvoiceLines.invoiceId, invoiceId));
    
    return {
      ...invoice,
      lines
    };
  } catch (error) {
    console.error('Error fetching invoice with lines:', error);
    return null;
  }
}

export async function getCustomerPayments(customerId: string, limit: number = 50) {
  try {
    return await db.select()
      .from(arPayments)
      .where(eq(arPayments.customerId, customerId))
      .orderBy(desc(arPayments.createdAt))
      .limit(limit);
  } catch (error) {
    console.error('Error fetching customer payments:', error);
    return [];
  }
}