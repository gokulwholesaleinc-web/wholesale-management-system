import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * This script makes an existing user an admin
 */
async function main() {
  const username = process.argv[2];
  
  if (!username) {
    console.error('Please provide a username as an argument');
    process.exit(1);
  }
  
  try {
    console.log(`Looking for user with username: ${username}...`);
    
    // Find the user
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.username, username))
      .limit(1);
    
    if (existingUser.length === 0) {
      console.error(`User with username ${username} not found`);
      process.exit(1);
    }
    
    const user = existingUser[0];
    console.log(`Found user: ${user.firstName} ${user.lastName} (ID: ${user.id})`);
    
    // Update the user to have admin privileges
    await db.update(users)
      .set({ isAdmin: true })
      .where(eq(users.id, user.id));
    
    console.log(`✅ Successfully made ${username} an admin`);
  } catch (error) {
    console.error('Error updating user:', error);
    process.exit(1);
  }
}

main();