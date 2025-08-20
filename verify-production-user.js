// Verify if user exists in production database
import { db } from './server/db.js';
import { users } from './shared/schema.js';
import { eq, sql } from 'drizzle-orm';

console.log('=== Production User Verification ===');

async function checkUser() {
  try {
    console.log('🔍 Checking for user: harsh476');
    
    // Check by username (case insensitive)
    const userByUsername = await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.username}) = LOWER('harsh476')`)
      .limit(1);
    
    // Check by email  
    const userByEmail = await db
      .select()
      .from(users)
      .where(eq(users.email, 'Harsh@gokulwholesaleinc.com'))
      .limit(1);
      
    const userByEmailLower = await db
      .select()
      .from(users)
      .where(eq(users.email, 'harsh@gokulwholesaleinc.com'))
      .limit(1);
    
    console.log('Results:');
    console.log('- By username "harsh476":', userByUsername.length > 0 ? 'FOUND' : 'NOT FOUND');
    console.log('- By email "Harsh@gokulwholesaleinc.com":', userByEmail.length > 0 ? 'FOUND' : 'NOT FOUND');
    console.log('- By email "harsh@gokulwholesaleinc.com":', userByEmailLower.length > 0 ? 'FOUND' : 'NOT FOUND');
    
    if (userByUsername.length > 0) {
      console.log('User details:', {
        username: userByUsername[0].username,
        email: userByUsername[0].email,
        phone: userByUsername[0].phone,
        id: userByUsername[0].id
      });
    }
    
    if (userByEmail.length > 0) {
      console.log('User by email details:', {
        username: userByEmail[0].username,
        email: userByEmail[0].email,
        phone: userByEmail[0].phone,
        id: userByEmail[0].id
      });
    }
    
    // Check total users count
    const totalUsers = await db.select({ count: sql`count(*)` }).from(users);
    console.log('Total users in database:', totalUsers[0]?.count || 0);
    
  } catch (error) {
    console.error('❌ Database check failed:', error.message);
    console.error('Database URL configured:', process.env.DATABASE_URL ? 'YES' : 'NO');
  }
}

checkUser();