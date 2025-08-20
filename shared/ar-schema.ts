import { pgTable, uuid, varchar, date, bigint, timestamp, text, numeric, boolean, integer, index } from 'drizzle-orm/pg-core';

// A/R Invoice table
export const arInvoices = pgTable('ar_invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: varchar('customer_id').notNull(),
  orderId: integer('order_id'),
  invoiceNo: varchar('invoice_no', { length: 32 }),
  status: varchar('status', { length: 16 }).default('open').notNull(),
  issueDate: date('issue_date').defaultNow().notNull(),
  dueDate: date('due_date'),
  subtotalCents: bigint('subtotal_cents', { mode: 'number' }).default(0).notNull(),
  taxCents: bigint('tax_cents', { mode: 'number' }).default(0).notNull(),
  totalCents: bigint('total_cents', { mode: 'number' }).default(0).notNull(),
  balanceCents: bigint('balance_cents', { mode: 'number' }).default(0).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  customerIdx: index('idx_ar_inv_customer').on(table.customerId),
  statusIdx: index('idx_ar_inv_status').on(table.status),
  orderIdx: index('idx_ar_inv_order').on(table.orderId),
}));

// A/R Invoice Lines table
export const arInvoiceLines = pgTable('ar_invoice_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  invoiceId: uuid('invoice_id').notNull().references(() => arInvoices.id, { onDelete: 'cascade' }),
  sku: varchar('sku', { length: 64 }),
  description: text('description'),
  uom: varchar('uom', { length: 16 }),
  quantity: numeric('quantity', { precision: 18, scale: 3 }).default('1').notNull(),
  unitPriceCents: bigint('unit_price_cents', { mode: 'number' }).default(0).notNull(),
  lineSubtotalCents: bigint('line_subtotal_cents', { mode: 'number' }).default(0).notNull(),
  taxCents: bigint('tax_cents', { mode: 'number' }).default(0).notNull(),
  totalCents: bigint('total_cents', { mode: 'number' }).default(0).notNull(),
}, (table) => ({
  invoiceIdx: index('idx_ar_lines_invoice').on(table.invoiceId),
}));

// A/R Payments table
export const arPayments = pgTable('ar_payments', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: varchar('customer_id').notNull(),
  receivedAt: date('received_at').defaultNow().notNull(),
  method: varchar('method', { length: 24 }).notNull(),
  reference: varchar('reference', { length: 64 }),
  amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
  unappliedCents: bigint('unapplied_cents', { mode: 'number' }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  customerIdx: index('idx_ar_pmt_customer').on(table.customerId),
}));

// A/R Payment Applications table (many-to-many)
export const arPaymentApps = pgTable('ar_payment_apps', {
  id: uuid('id').defaultRandom().primaryKey(),
  paymentId: uuid('payment_id').notNull().references(() => arPayments.id, { onDelete: 'cascade' }),
  invoiceId: uuid('invoice_id').notNull().references(() => arInvoices.id, { onDelete: 'cascade' }),
  amountCents: bigint('amount_cents', { mode: 'number' }).notNull(),
}, (table) => ({
  invoiceIdx: index('idx_ar_app_invoice').on(table.invoiceId),
  paymentIdx: index('idx_ar_app_payment').on(table.paymentId),
}));

// Types for TypeScript
export type ArInvoice = typeof arInvoices.$inferSelect;
export type ArInvoiceLine = typeof arInvoiceLines.$inferSelect;
export type ArPayment = typeof arPayments.$inferSelect;
export type ArPaymentApp = typeof arPaymentApps.$inferSelect;

export type InsertArInvoice = typeof arInvoices.$inferInsert;
export type InsertArInvoiceLine = typeof arInvoiceLines.$inferInsert;
export type InsertArPayment = typeof arPayments.$inferInsert;
export type InsertArPaymentApp = typeof arPaymentApps.$inferInsert;

// Credit terms enum
export type CreditTerm = 'Prepaid' | 'Net7' | 'Net15' | 'Net30' | 'Net45';

// Invoice status enum
export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void';

// Payment methods enum
export type PaymentMethod = 'cash' | 'check' | 'ach' | 'card' | 'adjustment';