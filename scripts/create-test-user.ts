import bcrypt from 'bcrypt';
import { db } from '../server/db';
import { users } from '../shared/schema';

/**
 * This script creates a test user account for customer-side testing
 */
async function main() {
  try {
    console.log('Creating test user...');
    
    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.username, 'testuser')
    });

    if (existingUser) {
      console.log('Test user already exists, skipping creation');
      process.exit(0);
    }
    
    // Hash the password
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Create the test user
    const newUser = await db.insert(users).values({
      id: 'test-user',
      username: 'testuser',
      password: hashedPassword,
      isAdmin: false,
      customerLevel: 1,
      firstName: 'Test',
      lastName: 'User',
      company: 'Test Store',
      phone: '555-123-4567',
      address: '123 Test St, Testville, IL 60123',
      city: 'Testville',
      state: 'IL',
      zipCode: '60123',
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    
    console.log('Test user created successfully:', newUser);
    
  } catch (error) {
    console.error('Error creating test user:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

main();