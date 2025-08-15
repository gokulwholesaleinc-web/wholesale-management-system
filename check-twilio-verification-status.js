#!/usr/bin/env node

/**
 * Check Twilio Toll-Free Verification Status
 * Checks the status of existing TFV requests for Gokul Wholesale
 */

import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (!accountSid || !authToken) {
  console.error('❌ Missing Twilio credentials!');
  console.error('Please set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables');
  process.exit(1);
}

const client = twilio(accountSid, authToken);

async function checkAllVerifications() {
  try {
    console.log('🔍 Checking All Toll-Free Verification Requests');
    console.log('===============================================');
    
    // Get all toll-free verification requests
    const verifications = await client.messaging.v1.tollfreeVerifications.list({ limit: 50 });
    
    console.log(`\n📊 Found ${verifications.length} verification request(s):`);
    
    if (verifications.length === 0) {
      console.log('ℹ️  No verification requests found. You can create one using the setup script.');
      return;
    }
    
    verifications.forEach((verification, index) => {
      console.log(`\n${index + 1}. 📋 Verification Request Details:`);
      console.log(`   🆔 SID: ${verification.sid}`);
      console.log(`   🏢 Business: ${verification.businessName}`);
      console.log(`   📞 Phone SID: ${verification.tollfreePhoneNumberSid}`);
      console.log(`   📊 Status: ${getStatusEmoji(verification.status)} ${verification.status.toUpperCase()}`);
      console.log(`   📅 Created: ${verification.dateCreated}`);
      console.log(`   📅 Updated: ${verification.dateUpdated}`);
      console.log(`   📧 Email: ${verification.notificationEmail}`);
      console.log(`   🌐 Website: ${verification.businessWebsite}`);
      console.log(`   📨 Volume: ${verification.messageVolume}`);
      
      if (verification.status === 'approved') {
        console.log('   ✅ Status: APPROVED - Your toll-free number is ready for high-volume SMS!');
      } else if (verification.status === 'pending') {
        console.log('   ⏳ Status: PENDING - Your request is under review (typically 1-3 business days)');
      } else if (verification.status === 'rejected') {
        console.log('   ❌ Status: REJECTED - Check your email for details and resubmission instructions');
      } else if (verification.status === 'provisionally_approved') {
        console.log('   🔄 Status: PROVISIONALLY APPROVED - Final approval pending');
      }
      
      console.log('   ────────────────────────────────────────');
    });
    
    // Get phone numbers for reference
    console.log('\n📱 Your Toll-Free Phone Numbers:');
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
    
    tollfreeNumbers.forEach((num, index) => {
      console.log(`   ${index + 1}. ${num.phoneNumber} (SID: ${num.sid})`);
    });
    
    // Provide next steps
    console.log('\n🚀 Next Steps for SMS Opt-in/Opt-out System:');
    console.log('─────────────────────────────────────────────');
    
    const approvedVerifications = verifications.filter(v => v.status === 'approved');
    if (approvedVerifications.length > 0) {
      console.log('✅ You have approved verification(s)! Your SMS system is ready:');
      console.log('   1. Configure Twilio webhook URL in Console: /api/sms/webhook');
      console.log('   2. SMS opt-in/opt-out system is already implemented');
      console.log('   3. Users can text "YES" to opt-in and "STOP" to opt-out');
      console.log('   4. Preferences sync with /account settings page');
    } else {
      console.log('⏳ Waiting for verification approval:');
      console.log('   1. Monitor email for updates from Twilio');
      console.log('   2. SMS opt-in/opt-out system is already implemented and ready');
      console.log('   3. Once approved, configure webhook URL: /api/sms/webhook');
      console.log('   4. System will then support high-volume SMS notifications');
    }
    
    console.log('\n📋 Current SMS System Status:');
    console.log('────────────────────────────────');
    console.log('✅ SMS webhook endpoint: /api/sms/webhook (implemented)');
    console.log('✅ Opt-in commands: YES, Y, OPTIN, START');
    console.log('✅ Opt-out commands: STOP, UNSUBSCRIBE, OPTOUT, QUIT');
    console.log('✅ Help commands: HELP, INFO');
    console.log('✅ Database synchronization with account settings');
    console.log('✅ TCPA compliant messaging');
    
  } catch (error) {
    console.error('\n❌ Error checking verification status:', error.message);
    if (error.code === 20001) {
      console.error('Invalid Twilio credentials. Please check your TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.');
    }
  }
}

function getStatusEmoji(status) {
  switch (status) {
    case 'approved': return '✅';
    case 'pending': return '⏳';
    case 'rejected': return '❌';
    case 'provisionally_approved': return '🔄';
    default: return '❓';
  }
}

// Main execution
console.log('🏢 Gokul Wholesale - Twilio Verification Status Check');
console.log('=====================================================');

checkAllVerifications();