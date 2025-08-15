import { pgTable, foreignKey, serial, integer, doublePrecision, timestamp, unique, varchar, text, index, jsonb, date, boolean, primaryKey } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const orderItems = pgTable("order_items", {
        id: serial().primaryKey().notNull(),
        orderId: integer("order_id").notNull(),
        productId: integer("product_id").notNull(),
        quantity: integer().notNull(),
        price: doublePrecision().notNull(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
}, (table) => [
        foreignKey({
                        columns: [table.orderId],
                        foreignColumns: [orders.id],
                        name: "order_items_order_id_orders_id_fk"
                }),
        foreignKey({
                        columns: [table.productId],
                        foreignColumns: [products.id],
                        name: "order_items_product_id_products_id_fk"
                }),
]);

export const categories = pgTable("categories", {
        id: serial().primaryKey().notNull(),
        name: varchar().notNull(),
        description: text(),
}, (table) => [
        unique("categories_name_unique").on(table.name),
]);

export const sessions = pgTable("sessions", {
        sid: varchar().primaryKey().notNull(),
        sess: jsonb().notNull(),
        expire: timestamp({ mode: 'string' }).notNull(),
}, (table) => [
        index("IDX_session_expire").using("btree", table.expire.asc().nullsLast().op("timestamp_ops")),
]);

export const orders = pgTable("orders", {
        id: serial().primaryKey().notNull(),
        userId: varchar("user_id").notNull(),
        total: doublePrecision().notNull(),
        deliveryDate: date("delivery_date"),
        deliveryTimeSlot: varchar("delivery_time_slot"),
        status: varchar().default('processing').notNull(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
        updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
        orderType: varchar("order_type").default('delivery'),
        pickupDate: date("pickup_date"),
        pickupTimeSlot: varchar("pickup_time_slot"),
        notes: text(),
        deliveryFee: doublePrecision("delivery_fee").default(0),
        adminNote: text("admin_note"),
        deliveryNote: text("delivery_note"),
        pickupTime: varchar("pickup_time"),
        deliveryAddressId: integer("delivery_address_id"),
}, (table) => [
        foreignKey({
                        columns: [table.userId],
                        foreignColumns: [users.id],
                        name: "orders_user_id_users_id_fk"
                }),
]);

export const users = pgTable("users", {
        id: varchar().primaryKey().notNull(),
        email: varchar(),
        firstName: varchar("first_name"),
        lastName: varchar("last_name"),
        profileImageUrl: varchar("profile_image_url"),
        company: varchar(),
        isAdmin: boolean("is_admin").default(false),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
        updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
        passwordHash: varchar("password_hash"),
        businessName: varchar("business_name"),
        taxId: varchar("tax_id"),
        businessType: varchar("business_type"),
        phone: varchar(),
        alternativeEmail: varchar("alternative_email"),
        addressLine1: varchar("address_line1"),
        addressLine2: varchar("address_line2"),
        city: varchar(),
        state: varchar(),
        postalCode: varchar("postal_code"),
        country: varchar().default('United States'),
        creditLimit: doublePrecision("credit_limit").default(0),
        currentBalance: doublePrecision("current_balance").default(0),
        paymentTerms: varchar("payment_terms"),
        taxExempt: boolean("tax_exempt").default(false),
        taxExemptionNumber: varchar("tax_exemption_number"),
        notes: text(),
        customerSince: timestamp("customer_since", { mode: 'string' }).defaultNow(),
        preferredDeliveryDay: varchar("preferred_delivery_day"),
        preferredDeliveryTime: varchar("preferred_delivery_time"),
        username: varchar({ length: 255 }).notNull(),
        address: varchar({ length: 255 }),
        customerLevel: integer("customer_level").default(1),
        isEmployee: boolean("is_employee").default(false),
}, (table) => [
        unique("users_email_unique").on(table.email),
        unique("users_username_key").on(table.username),
]);

export const products = pgTable("products", {
        id: serial().primaryKey().notNull(),
        name: varchar().notNull(),
        description: text(),
        price: doublePrecision().notNull(),
        imageUrl: varchar("image_url"),
        stock: integer().default(0).notNull(),
        categoryId: integer("category_id"),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
        updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
        additionalImages: text("additional_images").array(),
        upcCode: varchar("upc_code"),
        sku: varchar(),
        weight: doublePrecision(),
        dimensions: varchar(),
        brand: varchar(),
        featured: boolean().default(false),
        discount: doublePrecision().default(0),
        minOrderQuantity: integer("min_order_quantity").default(1),
        basePrice: doublePrecision("base_price"),
        priceLevel1: doublePrecision("price_level_1"),
        priceLevel2: doublePrecision("price_level_2"),
        priceLevel3: doublePrecision("price_level_3"),
        priceLevel4: doublePrecision("price_level_4"),
        priceLevel5: doublePrecision("price_level_5"),
        size: varchar(),
}, (table) => [
        foreignKey({
                        columns: [table.categoryId],
                        foreignColumns: [categories.id],
                        name: "products_category_id_categories_id_fk"
                }),
        unique("products_upc_code_unique").on(table.upcCode),
]);

export const deliveryAddresses = pgTable("delivery_addresses", {
        id: serial().primaryKey().notNull(),
        userId: varchar("user_id", { length: 255 }).notNull(),
        name: varchar({ length: 255 }).notNull(),
        businessName: varchar("business_name", { length: 255 }),
        addressLine1: varchar("address_line1", { length: 255 }).notNull(),
        addressLine2: varchar("address_line2", { length: 255 }),
        city: varchar({ length: 255 }).notNull(),
        state: varchar({ length: 255 }).notNull(),
        postalCode: varchar("postal_code", { length: 255 }).notNull(),
        country: varchar({ length: 255 }).default('United States'),
        phone: varchar({ length: 255 }),
        isDefault: boolean("is_default").default(false),
        notes: text(),
        createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
        updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
        index("idx_delivery_addresses_is_default").using("btree", table.isDefault.asc().nullsLast().op("bool_ops")),
        index("idx_delivery_addresses_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
        foreignKey({
                        columns: [table.userId],
                        foreignColumns: [users.id],
                        name: "fk_delivery_addresses_user"
                }).onDelete("cascade"),
]);

export const activityLogs = pgTable("activity_logs", {
        id: serial().primaryKey().notNull(),
        userId: varchar("user_id", { length: 255 }),
        username: varchar({ length: 255 }),
        action: varchar({ length: 255 }).notNull(),
        details: text(),
        timestamp: timestamp({ mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
        targetId: varchar("target_id", { length: 255 }),
        targetType: varchar("target_type", { length: 255 }),
}, (table) => [
        index("idx_activity_logs_timestamp").using("btree", table.timestamp.asc().nullsLast().op("timestamp_ops")),
        index("idx_activity_logs_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
]);

export const cartItems = pgTable("cart_items", {
        id: serial().notNull(),
        userId: varchar("user_id").notNull(),
        productId: integer("product_id").notNull(),
        quantity: integer().default(1).notNull(),
        createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
        updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
}, (table) => [
        foreignKey({
                        columns: [table.userId],
                        foreignColumns: [users.id],
                        name: "cart_items_user_id_users_id_fk"
                }),
        foreignKey({
                        columns: [table.productId],
                        foreignColumns: [products.id],
                        name: "cart_items_product_id_products_id_fk"
                }),
        primaryKey({ columns: [table.userId, table.productId], name: "cart_items_user_id_product_id_pk"}),
]);
