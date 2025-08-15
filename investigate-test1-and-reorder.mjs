import { DatabaseStorage } from './server/storage.js';

async function investigateIssues() {
  console.log('🔍 INVESTIGATING TEST1 NOTIFICATIONS AND REORDER ISSUES');
  console.log('======================================================');

  try {
    const storage = new DatabaseStorage();

    // 1. Check test1 user details
    console.log('\n👤 CHECKING TEST1 USER DATA:');
    const test1 = await storage.getUserByUsername('test1');
    if (test1) {
      console.log(`✓ User ID: ${test1.id}`);
      console.log(`✓ Email: ${test1.email || 'NO EMAIL SET'}`);
      console.log(`✓ Display Name: ${test1.displayName || test1.firstName || 'NO NAME'}`);
      console.log(`✓ Language: ${test1.preferredLanguage || 'en'}`);
      console.log(`✓ Email Notifications: ${test1.emailNotifications ? 'ENABLED' : 'DISABLED'}`);
      console.log(`✓ SMS Notifications: ${test1.smsNotifications ? 'ENABLED' : 'DISABLED'}`);
    } else {
      console.log('❌ test1 user not found!');
    }

    // 2. Check Order #2 details
    console.log('\n📦 CHECKING ORDER #2 DETAILS:');
    const orders = await storage.getAllOrders();
    const order2 = orders.find(o => o.id === 2);
    if (order2) {
      console.log(`✓ Order #2 found`);
      console.log(`✓ Customer ID: ${order2.customerId}`);
      console.log(`✓ Status: ${order2.status}`);
      console.log(`✓ Total: $${order2.total}`);
      console.log(`✓ Created: ${order2.createdAt}`);
      
      // Check if customer ID matches test1
      if (order2.customerId === test1?.id) {
        console.log('✅ Order #2 belongs to test1 - notification should have been sent');
      } else {
        console.log('❌ Order #2 does not belong to test1!');
      }
    } else {
      console.log('❌ Order #2 not found!');
    }

    // 3. Check email notification logs
    console.log('\n📧 CHECKING EMAIL NOTIFICATION LOGS:');
    try {
      const emailLogs = await storage.db.select().from(storage.schema.emailNotificationLogs)
        .orderBy(storage.schema.emailNotificationLogs.createdAt.desc())
        .limit(10);
      
      console.log(`Found ${emailLogs.length} recent email logs:`);
      emailLogs.forEach(log => {
        console.log(`- ${log.recipientEmail}: ${log.subject} (${log.status}) - ${log.createdAt}`);
      });
    } catch (error) {
      console.log('❌ Could not fetch email logs:', error.message);
    }

    // 4. Check if test1 has a valid email
    console.log('\n🔍 EMAIL VALIDATION:');
    if (test1?.email && test1.email.includes('@')) {
      console.log(`✅ test1 has valid email: ${test1.email}`);
    } else {
      console.log('❌ test1 missing valid email address!');
      console.log('This is likely why customer notification was not sent');
    }

  } catch (error) {
    console.error('Error during investigation:', error);
  }
}

investigateIssues().then(() => process.exit(0));