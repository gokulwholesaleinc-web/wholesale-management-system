/**
 * This script adds test orders for testing the admin order management functionality
 */
import { db } from '../server/db';
import { orders, orderItems } from '../shared/schema';

async function main() {
  try {
    console.log('Creating test orders for admin dashboard testing...');

    // Create a test order for the admin user
    const [adminOrder] = await db
      .insert(orders)
      .values({
        userId: 'admin_49rzcl0p',
        total: 89.99,
        status: 'pending',
        orderType: 'delivery',
        createdAt: new Date(),
        updatedAt: new Date(),
        deliveryFee: 5.99,
        notes: 'This is a test order for admin. Please deliver ASAP.',
      })
      .returning();

    console.log('Created admin test order:', adminOrder);

    // Add some order items
    const orderItemsData = [
      {
        orderId: adminOrder.id,
        productId: 27, // COKE 20 OZ 24CT
        quantity: 3,
        price: 32,
        total: 96,
      },
      {
        orderId: adminOrder.id,
        productId: 23, // RED BULL SUGAR FREE 12 OZ
        quantity: 1,
        price: 57,
        total: 57,
      },
    ];

    const items = await db
      .insert(orderItems)
      .values(orderItemsData)
      .returning();

    console.log(`Added ${items.length} items to order #${adminOrder.id}`);

    // Create a test order for the test user if needed
    const [testUserOrder] = await db
      .insert(orders)
      .values({
        userId: 'test_user',
        total: 45.50,
        status: 'ready',
        orderType: 'pickup',
        pickupDate: new Date(Date.now() + 86400000), // tomorrow
        pickupTime: '14:00',
        createdAt: new Date(),
        updatedAt: new Date(),
        notes: 'Please call when order is ready for pickup',
      })
      .returning();

    console.log('Created test user order:', testUserOrder);

    // Add some order items for test user
    const testUserItemsData = [
      {
        orderId: testUserOrder.id,
        productId: 24, // ALKA SELTZER
        quantity: 2,
        price: 7.5,
        total: 15,
      },
      {
        orderId: testUserOrder.id,
        productId: 58, // TWANG LIME SALT
        quantity: 3,
        price: 10.25,
        total: 30.75,
      },
    ];

    const testUserItems = await db
      .insert(orderItems)
      .values(testUserItemsData)
      .returning();

    console.log(`Added ${testUserItems.length} items to order #${testUserOrder.id}`);

    console.log('Test orders created successfully');
  } catch (error) {
    console.error('Error creating test orders:', error);
  } finally {
    process.exit(0);
  }
}

main();