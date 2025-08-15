import { db } from '../server/db';
import { sql } from 'drizzle-orm';

/**
 * This script adds the missing columns to the orders table
 * This is needed to fix errors related to missing columns
 */
async function main() {
  console.log('Starting orders table schema update...');

  try {
    // Check if columns already exist
    const columnsCheck = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' 
      AND column_name IN ('delivery_fee', 'admin_note', 'delivery_note', 'status', 'pickup_time')
    `);
    
    const existingColumns = columnsCheck.rows.map((row: any) => row.column_name);
    console.log('Existing columns:', existingColumns);
    
    // Add delivery_fee column if it doesn't exist
    if (!existingColumns.includes('delivery_fee')) {
      console.log('Adding delivery_fee column...');
      await db.execute(sql`
        ALTER TABLE orders 
        ADD COLUMN delivery_fee DOUBLE PRECISION DEFAULT 0
      `);
      console.log('delivery_fee column added successfully.');
    } else {
      console.log('delivery_fee column already exists.');
    }
    
    // Add admin_note column if it doesn't exist
    if (!existingColumns.includes('admin_note')) {
      console.log('Adding admin_note column...');
      await db.execute(sql`
        ALTER TABLE orders 
        ADD COLUMN admin_note TEXT
      `);
      console.log('admin_note column added successfully.');
    } else {
      console.log('admin_note column already exists.');
    }
    
    // Add delivery_note column if it doesn't exist
    if (!existingColumns.includes('delivery_note')) {
      console.log('Adding delivery_note column...');
      await db.execute(sql`
        ALTER TABLE orders 
        ADD COLUMN delivery_note TEXT
      `);
      console.log('delivery_note column added successfully.');
    } else {
      console.log('delivery_note column already exists.');
    }
    
    // Add status column if it doesn't exist
    if (!existingColumns.includes('status')) {
      console.log('Adding status column...');
      await db.execute(sql`
        ALTER TABLE orders 
        ADD COLUMN status VARCHAR DEFAULT 'pending' NOT NULL
      `);
      console.log('status column added successfully.');
    } else {
      console.log('status column already exists.');
    }
    
    // Add pickup_time column if it doesn't exist
    if (!existingColumns.includes('pickup_time')) {
      console.log('Adding pickup_time column...');
      await db.execute(sql`
        ALTER TABLE orders 
        ADD COLUMN pickup_time VARCHAR
      `);
      console.log('pickup_time column added successfully.');
    } else {
      console.log('pickup_time column already exists.');
    }
    
    console.log('Orders table schema update completed successfully!');
  } catch (error) {
    console.error('Error updating orders table schema:', error);
  } finally {
    process.exit(0);
  }
}

main();