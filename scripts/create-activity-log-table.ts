import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { activityLogs } from '../shared/schema';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { sql } from 'drizzle-orm';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

/**
 * This script creates the activity_logs table to enable logging of staff actions
 */
async function main() {
  try {
    console.log('Creating activity_logs table...');
    
    // Check if table exists
    const tableExists = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'activity_logs'
      );
    `);
    
    if (tableExists.rows?.[0]?.exists === true) {
      console.log('activity_logs table already exists.');
      return;
    }
    
    // Create the table
    await db.execute(sql`
      CREATE TABLE activity_logs (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR REFERENCES users(id) NOT NULL,
        action VARCHAR NOT NULL,
        details TEXT,
        timestamp TIMESTAMP DEFAULT NOW(),
        ip_address VARCHAR,
        target_id VARCHAR,
        target_type VARCHAR
      );
    `);
    
    console.log('Successfully created activity_logs table!');
  } catch (error) {
    console.error('Error creating activity_logs table:', error);
  } finally {
    await pool.end();
  }
}

main();