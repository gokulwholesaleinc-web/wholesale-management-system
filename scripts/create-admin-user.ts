import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

/**
 * This script creates a new admin user
 */
async function main() {
  const username = process.argv[2] || 'admin';
  const password = process.argv[3] || 'admin123';
  
  try {
    console.log(`Checking if username ${username} is available...`);
    
    // Check if username is taken
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    
    if (existingUser.length > 0) {
      console.log(`User with username ${username} already exists`);
      
      // Update the existing user to have admin privileges
      await db.update(users)
        .set({ isAdmin: true })
        .where(eq(users.id, existingUser[0].id));
      
      console.log(`✅ Updated ${username} to have admin privileges`);
      return;
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create a new admin user
    const [newUser] = await db.insert(users)
      .values({
        id: `manual-${Date.now()}`,
        username: username,
        firstName: 'Admin',
        lastName: 'User',
        passwordHash: hashedPassword,
        isAdmin: true,
        customerLevel: 1,
      })
      .returning();
    
    console.log(`✅ Successfully created admin user: ${username}`);
    console.log(`User ID: ${newUser.id}`);
    console.log(`Remember password: ${password}`);
  } catch (error) {
    console.error('Error creating admin user:', error);
    process.exit(1);
  }
}

main();