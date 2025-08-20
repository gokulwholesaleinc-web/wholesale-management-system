import { db } from "../server/db";
import { sql } from "drizzle-orm";

/**
 * This script adds the deliveryAddressId column to the orders table
 * to properly link orders with the selected delivery address
 */
async function main() {
  try {
    console.log("Starting migration: Adding deliveryAddressId column to orders table...");

    // Add the deliveryAddressId column to the orders table
    await db.execute(sql`
      ALTER TABLE orders 
      ADD COLUMN IF NOT EXISTS delivery_address_id INTEGER
    `);

    // Create a foreign key constraint linking delivery_address_id to delivery_addresses.id
    await db.execute(sql`
      ALTER TABLE orders 
      ADD CONSTRAINT fk_orders_delivery_address 
      FOREIGN KEY (delivery_address_id) 
      REFERENCES delivery_addresses(id)
      ON DELETE SET NULL
    `);

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
}

main().then(() => process.exit(0));