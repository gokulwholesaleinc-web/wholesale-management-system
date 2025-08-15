import { db } from "../server/db";
import { sql } from 'drizzle-orm';

/**
 * This script creates the delivery_addresses table to store multiple delivery addresses for each user
 */
async function main() {
  try {
    console.log("Creating delivery_addresses table...");

    // Create the delivery_addresses table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS delivery_addresses (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        business_name VARCHAR(255),
        address_line1 VARCHAR(255) NOT NULL,
        address_line2 VARCHAR(255),
        city VARCHAR(255) NOT NULL,
        state VARCHAR(255) NOT NULL,
        postal_code VARCHAR(255) NOT NULL,
        country VARCHAR(255) DEFAULT 'United States',
        phone VARCHAR(255),
        is_default BOOLEAN DEFAULT FALSE,
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add foreign key constraint
    await db.execute(sql`
      ALTER TABLE delivery_addresses
      ADD CONSTRAINT fk_delivery_addresses_user
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE;
    `);

    // Add indexes for faster queries
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_delivery_addresses_user_id ON delivery_addresses(user_id);
    `);

    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_delivery_addresses_is_default ON delivery_addresses(is_default);
    `);

    console.log("Successfully created delivery_addresses table!");
  } catch (error) {
    console.error("Error creating delivery_addresses table:", error);
  }
}

main();