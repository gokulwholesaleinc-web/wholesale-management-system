import { db } from "../server/db";
import { sql } from "drizzle-orm";
import bcrypt from "bcrypt";

/**
 * This script creates a test employee account with 
 * username: etest
 * password: etest1
 */
async function main() {
  try {
    console.log("Creating test employee account...");
    
    // First check if user already exists
    const existingCheck = await db.execute(sql`
      SELECT COUNT(*) as count FROM users WHERE username = 'etest'
    `);
    
    const existingCount = parseInt(existingCheck.rows[0].count as string);
    
    if (existingCount > 0) {
      console.log("User 'etest' already exists, deleting it first...");
      await db.execute(sql`DELETE FROM users WHERE username = 'etest'`);
    }
    
    // Generate password hash
    const saltRounds = 10;
    const password = "etest1";
    const passwordHash = await bcrypt.hash(password, saltRounds);
    
    // Create new employee user
    await db.execute(sql`
      INSERT INTO users (
        id, 
        username, 
        password_hash, 
        first_name, 
        last_name, 
        is_admin, 
        is_employee
      )
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
    
  } catch (error) {
    console.error("Error creating employee test account:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();