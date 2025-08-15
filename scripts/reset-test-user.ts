import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';

/**
 * This script resets the test user account
 */
async function main() {
  console.log('Resetting test user account...');

  // Check if test user exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.username, 'testuser'),
  });

  const hashedPassword = await bcrypt.hash('password123', 10);

  if (existingUser) {
    // Update existing test user
    await db.update(users)
      .set({
        username: 'testuser',
        password: hashedPassword,
        firstName: 'Test',
        lastName: 'User',
        company: 'Test Company',
        address: '123 Test St, Test City, IL 60143',
        phone: '555-123-4567',
        isAdmin: false,
        updatedAt: new Date(),
      })
      .where(eq(users.username, 'testuser'));
    
    console.log('Test user updated successfully');
  } else {
    // Create new test user
    await db.insert(users).values({
      username: 'testuser',
      password: hashedPassword,
      firstName: 'Test',
      lastName: 'User',
      company: 'Test Company',
      address: '123 Test St, Test City, IL 60143',
      phone: '555-123-4567',
      isAdmin: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    console.log('Test user created successfully');
  }

  process.exit(0);
}

main().catch((error) => {
  console.error('Error resetting test user:', error);
  process.exit(1);
});