-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "order_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"order_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer NOT NULL,
	"price" double precision NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	CONSTRAINT "categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"total" double precision NOT NULL,
	"delivery_date" date,
	"delivery_time_slot" varchar,
	"status" varchar DEFAULT 'processing' NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"order_type" varchar DEFAULT 'delivery',
	"pickup_date" date,
	"pickup_time_slot" varchar,
	"notes" text,
	"delivery_fee" double precision DEFAULT 0,
	"admin_note" text,
	"delivery_note" text,
	"pickup_time" varchar
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"company" varchar,
	"is_admin" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"password_hash" varchar,
	"business_name" varchar,
	"tax_id" varchar,
	"business_type" varchar,
	"phone" varchar,
	"alternative_email" varchar,
	"address_line1" varchar,
	"address_line2" varchar,
	"city" varchar,
	"state" varchar,
	"postal_code" varchar,
	"country" varchar DEFAULT 'United States',
	"credit_limit" double precision DEFAULT 0,
	"current_balance" double precision DEFAULT 0,
	"payment_terms" varchar,
	"tax_exempt" boolean DEFAULT false,
	"tax_exemption_number" varchar,
	"notes" text,
	"customer_since" timestamp DEFAULT now(),
	"preferred_delivery_day" varchar,
	"preferred_delivery_time" varchar,
	"username" varchar(255) NOT NULL,
	"address" varchar(255),
	"customer_level" integer DEFAULT 1,
	"is_employee" boolean DEFAULT false,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_username_key" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar NOT NULL,
	"description" text,
	"price" double precision NOT NULL,
	"image_url" varchar,
	"stock" integer DEFAULT 0 NOT NULL,
	"category_id" integer,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"additional_images" text[],
	"upc_code" varchar,
	"sku" varchar,
	"weight" double precision,
	"dimensions" varchar,
	"brand" varchar,
	"featured" boolean DEFAULT false,
	"discount" double precision DEFAULT 0,
	"min_order_quantity" integer DEFAULT 1,
	"base_price" double precision,
	"price_level_1" double precision,
	"price_level_2" double precision,
	"price_level_3" double precision,
	"price_level_4" double precision,
	"price_level_5" double precision,
	"size" varchar,
	CONSTRAINT "products_upc_code_unique" UNIQUE("upc_code")
);
--> statement-breakpoint
CREATE TABLE "delivery_addresses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"name" varchar(255) NOT NULL,
	"business_name" varchar(255),
	"address_line1" varchar(255) NOT NULL,
	"address_line2" varchar(255),
	"city" varchar(255) NOT NULL,
	"state" varchar(255) NOT NULL,
	"postal_code" varchar(255) NOT NULL,
	"country" varchar(255) DEFAULT 'United States',
	"phone" varchar(255),
	"is_default" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP
);
--> statement-breakpoint
CREATE TABLE "activity_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255),
	"username" varchar(255),
	"action" varchar(255) NOT NULL,
	"details" text,
	"timestamp" timestamp DEFAULT CURRENT_TIMESTAMP,
	"target_id" varchar(255),
	"target_type" varchar(255)
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" serial NOT NULL,
	"user_id" varchar NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "cart_items_user_id_product_id_pk" PRIMARY KEY("user_id","product_id")
);
--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "public"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "delivery_addresses" ADD CONSTRAINT "fk_delivery_addresses_user" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_delivery_addresses_is_default" ON "delivery_addresses" USING btree ("is_default" bool_ops);--> statement-breakpoint
CREATE INDEX "idx_delivery_addresses_user_id" ON "delivery_addresses" USING btree ("user_id" text_ops);--> statement-breakpoint
CREATE INDEX "idx_activity_logs_timestamp" ON "activity_logs" USING btree ("timestamp" timestamp_ops);--> statement-breakpoint
CREATE INDEX "idx_activity_logs_user_id" ON "activity_logs" USING btree ("user_id" text_ops);
*/