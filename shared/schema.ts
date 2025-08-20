import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  json,
  index,
  serial,
  integer,
  boolean,
  date,
  time,
  doublePrecision,
  primaryKey,
  numeric,
  decimal,
  bigint,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table.
// This table is mandatory for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Password reset tokens table
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  tokenHash: varchar("token_hash").notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  username: varchar("username").unique().notNull(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  company: varchar("company"),
  address: varchar("address"),
  isAdmin: boolean("is_admin").default(false),
  // Employee role - can manage products and orders but not users
  isEmployee: boolean("is_employee").default(false),
  // Customer tier level (1-5) for pricing
  customerLevel: integer("customer_level").default(1),
  // Tax application settings
  applyFlatTax: boolean("apply_flat_tax").default(false), // Level 2+ customers can have flat taxes applied
  // Password hash for customer accounts (not used with Replit Auth)
  passwordHash: varchar("password_hash"),
  // Temporary password for reset functionality
  tempPassword: varchar("temp_password"),
  tempPasswordExpiry: timestamp("temp_password_expiry"),
  forcePasswordChange: boolean("force_password_change").default(false),
  // Business details
  businessName: varchar("business_name"),
  taxId: varchar("tax_id"),
  businessType: varchar("business_type"),
  // Contact information
  phone: varchar("phone"), // Cell phone for SMS notifications
  businessPhone: varchar("business_phone"), // Business phone (may be landline)
  alternativeEmail: varchar("alternative_email"),
  // Primary address information (kept for backward compatibility)
  addressLine1: varchar("address_line1"),
  addressLine2: varchar("address_line2"),
  city: varchar("city"),
  state: varchar("state"),
  postalCode: varchar("postal_code"),
  country: varchar("country").default("United States"),
  // Accounting information
  creditLimit: doublePrecision("credit_limit").default(0),
  currentBalance: doublePrecision("current_balance").default(0),
  paymentTerms: varchar("payment_terms"),
  // A/R Credit Terms & Limits (cents-based for precision)
  creditTerm: varchar("credit_term", { length: 16 }).default('Prepaid').notNull(),
  creditLimitCents: bigint("credit_limit_cents", { mode: 'number' }).default(0).notNull(),
  onCreditHold: boolean("on_credit_hold").default(false).notNull(),
  taxExempt: boolean("tax_exempt").default(false),
  taxExemptionNumber: varchar("tax_exemption_number"),
  // Additional details
  notes: text("notes"),
  customerSince: timestamp("customer_since").defaultNow(),
  preferredDeliveryDay: varchar("preferred_delivery_day"),
  preferredDeliveryTime: varchar("preferred_delivery_time"),
  // Missing fields for authentication and business details
  email: varchar("email"),
  // Language preference for notifications  
  preferredLanguage: varchar("preferred_language").default("en"), // Language preference (en, es, fr, de, hi, gu, etc.)
  lastLogin: timestamp("last_login"),
  feinNumber: varchar("fein_number"),
  stateTaxId: varchar("state_tax_id"),
  tobaccoLicense: varchar("tobacco_license"),
  // Notification preferences
  emailNotifications: boolean("email_notifications").default(true), // Enable/disable email notifications
  smsNotifications: boolean("sms_notifications").default(false), // Enable/disable SMS notifications
  promotionalEmails: boolean("promotional_emails").default(false), // Enable/disable promotional/marketing emails
  // TCPA Compliance Fields for SMS
  smsConsentGiven: boolean("sms_consent_given").default(false), // Explicit opt-in consent for SMS
  smsConsentDate: timestamp("sms_consent_date"), // When consent was given
  smsConsentMethod: varchar("sms_consent_method"), // How consent was obtained: 'web_form', 'phone_call', 'in_person', 'paper_form'
  smsConsentIpAddress: varchar("sms_consent_ip_address"), // IP address when consent was given
  smsConsentUserAgent: varchar("sms_consent_user_agent"), // Browser/device info when consent was given
  smsConsentConfirmationText: text("sms_consent_confirmation_text"), // Exact consent text presented to user
  smsConsentDuplicationVerified: boolean("sms_consent_duplication_verified").default(false), // Verified no duplicate consent
  smsOptOutDate: timestamp("sms_opt_out_date"), // When user opted out
  smsOptOutMethod: varchar("sms_opt_out_method"), // How user opted out: 'STOP_reply', 'web_form', 'phone_call'
  smsOptOutIpAddress: varchar("sms_opt_out_ip_address"), // IP address when user opted out
  marketingSmsConsent: boolean("marketing_sms_consent").default(false), // Separate consent for marketing/promotional SMS
  transactionalSmsConsent: boolean("transactional_sms_consent").default(false), // Consent for transactional SMS (order updates)
  privacyPolicyAccepted: boolean("privacy_policy_accepted").default(false), // User accepted privacy policy
  privacyPolicyVersion: varchar("privacy_policy_version"), // Version of privacy policy accepted
  privacyPolicyAcceptedDate: timestamp("privacy_policy_accepted_date"), // When privacy policy was accepted
  // Initial notification opt-in tracking
  initialNotificationOptinCompleted: boolean("initial_notification_optin_completed").default(false), // User completed initial notification setup
  initialNotificationOptinDate: timestamp("initial_notification_optin_date"), // When initial notification setup was completed
  notificationTypes: jsonb("notification_types").default({
    orderConfirmation: true,
    orderStatusUpdate: true,
    promotions: true,
    lowStock: false,
    priceAlerts: false,
    newsletters: true
  }), // Specific notification type preferences
  // Loyalty program
  loyaltyPoints: doublePrecision("loyalty_points").default(0), // Total loyalty points earned
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Product categories
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  excludeFromLoyalty: boolean("exclude_from_loyalty").default(false), // Exclude category from loyalty points
  // Visibility and draft status
  isVisible: boolean("is_visible").default(true), // Whether category is visible to customers
  isDraft: boolean("is_draft").default(false), // Whether category is in draft mode (not live)
  // Customer level visibility controls - array of customer levels (1-5) that can see this category
  visibleToLevels: text("visible_to_levels").array().default([]), // Empty array means visible to all levels
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Products
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  description: text("description"),
  // Standard price (shown to customers)
  price: doublePrecision("price").notNull(),
  // Base price (not shown to customers)
  basePrice: doublePrecision("base_price"), 
  // Product cost for price history tracking
  cost: doublePrecision("cost"),
  // Tiered pricing for different customer levels
  price1: doublePrecision("price_level_1"), // Price for level 1 customers
  price2: doublePrecision("price_level_2"), // Price for level 2 customers
  price3: doublePrecision("price_level_3"), // Price for level 3 customers
  price4: doublePrecision("price_level_4"), // Price for level 4 customers
  price5: doublePrecision("price_level_5"), // Price for level 5 customers
  imageUrl: varchar("image_url"),
  additionalImages: text("additional_images").array(), // Store multiple image URLs as JSON array
  upcCode: varchar("upc_code").unique(), // UPC code for the product
  sku: varchar("sku"), // Stock Keeping Unit
  size: varchar("size"), // Size information (e.g., "12oz", "2 Pack", "24ct")
  weight: doublePrecision("weight"), // Weight in kg
  dimensions: varchar("dimensions"), // Format like "10x20x30 cm"
  brand: varchar("brand"),
  featured: boolean("featured").default(false),
  discount: doublePrecision("discount").default(0), // Discount percentage
  stock: integer("stock").notNull().default(0),
  minOrderQuantity: integer("min_order_quantity").default(1), // Minimum quantity that can be ordered
  categoryId: integer("category_id").references(() => categories.id),
  archived: boolean("archived").default(false), // Whether product is archived
  // Visibility and draft status
  isVisible: boolean("is_visible").default(true), // Whether product is visible to customers
  isDraft: boolean("is_draft").default(false), // Whether product is in draft mode (not live)
  createdBy: varchar("created_by"), // Username of user who created the product
  // Tax fields for tobacco and other taxable items
  taxPercentage: doublePrecision("tax_percentage").default(0), // Individual item tax percentage (e.g., 35.0 for 35%)
  isTobaccoProduct: boolean("is_tobacco_product").default(false), // For IL-TP1 compliance tracking
  tobaccoProductType: varchar("tobacco_product_type"), // cigarettes, cigars, pipe_tobacco, etc.
  manufacturerName: varchar("manufacturer_name"), // Required for IL-TP1 reporting
  flatTaxIds: text("flat_tax_ids").array().default([]), // Array of flat tax IDs to apply to this product
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Cart items
export const cartItems = pgTable("cart_items", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull().default(1),
  price: doublePrecision("price"), // Price at time of adding to cart (optional - calculated from product)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Orders
export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  total: doublePrecision("total").notNull(),
  // Order type: delivery or pickup
  orderType: varchar("order_type").notNull().default("delivery"),
  // Delivery information (when orderType is "delivery")
  deliveryDate: date("delivery_date"),
  deliveryTimeSlot: varchar("delivery_time_slot"),
  deliveryFee: doublePrecision("delivery_fee").default(0),
  deliveryNote: text("delivery_note"),
  // Store complete delivery address data as JSON
  deliveryAddressData: text("delivery_address_data"),
  // Pickup information (when orderType is "pickup")
  pickupDate: date("pickup_date"),
  pickupTime: varchar("pickup_time"),
  // Additional information
  notes: text("notes"),
  adminNote: text("admin_note"),
  status: varchar("status").notNull().default("pending"),
  // Payment information (filled when order is completed)
  paymentMethod: varchar("payment_method"), // "cash", "check", "electronic"
  checkNumber: varchar("check_number"), // for check payments
  paymentNotes: text("payment_notes"), // additional payment details
  paymentDate: timestamp("payment_date"), // when payment was received
  // Loyalty points redemption
  loyaltyPointsRedeemed: doublePrecision("loyalty_points_redeemed").default(0), // Points redeemed for this order
  loyaltyPointsValue: doublePrecision("loyalty_points_value").default(0), // Monetary value of redeemed points
  // Global invoice numbering and idempotency for POS offline sync
  invoice_no: integer("invoice_no").unique(), // Global sequential invoice number
  idempotency_key: varchar("idempotency_key").unique(), // For POS offline sync
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Order items
export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  price: doublePrecision("price").notNull(),
  // Tax information (calculated at order time)
  basePrice: doublePrecision("base_price"), // Price before taxes
  taxPercentage: doublePrecision("tax_percentage").default(0), // Tax percentage applied
  percentageTaxAmount: doublePrecision("percentage_tax_amount").default(0), // Tax amount from percentage
  flatTaxAmount: doublePrecision("flat_tax_amount").default(0), // Total flat tax amount
  totalTaxAmount: doublePrecision("total_tax_amount").default(0), // Total tax for this item
  createdAt: timestamp("created_at").defaultNow(),
});

