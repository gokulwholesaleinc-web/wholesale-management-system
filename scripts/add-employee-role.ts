import { db } from "../server/db";
import { sql } from "drizzle-orm";

/**
 * This script adds the isEmployee column to the users table
 * to enable employee role functionality
 */
async function main() {
  try {
    console.log("Adding isEmployee column to users table...");
    
    // Add isEmployee column to users table
    await db.execute(sql`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_employee BOOLEAN DEFAULT false
    `);
    
    console.log("Successfully added isEmployee column to users table!");
    
    // Create a test employee account
    console.log("Creating a test employee account...");
    
    // Check if the employee account already exists
    const result = await db.execute(sql`
      SELECT COUNT(*) FROM users WHERE username = 'employee'
    `);
    
    // Safely parse the count from the result
    const count = result.rows && result.rows[0] ? parseInt(String(result.rows[0].count)) : 0;
    
    if (count > 0) {
      console.log("Employee test account already exists, skipping creation.");
    } else {
      // Create the employee account
      // Generate hash for new password "etest1"
      const bcrypt = require('bcrypt');
      const passwordHash = await bcrypt.hash('etest1', 10);
      
      await db.execute(sql`
        INSERT INTO users (id, username, password_hash, first_name, last_name, is_admin, is_employee)
        VALUES (
          'employee-test',
          'etest',
          ${passwordHash},
          'Test',
          'Employee',
          false,
          true
        )
      `);
      console.log("Test employee account created successfully!");
      console.log("Username: etest");
      console.log("Password: etest1");
    }
    
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();