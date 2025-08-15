#!/usr/bin/env node

/**
 * Twilio Toll-Free Verification (TFV) Setup Script
 * Creates a verification request for Gokul Wholesale's phone number
 */

import twilio from "twilio";

// Twilio credentials from environment variables
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  console.error('❌ Missing Twilio credentials!');
  console.error('Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

async function createTollfreeVerification() {
  try {
    console.log('🚀 Creating Toll-Free Verification (TFV) Request for Gokul Wholesale');
    console.log('================================================================');
    
    // Get your toll-free phone number SID first
    console.log('\n📱 First, retrieving your toll-free phone numbers...');
    const phoneNumbers = await client.incomingPhoneNumbers.list({ limit: 20 });
    
    const tollfreeNumbers = phoneNumbers.filter(num => 
      num.phoneNumber.startsWith('+1800') || 
      num.phoneNumber.startsWith('+1888') || 
      num.phoneNumber.startsWith('+1877') || 
      num.phoneNumber.startsWith('+1866') || 
      num.phoneNumber.startsWith('+1855') || 
      num.phoneNumber.startsWith('+1844') || 
      num.phoneNumber.startsWith('+1833')
    );
    
    if (tollfreeNumbers.length === 0) {
      console.log('❌ No toll-free numbers found in your account.');
      console.log('You need to purchase a toll-free number first from Twilio Console.');
      return;
    }
    
    console.log(`✅ Found ${tollfreeNumbers.length} toll-free number(s):`);
    tollfreeNumbers.forEach((num, index) => {
      console.log(`   ${index + 1}. ${num.phoneNumber} (SID: ${num.sid})`);
    });
    
    // Use the first toll-free number
    const selectedNumber = tollfreeNumbers[0];
    console.log(`\n🎯 Using: ${selectedNumber.phoneNumber} (${selectedNumber.sid})`);
    
    console.log('\n📝 Creating TFV request with Gokul Wholesale business information...');
    
    const tollfreeVerification = await client.messaging.v1.tollfreeVerifications.create({
      // Business Information for Gokul Wholesale
      businessName: "Gokul Wholesale Inc.",
      businessWebsite: "https://shopgokul.com", // Update with actual website
      notificationEmail: "gokulwholesaleinc@gmail.com",
      
      // Phone number to verify
      tollfreePhoneNumberSid: selectedNumber.sid,
      
      // Use case information
      useCaseCategories: [
        "CUSTOMER_CARE",        // Customer service notifications
        "MARKETING",            // Promotional offers and updates  
        "TWO_FACTOR_AUTHENTICATION"   // Order confirmations and account updates
      ],
      
      useCaseSummary: "Gokul Wholesale uses this toll-free number to send SMS notifications to customers including order confirmations, delivery updates, promotional offers, and customer service communications. Customers can opt-in by replying YES and opt-out by replying STOP.",
      
      // Message volume (estimated monthly SMS volume)
      messageVolume: "10", // Valid values: 1, 10, 100, 1000, 10000, 100000, 250000
      
      // Sample production message
      productionMessageSample: "Hi from Gokul Wholesale! Your order #12345 has been confirmed for $45.25. Estimated delivery: Jan 30. Track your order at shopgokul.com. Reply STOP to opt-out.",
      
      // Opt-in method and required images
      optInType: "VERBAL", // Customers opt-in via SMS replies (YES/START) or web interface
      optInImageUrls: [
        "https://shopgokul.com/images/sms-optin-screenshot.jpg",
        "https://shopgokul.com/images/account-settings-sms.jpg"
      ], // Required: Screenshots showing opt-in process
      
      // Additional compliance information
      additionalInformation: "Customers can manage SMS preferences at shopgokul.com/account. We comply with TCPA regulations and provide clear opt-out instructions in every message. Privacy policy available at shopgokul.com/privacy.",
      
      // External reference for tracking
      externalReferenceId: `gokul-wholesale-tfv-${Date.now()}`
    });

    console.log('\n✅ Toll-Free Verification Request Created Successfully!');
    console.log('================================================');
    console.log(`🆔 Verification SID: ${tollfreeVerification.sid}`);
    console.log(`📞 Phone Number: ${selectedNumber.phoneNumber}`);
    console.log(`📊 Status: ${tollfreeVerification.status}`);
    console.log(`📅 Created: ${tollfreeVerification.dateCreated}`);
    
    console.log('\n📋 Next Steps:');
    console.log('1. ✅ TFV request submitted to Twilio');
    console.log('2. ⏳ Twilio will review your request (typically 1-3 business days)');
    console.log('3. 📧 You\'ll receive email updates at gokulwholesaleinc@gmail.com');
    console.log('4. ✅ Once approved, you can send SMS at higher volumes');
    console.log('5. 🔧 Configure webhook URL in Twilio Console: /api/sms/webhook');
    
    console.log('\n🔧 Webhook Configuration:');
    console.log(`Configure these URLs in your Twilio Console:`);
    console.log(`• SMS Webhook URL: https://your-domain.replit.app/api/sms/webhook`);
    console.log(`• SMS Status Callback: https://your-domain.replit.app/api/sms/status`);
    
    console.log('\n📊 TFV Request Details:');
    console.log(`Business Name: Gokul Wholesale Inc.`);
    console.log(`Use Cases: Customer Care, Marketing, Account Notifications`);
    console.log(`Expected Volume: 1,000 SMS/month`);
    console.log(`Opt-in Method: Verbal (SMS replies + web interface)`);
    
  } catch (error) {
    console.error('\n❌ Error creating TFV request:', error.message);
    
    if (error.code === 20001) {
      console.error('Invalid Twilio credentials. Please check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
    } else if (error.code === 21614) {
      console.error('Phone number not found or not toll-free. Please check your toll-free number SID.');
    } else {
      console.error('Full error details:', error);
    }
  }
}

// Additional utility function to check TFV status
async function checkVerificationStatus(verificationSid) {
  try {
    const verification = await client.messaging.v1.tollfreeVerifications(verificationSid).fetch();
    
    console.log('\n📊 TFV Status Check:');
    console.log(`SID: ${verification.sid}`);
    console.log(`Status: ${verification.status}`);
    console.log(`Business Name: ${verification.businessName}`);
    console.log(`Phone Number SID: ${verification.tollfreePhoneNumberSid}`);
    console.log(`Created: ${verification.dateCreated}`);
    console.log(`Updated: ${verification.dateUpdated}`);
    
    if (verification.status === 'approved') {
      console.log('✅ Your toll-free number is approved for high-volume SMS!');
    } else if (verification.status === 'pending') {
      console.log('⏳ Your TFV request is still under review.');
    } else if (verification.status === 'rejected') {
      console.log('❌ Your TFV request was rejected. Check email for details.');
    }
    
  } catch (error) {
    console.error('Error checking verification status:', error.message);
  }
}

// Main execution
console.log('🏢 Gokul Wholesale - Twilio Toll-Free Verification Setup');
console.log('======================================================');

// Check if user wants to check status instead of creating new request
const args = process.argv.slice(2);
if (args[0] === 'status' && args[1]) {
  checkVerificationStatus(args[1]);
} else {
  createTollfreeVerification();
}

// Export functions for potential reuse
export {
  createTollfreeVerification,
  checkVerificationStatus
};