// Define relations
export const productRelations = relations(products, ({ one, many }) => ({
  category: one(categories, {
    fields: [products.categoryId],
    references: [categories.id],
  }),
  orderItems: many(orderItems),
  cartItems: many(cartItems),
}));

export const categoryRelations = relations(categories, ({ many }) => ({
  products: many(products),
}));

export const cartItemRelations = relations(cartItems, ({ one }) => ({
  product: one(products, {
    fields: [cartItems.productId],
    references: [products.id],
  }),
  user: one(users, {
    fields: [cartItems.userId],
    references: [users.id],
  }),
}));

export const orderRelations = relations(orders, ({ one, many }) => ({
  user: one(users, {
    fields: [orders.userId],
    references: [users.id],
  }),
  items: many(orderItems),
}));

export const orderItemRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

// Delivery addresses table to store multiple addresses for each user
export const deliveryAddresses = pgTable("delivery_addresses", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  name: varchar("name").notNull(), // Name for this address (e.g., "Home", "Store #1", "Second Location")
  businessName: varchar("business_name"),
  addressLine1: varchar("address_line1").notNull(),
  addressLine2: varchar("address_line2"),
  city: varchar("city").notNull(),
  state: varchar("state").notNull(),
  postalCode: varchar("postal_code").notNull(),
  country: varchar("country").default("United States"),
  phone: varchar("phone"),
  isDefault: boolean("is_default").default(false),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Activity log to track staff actions
export const activityLogs = pgTable("activity_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id"),
  username: varchar("username"),
  action: varchar("action").notNull(),
  details: text("details"),
  timestamp: timestamp("timestamp").defaultNow(),
  targetId: varchar("target_id"),
  targetType: varchar("target_type"),
  ipAddress: varchar("ip_address"), // Track IP address for login tracking
  location: varchar("location"), // Geographic location derived from IP address
});

// Order settings for minimum order amounts and delivery fees
export const orderSettings = pgTable("order_settings", {
  id: serial("id").primaryKey(),
  minimumOrderAmount: doublePrecision("minimum_order_amount").default(0.00),
  deliveryFee: doublePrecision("delivery_fee").default(0.00),
  freeDeliveryThreshold: doublePrecision("free_delivery_threshold").default(100.00),
  loyaltyPointsRate: doublePrecision("loyalty_points_rate").default(0.02), // Default 2% loyalty rate
  invoiceStyle: varchar("invoice_style").default("legacy"), // 'legacy' or 'enhanced'
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by"),
});

// Purchase orders table - aligned with actual database structure
export const purchaseOrders = pgTable("purchase_orders", {
  id: serial("id").primaryKey(),
  orderNumber: varchar("order_number").notNull(),
  supplierId: varchar("supplier_id"),
  supplierName: varchar("supplier_name"),
  status: varchar("status").notNull().default("pending"),
  totalCost: doublePrecision("total_cost").notNull().default(0),
  notes: text("notes"),
  createdBy: varchar("created_by").notNull(),
  receivedBy: varchar("received_by"),
  createdAt: timestamp("created_at").defaultNow(),
  receivedAt: timestamp("received_at"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Purchase order items table - aligned with actual database structure
export const purchaseOrderItems = pgTable("purchase_order_items", {
  id: serial("id").primaryKey(),
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrders.id).notNull(),
  productId: integer("product_id").notNull(),
  quantityOrdered: integer("quantity_ordered").notNull(),
  quantityReceived: integer("quantity_received").default(0),
  unitCost: doublePrecision("unit_cost").notNull(),
  totalCost: doublePrecision("total_cost").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Order notes table for staff/admin notes on orders
export const orderNotes = pgTable("order_notes", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  note: text("note").notNull(),
  addedBy: varchar("added_by").notNull(),
  notifyCustomer: boolean("notify_customer").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notificationSettings = pgTable("notification_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().unique(),
  orderChanges: boolean("order_changes").default(true),
  orderNotes: boolean("order_notes").default(true),
  orderStatus: boolean("order_status").default(true),
  newItems: boolean("new_items").default(true),
  promotions: boolean("promotions").default(true),
  systemUpdates: boolean("system_updates").default(true),
  emailNotifications: boolean("email_notifications").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Product pricing history table
export const productPricingHistory = pgTable("product_pricing_history", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  oldPrice: doublePrecision("old_price"),
  newPrice: doublePrecision("new_price").notNull(),
  oldCost: doublePrecision("old_cost"),
  newCost: doublePrecision("new_cost"),
  changeReason: varchar("change_reason"), // purchase_order, manual_update, bulk_update
  purchaseOrderId: integer("purchase_order_id").references(() => purchaseOrders.id),
  changedBy: varchar("changed_by").notNull(),
  details: text("details"), // JSON string for comprehensive tracking
  createdAt: timestamp("created_at").defaultNow(),
});

// Flat tax management table for county-specific taxes
export const flatTaxes = pgTable("flat_taxes", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(), // e.g., "60ct Cigar Cook County Tax"
  description: text("description"),
  taxAmount: doublePrecision("tax_amount").notNull(), // Flat tax amount (e.g., 0.60 for 60 cents)
  taxType: varchar("tax_type"), // tobacco, county, state, federal
  countyRestriction: varchar("county_restriction"), // County where tax applies
  zipCodeRestriction: varchar("zip_code_restriction"), // Specific zip codes where tax applies
  applicableProducts: jsonb("applicable_products"), // Products this tax applies to
  customerTiers: jsonb("customer_tiers").notNull().default([]), // Array of customer tier levels (1-5) this tax applies to
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// IL-TP1 compliance table for tobacco sales tracking
export const ilTp1TobaccoSales = pgTable("il_tp1_tobacco_sales", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id"),
  customerId: varchar("customer_id"),
  saleDate: timestamp("sale_date"),
  tobaccoProducts: jsonb("tobacco_products"),
  totalTobaccoValue: doublePrecision("total_tobacco_value"),
  totalTaxAmount: doublePrecision("total_tax_amount"),
  reportingPeriod: varchar("reporting_period"),
  reportingStatus: varchar("reporting_status"),
  submittedAt: timestamp("submitted_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Tax calculation audit table to track all tax calculations
export const taxCalculationAudits = pgTable("tax_calculation_audits", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id"),
  customerId: varchar("customer_id"),
  customerLevel: integer("customer_level"),
  applyFlatTax: boolean("apply_flat_tax"),
  calculationInput: jsonb("calculation_input"),
  calculationResult: jsonb("calculation_result"),
  percentageTaxApplied: doublePrecision("percentage_tax_applied"),
  flatTaxesApplied: jsonb("flat_taxes_applied"),
  totalTaxAmount: doublePrecision("total_tax_amount"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Zod schemas for tax-related tables
export const insertFlatTaxSchema = createInsertSchema(flatTaxes).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  taxAmount: z.number().min(0.01, "Tax amount must be greater than 0"),
  name: z.string().min(1, "Name is required"),
  countyRestriction: z.string().optional(),
  zipCodeRestriction: z.string().optional(),
  description: z.string().optional(),
  taxType: z.string().optional(),
  applicableProducts: z.array(z.number()).optional(),
  customerTiers: z.array(z.number().min(1).max(5)).min(1, "At least one customer tier must be selected"),
  isActive: z.boolean().optional(),
});

export const insertIlTp1TobaccoSaleSchema = createInsertSchema(ilTp1TobaccoSales).omit({
  id: true,
  createdAt: true,
});

export const insertTaxCalculationAuditSchema = createInsertSchema(taxCalculationAudits).omit({
  id: true,
  createdAt: true,
});

// Type definitions
export type FlatTax = typeof flatTaxes.$inferSelect;
export type InsertFlatTax = z.infer<typeof insertFlatTaxSchema>;
export type IlTp1TobaccoSale = typeof ilTp1TobaccoSales.$inferSelect;
export type InsertIlTp1TobaccoSale = z.infer<typeof insertIlTp1TobaccoSaleSchema>;
export type TaxCalculationAudit = typeof taxCalculationAudits.$inferSelect;
export type InsertTaxCalculationAudit = z.infer<typeof insertTaxCalculationAuditSchema>;

// Tax calculation result interface
export interface TaxCalculationResult {
  basePrice: number;
  taxPercentage: number;
  percentageTaxAmount: number;
  flatTaxesApplied: Array<{
    id: number;
    name: string;
    taxAmount: number;
  }>;
  totalFlatTaxAmount: number;
  totalTaxAmount: number;
  finalPriceWithTax: number;
}

// IL-TP1 compliance enums
export const TOBACCO_PRODUCT_TYPES = [
  'cigarettes',
  'cigars',
  'little_cigars',
  'pipe_tobacco',
  'chewing_tobacco',
  'snuff',
  'moist_snuff',
  'e_cigarettes',
  'hookah_tobacco',
  'snus',
  'other'
] as const;

export type TobaccoProductType = typeof TOBACCO_PRODUCT_TYPES[number];

// Flat tax relations
export const flatTaxRelations = relations(flatTaxes, ({ many }) => ({
  products: many(products),
}));

// Customer price memory - tracks custom pricing per customer per product
export const customerPriceMemory = pgTable("customer_price_memory", {
  id: serial("id").primaryKey(),
  customerId: varchar("customer_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  productId: integer("product_id").references(() => products.id, { onDelete: "cascade" }).notNull(),
  // The price this customer last paid (could be manual override or special price)
  lastPaidPrice: doublePrecision("last_paid_price").notNull(),
  // Standard price at time of purchase for comparison
  standardPriceAtTime: doublePrecision("standard_price_at_time").notNull(),
  // Order where this price was set
  orderId: integer("order_id").references(() => orders.id, { onDelete: "set null" }),
  // Who manually set this price (if it was a manual override)
  setPriceBy: varchar("set_price_by"), // Staff/admin who manually adjusted price
  // Reason for price adjustment
  priceReason: varchar("price_reason"), // "manual_adjustment", "loyalty_discount", "bulk_discount", "promotion", "standard"
  // Notes about the pricing decision
  notes: text("notes"),
  // When this price record was created
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
}, (table) => [
  // Index for quick lookup by customer
  index("idx_customer_price_memory_customer").on(table.customerId),
  // Index for quick lookup by product
  index("idx_customer_price_memory_product").on(table.productId),
  // Compound index for customer-product lookups
  index("idx_customer_price_memory_customer_product").on(table.customerId, table.productId),
]);

// In-app notification system removed - only SMS/email notifications remain

export const userRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  cartItems: many(cartItems),
  deliveryAddresses: many(deliveryAddresses),
}));

export const deliveryAddressRelations = relations(deliveryAddresses, ({ one }) => ({
  user: one(users, {
    fields: [deliveryAddresses.userId],
    references: [users.id],
  }),
}));

export const activityLogRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export const purchaseOrderRelations = relations(purchaseOrders, ({ many }) => ({
  items: many(purchaseOrderItems),
  priceChanges: many(productPricingHistory),
}));

export const purchaseOrderItemRelations = relations(purchaseOrderItems, ({ one }) => ({
  purchaseOrder: one(purchaseOrders, {
    fields: [purchaseOrderItems.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
}));

export const productPricingHistoryRelations = relations(productPricingHistory, ({ one }) => ({
  product: one(products, {
    fields: [productPricingHistory.productId],
    references: [products.id],
  }),
  purchaseOrder: one(purchaseOrders, {
    fields: [productPricingHistory.purchaseOrderId],
    references: [purchaseOrders.id],
  }),
}));

export const customerPriceMemoryRelations = relations(customerPriceMemory, ({ one }) => ({
  customer: one(users, {
    fields: [customerPriceMemory.customerId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [customerPriceMemory.productId],
    references: [products.id],
  }),
  order: one(orders, {
    fields: [customerPriceMemory.orderId],
    references: [orders.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users);
export const insertCategorySchema = createInsertSchema(categories);
export const insertProductSchema = createInsertSchema(products);
export const insertCartItemSchema = createInsertSchema(cartItems).omit({ 
  price: true, // Price is calculated from product, not provided by frontend
  createdAt: true, 
  updatedAt: true 
});
export const insertOrderSchema = createInsertSchema(orders);
export const insertOrderItemSchema = createInsertSchema(orderItems);
export const insertDeliveryAddressSchema = createInsertSchema(deliveryAddresses);
export const insertActivityLogSchema = createInsertSchema(activityLogs);
export const insertOrderSettingsSchema = createInsertSchema(orderSettings);
export const insertPurchaseOrderSchema = createInsertSchema(purchaseOrders);
export const insertPurchaseOrderItemSchema = createInsertSchema(purchaseOrderItems);

export const insertProductPricingHistorySchema = createInsertSchema(productPricingHistory);
export const insertCustomerPriceMemorySchema = createInsertSchema(customerPriceMemory);

// Push notification device tokens
export const deviceTokens = pgTable("device_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull(), // FCM/APNS token
  platform: varchar("platform").notNull(), // 'ios', 'android', 'web'
  deviceInfo: jsonb("device_info"), // Device details like model, OS version
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Push notification settings per user
export const pushNotificationSettings = pgTable("push_notification_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  orderUpdates: boolean("order_updates").default(true),
  orderNotes: boolean("order_notes").default(true),
  orderStatusChanges: boolean("order_status_changes").default(true),
  orderItemChanges: boolean("order_item_changes").default(true),
  newOrderAssigned: boolean("new_order_assigned").default(true),
  lowStockAlerts: boolean("low_stock_alerts").default(false),
  promotionalOffers: boolean("promotional_offers").default(false),
  systemMaintenance: boolean("system_maintenance").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Push notification logs
export const pushNotificationLogs = pgTable("push_notification_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  body: text("body").notNull(),
  data: jsonb("data"), // Additional payload data
  platform: varchar("platform").notNull(),
  deliveryStatus: varchar("delivery_status").default("pending"), // pending, sent, failed, delivered
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertDeviceTokenSchema = createInsertSchema(deviceTokens);
export const insertPushNotificationSettingsSchema = createInsertSchema(pushNotificationSettings);
export const insertPushNotificationLogSchema = createInsertSchema(pushNotificationLogs);

// Email campaigns and management
export const emailCampaigns = pgTable("email_campaigns", {
  id: serial("id").primaryKey(),
  name: varchar("name").notNull(),
  subject: varchar("subject").notNull(),
  content: text("content").notNull(),
  htmlContent: text("html_content"),
  status: varchar("status").notNull().default("draft"), // draft, sending, sent, failed
  recipientCount: integer("recipient_count").default(0),
  sentCount: integer("sent_count").default(0),
  failedCount: integer("failed_count").default(0),
  createdBy: varchar("created_by").notNull(),
  scheduledAt: timestamp("scheduled_at"),
  sentAt: timestamp("sent_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Email campaign recipients
export const emailCampaignRecipients = pgTable("email_campaign_recipients", {
  id: serial("id").primaryKey(),
  campaignId: integer("campaign_id").references(() => emailCampaigns.id, { onDelete: "cascade" }).notNull(),
  userId: varchar("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  email: varchar("email").notNull(),
  status: varchar("status").notNull().default("pending"), // pending, sent, failed, bounced
  sentAt: timestamp("sent_at"),
  failureReason: text("failure_reason"),
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_campaign_recipients_campaign").on(table.campaignId),
  index("idx_campaign_recipients_user").on(table.userId),
]);

// Loyalty transactions table - tracks point earning and redemption
export const loyaltyTransactions = pgTable("loyalty_transactions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  orderId: integer("order_id").references(() => orders.id), // Linked order if points were earned from order
  transactionType: varchar("transaction_type").notNull(), // 'earned' or 'redeemed'
  pointsAmount: doublePrecision("points_amount").notNull(), // Positive for earned, negative for redeemed
  orderTotal: doublePrecision("order_total"), // Order total that points were calculated from (excluding delivery/taxes)
  pointsRate: doublePrecision("points_rate").default(0.02), // Points percentage (2% = 0.02)
  description: text("description").notNull(), // Human readable description
  createdBy: varchar("created_by"), // Staff member who processed (for manual adjustments)
  createdAt: timestamp("created_at").defaultNow(),
}, (table) => [
  index("idx_loyalty_transactions_user").on(table.userId),
  index("idx_loyalty_transactions_order").on(table.orderId),
]);

export const loyaltyTransactionRelations = relations(loyaltyTransactions, ({ one }) => ({
  user: one(users, {
    fields: [loyaltyTransactions.userId],
    references: [users.id],
  }),
  order: one(orders, {
    fields: [loyaltyTransactions.orderId],
    references: [orders.id],
  }),
}));

export const insertLoyaltyTransactionSchema = createInsertSchema(loyaltyTransactions);

// Manual loyalty points adjustment schema
export const manualLoyaltyPointsSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  pointsAmount: z.number().min(-9999).max(9999),
  description: z.string().min(1, "Description is required"),
});
export const insertEmailCampaignSchema = createInsertSchema(emailCampaigns);
export const insertEmailCampaignRecipientSchema = createInsertSchema(emailCampaignRecipients);

// Draft orders - save incomplete orders
export const draftOrders = pgTable("draft_orders", {
  id: serial("id").primaryKey(),
  customerId: varchar("customer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(), // User-given name for the draft
  deliveryAddressId: integer("delivery_address_id").references(() => deliveryAddresses.id),
  notes: text("notes"),
  total: doublePrecision("total").default(0),
  itemCount: integer("item_count").default(0),
  autoSaved: boolean("auto_saved").default(false), // True if auto-saved, false if manually saved
  expiresAt: timestamp("expires_at"), // Auto-expire after 30 days
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Draft order items
export const draftOrderItems = pgTable("draft_order_items", {
  id: serial("id").primaryKey(),
  draftOrderId: integer("draft_order_id").notNull().references(() => draftOrders.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  price: doublePrecision("price").notNull(), // Price at time of adding to draft
  createdAt: timestamp("created_at").defaultNow(),
});

// Wishlist items
export const wishlistItems = pgTable("wishlist_items", {
  id: serial("id").primaryKey(),
  customerId: varchar("customer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  priceWhenAdded: doublePrecision("price_when_added").notNull(), // Track for price drop alerts
  priceAlertEnabled: boolean("price_alert_enabled").default(true),
  notes: text("notes"), // Customer notes about this wishlist item
  createdAt: timestamp("created_at").defaultNow(),
});

// Order templates - save common orders as templates
export const orderTemplates = pgTable("order_templates", {
  id: serial("id").primaryKey(),
  customerId: varchar("customer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  name: varchar("name").notNull(), // Template name
  description: text("description"),
  deliveryAddressId: integer("delivery_address_id").references(() => deliveryAddresses.id),
  notes: text("notes"),
  isRecurring: boolean("is_recurring").default(false),
  recurringInterval: varchar("recurring_interval"), // weekly, monthly, etc.
  recurringDay: integer("recurring_day"), // Day of week/month
  lastUsed: timestamp("last_used"),
  useCount: integer("use_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Order template items
export const orderTemplateItems = pgTable("order_template_items", {
  id: serial("id").primaryKey(),
  templateId: integer("template_id").notNull().references(() => orderTemplates.id, { onDelete: "cascade" }),
  productId: integer("product_id").notNull().references(() => products.id, { onDelete: "cascade" }),
  quantity: integer("quantity").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// AI suggestions cache - store AI-generated suggestions to avoid repeated API calls
export const aiSuggestions = pgTable("ai_suggestions", {
  id: serial("id").primaryKey(),
  cacheKey: varchar("cache_key").notNull().unique(), // Hash of input parameters
  suggestionType: varchar("suggestion_type").notNull(), // 'cart_suggestions', 'upsell', 'bundle', 'seasonal'
  inputData: jsonb("input_data").notNull(), // Original input that generated suggestions
  suggestions: jsonb("suggestions").notNull(), // AI-generated suggestions
  expiresAt: timestamp("expires_at").notNull(), // Cache expiration
  createdAt: timestamp("created_at").defaultNow(),
});



// Relations for new tables
export const draftOrderRelations = relations(draftOrders, ({ one, many }) => ({
  customer: one(users, {
    fields: [draftOrders.customerId],
    references: [users.id],
  }),
  deliveryAddress: one(deliveryAddresses, {
    fields: [draftOrders.deliveryAddressId],
    references: [deliveryAddresses.id],
  }),
  items: many(draftOrderItems),
}));

export const draftOrderItemRelations = relations(draftOrderItems, ({ one }) => ({
  draftOrder: one(draftOrders, {
    fields: [draftOrderItems.draftOrderId],
    references: [draftOrders.id],
  }),
  product: one(products, {
    fields: [draftOrderItems.productId],
    references: [products.id],
  }),
}));

export const wishlistItemRelations = relations(wishlistItems, ({ one }) => ({
  customer: one(users, {
    fields: [wishlistItems.customerId],
    references: [users.id],
  }),
  product: one(products, {
    fields: [wishlistItems.productId],
    references: [products.id],
  }),
}));

export const orderTemplateRelations = relations(orderTemplates, ({ one, many }) => ({
  customer: one(users, {
    fields: [orderTemplates.customerId],
    references: [users.id],
  }),
  deliveryAddress: one(deliveryAddresses, {
    fields: [orderTemplates.deliveryAddressId],
    references: [deliveryAddresses.id],
  }),
  items: many(orderTemplateItems),
}));

export const orderTemplateItemRelations = relations(orderTemplateItems, ({ one }) => ({
  template: one(orderTemplates, {
    fields: [orderTemplateItems.templateId],
    references: [orderTemplates.id],
  }),
  product: one(products, {
    fields: [orderTemplateItems.productId],
    references: [products.id],
  }),
}));

// Insert schemas for new tables
export const insertDraftOrderSchema = createInsertSchema(draftOrders);
export const insertDraftOrderItemSchema = createInsertSchema(draftOrderItems);
export const insertWishlistItemSchema = createInsertSchema(wishlistItems);
export const insertOrderTemplateSchema = createInsertSchema(orderTemplates);
export const insertOrderTemplateItemSchema = createInsertSchema(orderTemplateItems);
export const insertAiSuggestionSchema = createInsertSchema(aiSuggestions);


// AI Purchase Order Processing Tables
export const aiInvoiceProcessing = pgTable('ai_invoice_processing', {
  id: serial('id').primaryKey(),
  originalFileName: text('original_file_name').notNull(),
  fileType: text('file_type').notNull(), // 'image' or 'pdf'
  filePath: text('file_path').notNull(),
  uploadedBy: text('uploaded_by').notNull(),
  userId: text('user_id').notNull(), // Match database constraint
  extractedData: json('extracted_data'), // Raw OpenAI extraction
  processingStatus: text('processing_status').default('pending'), // pending, processed, approved, rejected
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const aiProductSuggestions = pgTable('ai_product_suggestions', {
  id: serial('id').primaryKey(),
  invoiceId: integer('invoice_id').references(() => aiInvoiceProcessing.id),
  extractedProductName: text('extracted_product_name').notNull(),
  extractedSku: text('extracted_sku'),
  extractedDescription: text('extracted_description'),
  extractedQuantity: integer('extracted_quantity').notNull(),
  extractedUnitCost: decimal('extracted_unit_cost', { precision: 10, scale: 2 }).notNull(),
  extractedTotalCost: decimal('extracted_total_cost', { precision: 10, scale: 2 }).notNull(),
  
  // AI Mapping Results
  suggestedProductId: integer('suggested_product_id').references(() => products.id),
  matchConfidence: decimal('match_confidence', { precision: 5, scale: 2 }), // 0-100%
  matchReasoning: text('match_reasoning'),
  
  // Category Suggestions
  suggestedCategoryId: integer('suggested_category_id').references(() => categories.id),
  suggestedCategoryName: text('suggested_category_name'),
  
  // User Decisions
  userAction: text('user_action'), // 'map_existing', 'create_new', 'skip'
  finalProductId: integer('final_product_id').references(() => products.id),
  userSetUnitCost: decimal('user_set_unit_cost', { precision: 10, scale: 2 }),
  userSetSalePrice: decimal('user_set_sale_price', { precision: 10, scale: 2 }),
  
  // Status
  approved: boolean('approved').default(false),
  createdAt: timestamp('created_at').defaultNow()
});

export const insertAiInvoiceProcessingSchema = createInsertSchema(aiInvoiceProcessing);
export const insertAiProductSuggestionSchema = createInsertSchema(aiProductSuggestions);

// Export all AI types
export type AiInvoiceProcessing = typeof aiInvoiceProcessing.$inferSelect;
export type AiProductSuggestion = typeof aiProductSuggestions.$inferSelect;
export type InsertAiInvoiceProcessing = z.infer<typeof insertAiInvoiceProcessingSchema>;
export type InsertAiProductSuggestion = z.infer<typeof insertAiProductSuggestionSchema>;

// Export types - moved to end of file to avoid duplicates

// Excel exports for AI-powered reports (consolidated with existing definition below)

// Multi-payment methods for split payments (cash + check combinations)
export const orderPayments = pgTable("order_payments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id, { onDelete: "cascade" }).notNull(),
  paymentMethod: varchar("payment_method").notNull(), // 'cash', 'check', 'split'
  amount: doublePrecision("amount").notNull(),
  checkNumber: varchar("check_number"),
  checkBank: varchar("check_bank"),
  notes: text("notes"),
  processedBy: varchar("processed_by").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Receipt printing queue for batch printing
export const printQueue = pgTable("print_queue", {
  id: serial("id").primaryKey(),
  type: varchar("type").notNull(), // 'receipt', 'invoice', 'packing_slip', 'label'
  orderId: integer("order_id").references(() => orders.id),
  customerId: varchar("customer_id").references(() => users.id),
  status: varchar("status").default("pending"), // 'pending', 'printing', 'completed', 'failed'
  priority: integer("priority").default(1), // 1=high, 2=medium, 3=low
  copies: integer("copies").default(1),
  printerName: varchar("printer_name"),
  jobData: jsonb("job_data"), // Store receipt/invoice data
  createdBy: varchar("created_by").notNull(),
  processedAt: timestamp("processed_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Excel export templates and history
export const excelExports = pgTable("excel_exports", {
  id: serial("id").primaryKey(),
  exportType: varchar("export_type").notNull(), // 'sales', 'customers', 'inventory', 'trends', 'business_report'
  fileName: varchar("file_name").notNull(),
  filePath: varchar("file_path"),
  status: varchar("status").default("generating"), // 'generating', 'completed', 'failed'
  parameters: jsonb("parameters"), // Export parameters (date range, filters, etc.)
  generatedBy: varchar("generated_by").notNull(),
  downloadCount: integer("download_count").default(0),
  expiresAt: timestamp("expires_at"), // Auto-delete after certain time
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at"),
});

// Customer Credit Account Management
export const customerCreditAccounts = pgTable("customer_credit_accounts", {
  id: serial("id").primaryKey(),
  customerId: varchar("customer_id").notNull(),
  creditLimit: numeric("credit_limit", { precision: 10, scale: 2 }).default("0.00"),
  currentBalance: numeric("current_balance", { precision: 10, scale: 2 }).default("0.00"),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Track invoice payments and "on account" transactions
export const invoicePayments = pgTable("invoice_payments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  customerId: varchar("customer_id").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  paymentType: varchar("payment_type").notNull(), // 'cash', 'check', 'electronic', 'on_account'
  checkNumber: varchar("check_number"), // For check payments
  paymentNotes: text("payment_notes"),
  isPaid: boolean("is_paid").default(false),
  paidAt: timestamp("paid_at"),
  paidBy: varchar("paid_by"), // Staff/admin who processed payment
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Track credit transactions (charges and payments)
export const creditTransactions = pgTable("credit_transactions", {
  id: serial("id").primaryKey(),
  customerId: varchar("customer_id").notNull(),
  orderId: integer("order_id"), // If related to an order
  invoicePaymentId: integer("invoice_payment_id"), // If related to an invoice payment
  transactionType: varchar("transaction_type").notNull(), // 'charge', 'payment', 'adjustment'
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  description: text("description"),
  processedBy: varchar("processed_by").notNull(), // Staff/admin who processed
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertOrderPaymentSchema = createInsertSchema(orderPayments);
export const insertPrintQueueSchema = createInsertSchema(printQueue);
export const insertExcelExportSchema = createInsertSchema(excelExports);
export const insertCustomerCreditAccountSchema = createInsertSchema(customerCreditAccounts);
export const insertInvoicePaymentSchema = createInsertSchema(invoicePayments);
export const insertCreditTransactionSchema = createInsertSchema(creditTransactions);

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type InsertCategory = typeof categories.$inferInsert;
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type CartItem = typeof cartItems.$inferSelect;
export type InsertCartItem = typeof cartItems.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;
export type DeliveryAddress = typeof deliveryAddresses.$inferSelect;
export type InsertDeliveryAddress = typeof deliveryAddresses.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;
export type OrderSettings = typeof orderSettings.$inferSelect;
export type InsertOrderSettings = typeof orderSettings.$inferInsert;
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;
export type InsertPurchaseOrder = typeof purchaseOrders.$inferInsert;
export type PurchaseOrderItem = typeof purchaseOrderItems.$inferSelect;
export type InsertPurchaseOrderItem = typeof purchaseOrderItems.$inferInsert;
export type ProductPricingHistory = typeof productPricingHistory.$inferSelect;
export type InsertProductPricingHistory = typeof productPricingHistory.$inferInsert;
// In-app notification types removed
export type DeviceToken = typeof deviceTokens.$inferSelect;
export type InsertDeviceToken = typeof deviceTokens.$inferInsert;
export type PushNotificationSettings = typeof pushNotificationSettings.$inferSelect;
export type InsertPushNotificationSettings = typeof pushNotificationSettings.$inferInsert;
export type PushNotificationLog = typeof pushNotificationLogs.$inferSelect;
export type InsertPushNotificationLog = typeof pushNotificationLogs.$inferInsert;
export type CustomerPriceMemory = typeof customerPriceMemory.$inferSelect;
export type InsertCustomerPriceMemory = typeof customerPriceMemory.$inferInsert;
export type OrderPayment = typeof orderPayments.$inferSelect;
export type InsertOrderPayment = typeof orderPayments.$inferInsert;
export type PrintQueue = typeof printQueue.$inferSelect;
export type InsertPrintQueue = typeof printQueue.$inferInsert;
export type ExcelExport = typeof excelExports.$inferSelect;
export type InsertExcelExport = typeof excelExports.$inferInsert;
export type CustomerCreditAccount = typeof customerCreditAccounts.$inferSelect;
export type InsertCustomerCreditAccount = typeof customerCreditAccounts.$inferInsert;
export type InvoicePayment = typeof invoicePayments.$inferSelect;
export type InsertInvoicePayment = typeof invoicePayments.$inferInsert;
export type CreditTransaction = typeof creditTransactions.$inferSelect;
export type InsertCreditTransaction = typeof creditTransactions.$inferInsert;
export type DraftOrder = typeof draftOrders.$inferSelect;
export type InsertDraftOrder = typeof draftOrders.$inferInsert;
export type DraftOrderItem = typeof draftOrderItems.$inferSelect;
export type InsertDraftOrderItem = typeof draftOrderItems.$inferInsert;
export type WishlistItem = typeof wishlistItems.$inferSelect;
export type InsertWishlistItem = typeof wishlistItems.$inferInsert;
export type OrderTemplate = typeof orderTemplates.$inferSelect;
export type InsertOrderTemplate = typeof orderTemplates.$inferInsert;
export type OrderTemplateItem = typeof orderTemplateItems.$inferSelect;
export type InsertOrderTemplateItem = typeof orderTemplateItems.$inferInsert;
export type AiSuggestion = typeof aiSuggestions.$inferSelect;
export type InsertAiSuggestion = typeof aiSuggestions.$inferInsert;


// AI Recommendation Tracking table for analytics
export const aiRecommendationTracking = pgTable("ai_recommendation_tracking", {
  id: serial("id").primaryKey(),
  customerId: varchar("customer_id").notNull().references(() => users.id),
  sessionId: varchar("session_id").notNull(), // Unique session identifier
  recommendationType: varchar("recommendation_type").notNull(), // 'checkout', 'product_page', 'cart', etc.
  suggestedProductId: integer("suggested_product_id").notNull().references(() => products.id),
  suggestedProductName: varchar("suggested_product_name").notNull(),
  suggestedPrice: doublePrecision("suggested_price").notNull(),
  suggestionContext: jsonb("suggestion_context"), // Context data (cart items, current product, etc.)
  isViewed: boolean("is_viewed").default(true), // AI suggestion was displayed
  isClicked: boolean("is_clicked").default(false), // User clicked on suggestion
  isAddedToCart: boolean("is_added_to_cart").default(false), // User added to cart
  isPurchased: boolean("is_purchased").default(false), // User completed order with this item
  orderId: integer("order_id").references(() => orders.id), // Final order if purchased
  timeToAction: integer("time_to_action"), // Seconds from suggestion to action
  createdAt: timestamp("created_at").defaultNow(),
  clickedAt: timestamp("clicked_at"),
  addedToCartAt: timestamp("added_to_cart_at"),
  purchasedAt: timestamp("purchased_at"),
});

export type AiRecommendationTracking = typeof aiRecommendationTracking.$inferSelect;
export type InsertAiRecommendationTracking = typeof aiRecommendationTracking.$inferInsert;

// SMS and Email notification logs for tracking and debugging
export const smsNotificationLogs = pgTable("sms_notification_logs", {
  id: serial("id").primaryKey(),
  customerId: varchar("customer_id").notNull().references(() => users.id),
  phoneNumber: varchar("phone_number").notNull(),
  messageType: varchar("message_type").notNull(), // 'order_confirmation', 'status_update', 'promotion', etc.
  messageContent: text("message_content").notNull(),
  detectedLanguage: varchar("detected_language").notNull().default("en"),
  characterCount: integer("character_count").notNull(),
  twilioSid: varchar("twilio_sid"), // Twilio message SID for tracking
  deliveryStatus: varchar("delivery_status").default("pending"), // 'pending', 'sent', 'delivered', 'failed'
  errorMessage: text("error_message"),
  cost: doublePrecision("cost"), // SMS cost in USD
  orderId: integer("order_id").references(() => orders.id),
  createdAt: timestamp("created_at").defaultNow(),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
});

export const emailNotificationLogs = pgTable("email_notification_logs", {
  id: serial("id").primaryKey(),
  customerId: varchar("customer_id").notNull().references(() => users.id),
  emailAddress: varchar("email_address").notNull(),
  messageType: varchar("message_type").notNull(), // 'order_confirmation', 'status_update', 'promotion', etc.
  subject: varchar("subject").notNull(),
  messageContent: text("message_content").notNull(),
  detectedLanguage: varchar("detected_language").notNull().default("en"),
  sendgridMessageId: varchar("sendgrid_message_id"), // SendGrid message ID for tracking
  deliveryStatus: varchar("delivery_status").default("pending"), // 'pending', 'sent', 'delivered', 'opened', 'failed'
  errorMessage: text("error_message"),
  orderId: integer("order_id").references(() => orders.id),
  createdAt: timestamp("created_at").defaultNow(),
  sentAt: timestamp("sent_at"),
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"),
});

// Notification templates for different languages and message types
export const notificationTemplates = pgTable("notification_templates", {
  id: serial("id").primaryKey(),
  messageType: varchar("message_type").notNull(), // 'order_confirmation', 'status_update', etc.
  language: varchar("language").notNull().default("en"),
  deliveryMethod: varchar("delivery_method").notNull(), // 'sms', 'email'
  subject: varchar("subject"), // For email only
  template: text("template").notNull(), // Template with placeholders like {{customerName}}, {{orderNumber}}
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notification queue for processing async notifications
// notificationQueue table removed - in-app notifications eliminated

// Account creation requests table
export const accountRequests = pgTable("account_requests", {
  id: serial("id").primaryKey(),
  // Business information
  businessName: varchar("business_name").notNull(),
  contactFirstName: varchar("contact_first_name").notNull(),
  contactLastName: varchar("contact_last_name").notNull(),
  email: varchar("email").notNull(),
  phone: varchar("phone").notNull(), // Cell phone for SMS notifications
  businessPhone: varchar("business_phone"), // Business phone (may be landline) 
  feinNumber: varchar("fein_number"), // Optional field
  
  // Account credentials (user-provided)
  requestedUsername: varchar("requested_username").notNull(),
  passwordHash: varchar("password_hash").notNull(), // Store securely hashed
  
  // Business details
  businessType: varchar("business_type"),
  businessAddress: text("business_address"),
  city: varchar("city"),
  state: varchar("state"),
  postalCode: varchar("postal_code"),
  
  // Additional information
  stateTaxId: varchar("state_tax_id"),
  tobaccoLicense: varchar("tobacco_license"),

  businessDescription: text("business_description"),
  
  // Communication consent preferences
  emailNotifications: boolean("email_notifications").default(false),
  smsNotifications: boolean("sms_notifications").default(false),
  transactionalSmsConsent: boolean("transactional_sms_consent").default(false),
  marketingSmsConsent: boolean("marketing_sms_consent").default(false),
  privacyPolicyAgreement: boolean("privacy_policy_agreement").default(false),
  
  // TCPA Compliance tracking for consent data
  ipAddress: varchar("ip_address"), // IP address when consent was given
  userAgent: text("user_agent"), // Browser/device info when consent was given
  consentTimestamp: timestamp("consent_timestamp").defaultNow(), // When consent was captured
  
  // Status tracking
  status: varchar("status").default("pending"), // pending, approved, rejected
  adminNotes: text("admin_notes"),
  approvedBy: varchar("approved_by"), // Admin user ID who approved
  
  // Account creation details (filled when approved)
  assignedCustomerLevel: integer("assigned_customer_level"),
  assignedCreditLimit: doublePrecision("assigned_credit_limit"),
  createdUserId: varchar("created_user_id"), // ID of created user account
  
  // Timestamps
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  processedAt: timestamp("processed_at"), // When approved/rejected
});

export type SmsNotificationLog = typeof smsNotificationLogs.$inferSelect;
export type InsertSmsNotificationLog = typeof smsNotificationLogs.$inferInsert;
export type EmailNotificationLog = typeof emailNotificationLogs.$inferSelect;
export type InsertEmailNotificationLog = typeof emailNotificationLogs.$inferInsert;
export type NotificationTemplate = typeof notificationTemplates.$inferSelect;
export type InsertNotificationTemplate = typeof notificationTemplates.$inferInsert;
// NotificationQueue types removed with in-app notifications
export type AccountRequest = typeof accountRequests.$inferSelect;
export type InsertAccountRequest = typeof accountRequests.$inferInsert;

// Enhanced Tax System for POS
export const taxCategories = pgTable('tax_categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const taxes = pgTable('taxes', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  rate: decimal('rate', { precision: 8, scale: 4 }).notNull(), // e.g., 0.0875 for 8.75%
  type: varchar('type', { length: 20 }).default('percentage'), // percentage, fixed
  description: text('description'),
  isActive: boolean('is_active').default(true),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const customerTaxExemptions = pgTable('customer_tax_exemptions', {
  id: serial('id').primaryKey(),
  customerId: varchar('customer_id').references(() => users.id),
  taxId: integer('tax_id').references(() => taxes.id),
  exemptionType: varchar('exemption_type', { length: 20 }).default('full'), // full, partial
  partialRate: decimal('partial_rate', { precision: 8, scale: 4 }), // for partial exemptions
  reason: text('reason'),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const productTaxAssignments = pgTable('product_tax_assignments', {
  id: serial('id').primaryKey(),
  productId: integer('product_id').references(() => products.id),
  taxId: integer('tax_id').references(() => taxes.id),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow()
});

export const categoryTaxAssignments = pgTable('category_tax_assignments', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').references(() => categories.id),
  taxId: integer('tax_id').references(() => taxes.id),
  isActive: boolean('is_active').default(true),
  createdAt: timestamp('created_at').defaultNow()
});

// Customer Pricing Memory System
export const customerPricingMemory = pgTable('customer_pricing_memory', {
  id: serial('id').primaryKey(),
  customerId: varchar('customer_id').references(() => users.id),
  productId: integer('product_id').references(() => products.id),
  specialPrice: decimal('special_price', { precision: 10, scale: 2 }).notNull(),
  originalPrice: decimal('original_price', { precision: 10, scale: 2 }).notNull(),
  reason: text('reason'),
  setBy: varchar('set_by').references(() => users.id), // staff member who set the price
  isActive: boolean('is_active').default(true),
  expiresAt: timestamp('expires_at'), // optional expiration
  lastUsed: timestamp('last_used'),
  useCount: integer('use_count').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// Customer Credit Line System
export const customerCreditLines = pgTable('customer_credit_lines', {
  id: serial('id').primaryKey(),
  customerId: varchar('customer_id').references(() => users.id).notNull(),
  creditLimit: decimal('credit_limit', { precision: 10, scale: 2 }).notNull(),
  currentBalance: decimal('current_balance', { precision: 10, scale: 2 }).default('0.00'),
  availableCredit: decimal('available_credit', { precision: 10, scale: 2 }).notNull(),
  paymentTerms: varchar('payment_terms', { length: 50 }).default('Net 30'), // Net 30, Net 15, etc.
  interestRate: decimal('interest_rate', { precision: 8, scale: 4 }).default('0.0000'),
  lastPaymentDate: timestamp('last_payment_date'),
  lastPaymentAmount: decimal('last_payment_amount', { precision: 10, scale: 2 }),
  isActive: boolean('is_active').default(true),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

export const creditLineTransactions = pgTable('credit_line_transactions', {
  id: serial('id').primaryKey(),
  creditLineId: integer('credit_line_id').references(() => customerCreditLines.id),
  transactionType: varchar('transaction_type', { length: 20 }).notNull(), // charge, payment, adjustment
  amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
  balanceAfter: decimal('balance_after', { precision: 10, scale: 2 }).notNull(),
  description: text('description'),
  referenceNumber: varchar('reference_number', { length: 100 }),
  orderId: integer('order_id').references(() => orders.id), // for order-related charges
  processedBy: varchar('processed_by').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow()
});

// POS specific tables for warehouse operations
export const posTransactions = pgTable("pos_transactions", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id), // Link to existing order if applicable
  customerId: varchar("customer_id").references(() => users.id),
  transactionNumber: varchar("transaction_number").notNull().unique(),
  userId: varchar("user_id").references(() => users.id).notNull(), // Staff member processing
  total: doublePrecision("total").notNull(),
  subtotal: doublePrecision("subtotal").notNull(),
  tax: doublePrecision("tax").default(0),
  discount: doublePrecision("discount").default(0),
  status: varchar("status").notNull().default("completed"), // completed, voided, returned
  paymentMethod: varchar("payment_method").notNull(), // cash, check, credit_card, account_credit
  cashReceived: doublePrecision("cash_received"),
  cashChange: doublePrecision("cash_change"),
  checkNumber: varchar("check_number"),
  notes: text("notes"),
  voidReason: text("void_reason"),
  voidedAt: timestamp("voided_at"),
  voidedBy: varchar("voided_by").references(() => users.id),
  managerOverride: boolean("manager_override").default(false),
  managerApprovalBy: varchar("manager_approval_by").references(() => users.id),
  receiptPrinted: boolean("receipt_printed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const posTransactionItems = pgTable("pos_transaction_items", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id").references(() => posTransactions.id, { onDelete: "cascade" }).notNull(),
  productId: integer("product_id").references(() => products.id).notNull(),
  quantity: integer("quantity").notNull(),
  unitPrice: doublePrecision("unit_price").notNull(),
  originalPrice: doublePrecision("original_price").notNull(), // Before any manual adjustments
  discount: doublePrecision("discount").default(0),
  tax: doublePrecision("tax").default(0),
  subtotal: doublePrecision("subtotal").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const posHeldTransactions = pgTable("pos_held_transactions", {
  id: serial("id").primaryKey(),
  customerId: varchar("customer_id").references(() => users.id),
  userId: varchar("user_id").references(() => users.id).notNull(),
  transactionName: varchar("transaction_name").notNull(), // User-friendly name
  items: jsonb("items").notNull(), // Stored cart items as JSON
  subtotal: doublePrecision("subtotal").notNull(),
  tax: doublePrecision("tax").default(0),
  total: doublePrecision("total").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const posSettings = pgTable("pos_settings", {
  id: serial("id").primaryKey(),
  businessName: varchar("business_name").notNull(),
  businessAddress: text("business_address"),
  businessPhone: varchar("business_phone"),
  businessEmail: varchar("business_email"),
  taxRate: doublePrecision("tax_rate").default(0),
  receiptHeader: text("receipt_header"),
  receiptFooter: text("receipt_footer"),
  autoApplyTax: boolean("auto_apply_tax").default(true),
  requireManagerVoid: boolean("require_manager_void").default(true),
  allowNegativeStock: boolean("allow_negative_stock").default(false),
  roundingMethod: varchar("rounding_method").default("nearest_cent"), // nearest_cent, up, down
  defaultPaymentMethod: varchar("default_payment_method").default("cash"),
  printerSettings: jsonb("printer_settings"),
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: varchar("updated_by").references(() => users.id),
});

// POS audit logs for security and tracking
export const posAuditLogs = pgTable("pos_audit_logs", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id).notNull(),
  action: varchar("action").notNull(), // login, logout, transaction, void, override, etc.
  resourceType: varchar("resource_type"), // transaction, product, customer
  resourceId: varchar("resource_id"),
  details: text("details").notNull(),
  ipAddress: varchar("ip_address"),
  sessionId: varchar("session_id"),
  timestamp: timestamp("timestamp").defaultNow(),
});

// Relations for POS tables
export const posTransactionRelations = relations(posTransactions, ({ one, many }) => ({
  customer: one(users, {
    fields: [posTransactions.customerId],
    references: [users.id],
  }),
  user: one(users, {
    fields: [posTransactions.userId],
    references: [users.id],
  }),
  order: one(orders, {
    fields: [posTransactions.orderId],
    references: [orders.id],
  }),
  items: many(posTransactionItems),
}));

export const posTransactionItemRelations = relations(posTransactionItems, ({ one }) => ({
  transaction: one(posTransactions, {
    fields: [posTransactionItems.transactionId],
    references: [posTransactions.id],
  }),
  product: one(products, {
    fields: [posTransactionItems.productId],
    references: [products.id],
  }),
}));

export const posHeldTransactionRelations = relations(posHeldTransactions, ({ one }) => ({
  customer: one(users, {
    fields: [posHeldTransactions.customerId],
    references: [users.id],
  }),
  user: one(users, {
    fields: [posHeldTransactions.userId],
    references: [users.id],
  }),
}));

// Insert schemas for POS tables
export const insertPosTransactionSchema = createInsertSchema(posTransactions);
export const insertPosTransactionItemSchema = createInsertSchema(posTransactionItems);
export const insertPosHeldTransactionSchema = createInsertSchema(posHeldTransactions);
export const insertPosSettingsSchema = createInsertSchema(posSettings);
export const insertPosAuditLogSchema = createInsertSchema(posAuditLogs);

// POS types
export type PosTransaction = typeof posTransactions.$inferSelect;
export type InsertPosTransaction = typeof posTransactions.$inferInsert;
export type PosTransactionItem = typeof posTransactionItems.$inferSelect;
export type InsertPosTransactionItem = typeof posTransactionItems.$inferInsert;
export type PosHeldTransaction = typeof posHeldTransactions.$inferSelect;
export type InsertPosHeldTransaction = typeof posHeldTransactions.$inferInsert;
export type PosSettings = typeof posSettings.$inferSelect;
export type InsertPosSettings = typeof posSettings.$inferInsert;
export type PosAuditLog = typeof posAuditLogs.$inferSelect;
export type InsertPosAuditLog = typeof posAuditLogs.$inferInsert;

// Zod schemas for validation
export const insertAccountRequestSchema = createInsertSchema(accountRequests).omit({ 
  id: true, 
  status: true,
  adminNotes: true,
  approvedBy: true,
  assignedCustomerLevel: true,
  assignedCreditLimit: true,
  createdUserId: true,
  passwordHash: true, // Exclude the hash field, use the plain password field
  ipAddress: true, // Will be populated server-side 
  userAgent: true, // Will be populated server-side
  consentTimestamp: true, // Will be populated server-side
  createdAt: true,
  updatedAt: true,
  processedAt: true,
}).extend({
  // Add password field for frontend validation (not stored directly)
  password: z.string().min(6, "Password must be at least 6 characters"),
  // Add privacy policy agreement field for frontend validation (not stored in DB)
  privacyPolicyAgreement: z.boolean().refine(val => val === true, {
    message: "You must agree to the Privacy Policy to continue"
  }),
  // Handle businessType as either string or array (frontend sends array)
  businessType: z.union([
    z.string(),
    z.array(z.string()).transform((arr) => arr.join(', '))
  ]).optional(),
});

// Receipt tracking for sent PDF receipts
export const receipts = pgTable("receipts", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull(),
  customerEmail: varchar("customer_email").notNull(),
  sentAt: timestamp("sent_at").defaultNow(),
  sentBy: varchar("sent_by").notNull(), // 'automatic' or 'manual'
  createdAt: timestamp("created_at").defaultNow(),
});

// AI-generated recommendations with 3-day refresh cycle
export const aiRecommendations = pgTable("ai_recommendations", {
  id: serial("id").primaryKey(),
  refreshCycle: integer("refresh_cycle").notNull(), // Sequential cycle number
  generatedAt: timestamp("generated_at").defaultNow(),
  validUntil: timestamp("valid_until").notNull(), // 3 days from generation
  contextData: jsonb("context_data").notNull(), // Seasonal data, trends, etc.
  recommendations: jsonb("recommendations").notNull(), // Array of product IDs with reasons
  isActive: boolean("is_active").default(true),
  totalProducts: integer("total_products").notNull(),
  aiModel: varchar("ai_model").default("gpt-4o"),
  generationTimeMs: integer("generation_time_ms"),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Receipt = typeof receipts.$inferSelect;
export type InsertReceipt = typeof receipts.$inferInsert;
export type EmailCampaign = typeof emailCampaigns.$inferSelect;
export type InsertEmailCampaign = typeof emailCampaigns.$inferInsert;
export type EmailCampaignRecipient = typeof emailCampaignRecipients.$inferSelect;
export type InsertEmailCampaignRecipient = typeof emailCampaignRecipients.$inferInsert;

export type AiRecommendations = typeof aiRecommendations.$inferSelect;
export type InsertAiRecommendations = typeof aiRecommendations.$inferInsert;

// Trusted devices table for POS 30-day device remembering
export const trustedDevices = pgTable("trusted_devices", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  deviceFingerprint: varchar("device_fingerprint").notNull(),
  deviceName: varchar("device_name"), // Optional human-readable name
  ipAddress: varchar("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsedAt: timestamp("last_used_at").defaultNow().notNull(),
});

export const trustedDevicesRelations = relations(trustedDevices, ({ one }) => ({
  user: one(users, {
    fields: [trustedDevices.userId],
    references: [users.id],
  }),
}));

export const insertTrustedDeviceSchema = createInsertSchema(trustedDevices);
export type InsertTrustedDevice = z.infer<typeof insertTrustedDeviceSchema>;
export type TrustedDevice = typeof trustedDevices.$inferSelect;

// ===== ADVANCED POS REPORTING & SECURITY TABLES =====

// Till Management - Track cash drawer opening/closing counts
export const tillSessions = pgTable("till_sessions", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  sessionType: varchar("session_type").notNull(), // 'open', 'close', 'drop', 'pickup'
  startingCash: decimal("starting_cash", { precision: 10, scale: 2 }).default("0.00"),
  endingCash: decimal("ending_cash", { precision: 10, scale: 2 }),
  expectedCash: decimal("expected_cash", { precision: 10, scale: 2 }),
  variance: decimal("variance", { precision: 10, scale: 2 }),
  openedAt: timestamp("opened_at").defaultNow(),
  closedAt: timestamp("closed_at"),
  notes: text("notes"),
  managerOverride: boolean("manager_override").default(false),
  overrideReason: text("override_reason"),
  overrideBy: varchar("override_by"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Cash Drops & Pickups - Track money movements during shifts
export const cashMovements = pgTable("cash_movements", {
  id: serial("id").primaryKey(),
  tillSessionId: integer("till_session_id").references(() => tillSessions.id),
  userId: varchar("user_id").notNull(),
  movementType: varchar("movement_type").notNull(), // 'drop', 'pickup', 'payout', 'bank'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  reason: text("reason").notNull(),
  approvedBy: varchar("approved_by"), // Manager who approved
  receiptNumber: varchar("receipt_number"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Audit Trail - Complete transaction and system activity logging
export const auditTrail = pgTable("audit_trail", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  action: varchar("action").notNull(), // 'sale', 'void', 'return', 'discount', 'price_override', 'login', 'till_open'
  entityType: varchar("entity_type"), // 'transaction', 'product', 'customer', 'till'
  entityId: varchar("entity_id"), // ID of affected entity
  originalData: jsonb("original_data"), // Data before change
  newData: jsonb("new_data"), // Data after change
  amount: decimal("amount", { precision: 10, scale: 2 }), // For financial actions
  reason: text("reason"),
  managerOverride: boolean("manager_override").default(false),
  overrideBy: varchar("override_by"),
  ipAddress: varchar("ip_address"),
  sessionId: varchar("session_id"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Void Tracking - Monitor all cancelled/voided transactions
export const voidedTransactions = pgTable("voided_transactions", {
  id: serial("id").primaryKey(),
  originalTransactionId: integer("original_transaction_id"),
  posTransactionId: integer("pos_transaction_id").references(() => posTransactions.id),
  voidedBy: varchar("voided_by").notNull(),
  voidReason: varchar("void_reason").notNull(), // 'customer_request', 'error', 'manager_decision', 'system_error'
  originalAmount: decimal("original_amount", { precision: 10, scale: 2 }).notNull(),
  voidAmount: decimal("void_amount", { precision: 10, scale: 2 }).notNull(),
  partialVoid: boolean("partial_void").default(false),
  managerApproval: boolean("manager_approval").default(false),
  approvedBy: varchar("approved_by"),
  approvalTime: timestamp("approval_time"),
  reasonDetails: text("reason_details"),
  refundMethod: varchar("refund_method"), // 'cash', 'card', 'store_credit'
  refundReference: varchar("refund_reference"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Cashier Performance Tracking
export const cashierPerformance = pgTable("cashier_performance", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull(),
  shiftDate: date("shift_date").notNull(),
  transactionCount: integer("transaction_count").default(0),
  totalSales: decimal("total_sales", { precision: 10, scale: 2 }).default("0.00"),
  averageTransaction: decimal("average_transaction", { precision: 10, scale: 2 }).default("0.00"),
  voidCount: integer("void_count").default(0),
  voidPercentage: decimal("void_percentage", { precision: 5, scale: 2 }).default("0.00"),
  returnsCount: integer("returns_count").default(0),
  discountsGiven: decimal("discounts_given", { precision: 10, scale: 2 }).default("0.00"),
  overridesUsed: integer("overrides_used").default(0),
  shiftStart: timestamp("shift_start"),
  shiftEnd: timestamp("shift_end"),
  hoursWorked: decimal("hours_worked", { precision: 5, scale: 2 }),
  salesPerHour: decimal("sales_per_hour", { precision: 10, scale: 2 }),
  accuracy: decimal("accuracy", { precision: 5, scale: 2 }).default("100.00"), // Based on till variance
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Product Movement Tracking - Fast/slow sellers analysis
export const productMovement = pgTable("product_movement", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").notNull().references(() => products.id),
  date: date("date").notNull(),
  quantitySold: integer("quantity_sold").default(0),
  revenue: decimal("revenue", { precision: 10, scale: 2 }).default("0.00"),
  cost: decimal("cost", { precision: 10, scale: 2 }).default("0.00"),
  profit: decimal("profit", { precision: 10, scale: 2 }).default("0.00"),
  returns: integer("returns").default(0),
  netSold: integer("net_sold").default(0), // Sold minus returns
  averagePrice: decimal("average_price", { precision: 10, scale: 2 }),
  transactionCount: integer("transaction_count").default(0), // How many transactions included this product
  customerCount: integer("customer_count").default(0), // Unique customers who bought this
  peakHour: integer("peak_hour"), // Hour of day with most sales (0-23)
  slowestHour: integer("slowest_hour"), // Hour with least sales
  createdAt: timestamp("created_at").defaultNow(),
});

// Hourly Sales Tracking - Peak hours analysis
export const hourlySales = pgTable("hourly_sales", {
  id: serial("id").primaryKey(),
  date: date("date").notNull(),
  hour: integer("hour").notNull(), // 0-23
  transactionCount: integer("transaction_count").default(0),
  totalSales: decimal("total_sales", { precision: 10, scale: 2 }).default("0.00"),
  averageTransaction: decimal("average_transaction", { precision: 10, scale: 2 }).default("0.00"),
  customerCount: integer("customer_count").default(0),
  itemCount: integer("item_count").default(0),
  discounts: decimal("discounts", { precision: 10, scale: 2 }).default("0.00"),
  tax: decimal("tax", { precision: 10, scale: 2 }).default("0.00"),
  paymentCash: decimal("payment_cash", { precision: 10, scale: 2 }).default("0.00"),
  paymentCard: decimal("payment_card", { precision: 10, scale: 2 }).default("0.00"),
  paymentCredit: decimal("payment_credit", { precision: 10, scale: 2 }).default("0.00"),
  createdAt: timestamp("created_at").defaultNow(),
});

// End of Day Reports
export const endOfDayReports = pgTable("end_of_day_reports", {
  id: serial("id").primaryKey(),
  reportDate: date("report_date").notNull(),
  generatedBy: varchar("generated_by").notNull(),
  tillSessionId: integer("till_session_id").references(() => tillSessions.id),
  
  // Sales Summary
  transactionCount: integer("transaction_count").default(0),
  totalGrossSales: decimal("total_gross_sales", { precision: 10, scale: 2 }).default("0.00"),
  totalDiscounts: decimal("total_discounts", { precision: 10, scale: 2 }).default("0.00"),
  totalTax: decimal("total_tax", { precision: 10, scale: 2 }).default("0.00"),
  totalNetSales: decimal("total_net_sales", { precision: 10, scale: 2 }).default("0.00"),
  
  // Payment Breakdown
  cashSales: decimal("cash_sales", { precision: 10, scale: 2 }).default("0.00"),
  cardSales: decimal("card_sales", { precision: 10, scale: 2 }).default("0.00"),
  creditSales: decimal("credit_sales", { precision: 10, scale: 2 }).default("0.00"),
  
  // Cash Reconciliation
  startingCash: decimal("starting_cash", { precision: 10, scale: 2 }).default("0.00"),
  cashSalesTotal: decimal("cash_sales_total", { precision: 10, scale: 2 }).default("0.00"),
  cashDrops: decimal("cash_drops", { precision: 10, scale: 2 }).default("0.00"),
  cashPickups: decimal("cash_pickups", { precision: 10, scale: 2 }).default("0.00"),
  expectedCash: decimal("expected_cash", { precision: 10, scale: 2 }).default("0.00"),
  actualCash: decimal("actual_cash", { precision: 10, scale: 2 }).default("0.00"),
  cashVariance: decimal("cash_variance", { precision: 10, scale: 2 }).default("0.00"),
  
  // Activity Counts
  voidCount: integer("void_count").default(0),
  returnCount: integer("return_count").default(0),
  discountCount: integer("discount_count").default(0),
  overrideCount: integer("override_count").default(0),
  
  // Top Products
  topProducts: jsonb("top_products"), // Top 10 selling products with quantities
  slowProducts: jsonb("slow_products"), // Products with no/low sales
  
  // Peak Performance
  peakHour: integer("peak_hour"),
  peakHourSales: decimal("peak_hour_sales", { precision: 10, scale: 2 }),
  
  // Report Status
  isFinalized: boolean("is_finalized").default(false),
  finalizedAt: timestamp("finalized_at"),
  notes: text("notes"),
  
  createdAt: timestamp("created_at").defaultNow(),
});

// Manager Override Logs
export const managerOverrides = pgTable("manager_overrides", {
  id: serial("id").primaryKey(),
  transactionId: integer("transaction_id"), // If related to a specific transaction
  overrideType: varchar("override_type").notNull(), // 'price', 'discount', 'void', 'return', 'till_variance'
  requestedBy: varchar("requested_by").notNull(), // Cashier who requested
  approvedBy: varchar("approved_by").notNull(), // Manager who approved
  originalValue: decimal("original_value", { precision: 10, scale: 2 }),
  newValue: decimal("new_value", { precision: 10, scale: 2 }),
  reason: text("reason").notNull(),
  requiresPassword: boolean("requires_password").default(true),
  passwordAttempts: integer("password_attempts").default(0),
  approvalTime: timestamp("approval_time").defaultNow(),
  impact: varchar("impact"), // 'low', 'medium', 'high' based on amount
  reviewRequired: boolean("review_required").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Relations for new reporting tables
export const tillSessionRelations = relations(tillSessions, ({ one, many }) => ({
  user: one(users, {
    fields: [tillSessions.userId],
    references: [users.id],
  }),
  movements: many(cashMovements),
  reports: many(endOfDayReports),
}));

export const cashMovementRelations = relations(cashMovements, ({ one }) => ({
  tillSession: one(tillSessions, {
    fields: [cashMovements.tillSessionId],
    references: [tillSessions.id],
  }),
  user: one(users, {
    fields: [cashMovements.userId],
    references: [users.id],
  }),
}));

export const auditTrailRelations = relations(auditTrail, ({ one }) => ({
  user: one(users, {
    fields: [auditTrail.userId],
    references: [users.id],
  }),
}));

export const voidedTransactionRelations = relations(voidedTransactions, ({ one }) => ({
  posTransaction: one(posTransactions, {
    fields: [voidedTransactions.posTransactionId],
    references: [posTransactions.id],
  }),
}));

export const cashierPerformanceRelations = relations(cashierPerformance, ({ one }) => ({
  user: one(users, {
    fields: [cashierPerformance.userId],
    references: [users.id],
  }),
}));

export const productMovementRelations = relations(productMovement, ({ one }) => ({
  product: one(products, {
    fields: [productMovement.productId],
    references: [products.id],
  }),
}));

export const endOfDayReportRelations = relations(endOfDayReports, ({ one }) => ({
  tillSession: one(tillSessions, {
    fields: [endOfDayReports.tillSessionId],
    references: [tillSessions.id],
  }),
}));

export const managerOverrideRelations = relations(managerOverrides, ({ one }) => ({
  requestedByUser: one(users, {
    fields: [managerOverrides.requestedBy],
    references: [users.id],
  }),
  approvedByUser: one(users, {
    fields: [managerOverrides.approvedBy],
    references: [users.id],
  }),
}));

// Insert schemas for reporting tables
export const insertTillSessionSchema = createInsertSchema(tillSessions);
export const insertCashMovementSchema = createInsertSchema(cashMovements);
export const insertAuditTrailSchema = createInsertSchema(auditTrail);
export const insertVoidedTransactionSchema = createInsertSchema(voidedTransactions);
export const insertCashierPerformanceSchema = createInsertSchema(cashierPerformance);
export const insertProductMovementSchema = createInsertSchema(productMovement);
export const insertHourlySalesSchema = createInsertSchema(hourlySales);
export const insertEndOfDayReportSchema = createInsertSchema(endOfDayReports);
export const insertManagerOverrideSchema = createInsertSchema(managerOverrides);

// Types for reporting tables
export type TillSession = typeof tillSessions.$inferSelect;
export type InsertTillSession = typeof tillSessions.$inferInsert;
export type CashMovement = typeof cashMovements.$inferSelect;
export type InsertCashMovement = typeof cashMovements.$inferInsert;
export type AuditTrail = typeof auditTrail.$inferSelect;
export type InsertAuditTrail = typeof auditTrail.$inferInsert;
export type VoidedTransaction = typeof voidedTransactions.$inferSelect;
export type InsertVoidedTransaction = typeof voidedTransactions.$inferInsert;
export type CashierPerformance = typeof cashierPerformance.$inferSelect;
export type InsertCashierPerformance = typeof cashierPerformance.$inferInsert;
export type ProductMovement = typeof productMovement.$inferSelect;
export type InsertProductMovement = typeof productMovement.$inferInsert;
export type HourlySales = typeof hourlySales.$inferSelect;
export type InsertHourlySales = typeof hourlySales.$inferInsert;
export type EndOfDayReport = typeof endOfDayReports.$inferSelect;
export type InsertEndOfDayReport = typeof endOfDayReports.$inferInsert;
export type ManagerOverride = typeof managerOverrides.$inferSelect;
export type InsertManagerOverride = typeof managerOverrides.$inferInsert;

// =============================================================================
// ACCOUNTS RECEIVABLE (A/R) TABLES
// =============================================================================

// A/R Invoice table
export const arInvoices = pgTable('ar_invoices', {
  id: uuid('id').defaultRandom().primaryKey(),
  customerId: varchar('customer_id').notNull().references(() => users.id),
  orderId: integer('order_id').references(() => orders.id),
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
  customerId: varchar('customer_id').notNull().references(() => users.id),
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

// A/R Relations
export const arInvoicesRelations = relations(arInvoices, ({ one, many }) => ({
  customer: one(users, { fields: [arInvoices.customerId], references: [users.id] }),
  order: one(orders, { fields: [arInvoices.orderId], references: [orders.id] }),
  lines: many(arInvoiceLines),
  paymentApplications: many(arPaymentApps),
}));

export const arInvoiceLinesRelations = relations(arInvoiceLines, ({ one }) => ({
  invoice: one(arInvoices, { fields: [arInvoiceLines.invoiceId], references: [arInvoices.id] }),
}));

export const arPaymentsRelations = relations(arPayments, ({ one, many }) => ({
  customer: one(users, { fields: [arPayments.customerId], references: [users.id] }),
  applications: many(arPaymentApps),
}));

export const arPaymentAppsRelations = relations(arPaymentApps, ({ one }) => ({
  payment: one(arPayments, { fields: [arPaymentApps.paymentId], references: [arPayments.id] }),
  invoice: one(arInvoices, { fields: [arPaymentApps.invoiceId], references: [arInvoices.id] }),
}));

// A/R Types for TypeScript
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