// Twilio Local Phone Number Setup Guide for Gokul Wholesale Inc
// Run this script to get a local phone number for SMS notifications

const twilio = require('twilio');

// You'll need to provide your Twilio credentials
const accountSid = 'YOUR_TWILIO_ACCOUNT_SID';  // Get from Twilio Console
const authToken = 'YOUR_TWILIO_AUTH_TOKEN';    // Get from Twilio Console
const client = twilio(accountSid, authToken);

async function setupLocalPhoneNumber() {
  try {
    console.log('🔍 Searching for available local phone numbers in Illinois (630 area code)...');
    
    // Search for available local numbers in your area (Illinois - 630 area code)
    const numbers = await client.availablePhoneNumbers('US')
      .local
      .list({
        areaCode: 630,  // Itasca, IL area code
        limit: 10
      });

    if (numbers.length === 0) {
      console.log('No 630 numbers available, searching 224 area code (also serves your area)...');
      const altNumbers = await client.availablePhoneNumbers('US')
        .local
        .list({
          areaCode: 224,
          limit: 10
        });
      
      if (altNumbers.length > 0) {
        console.log('📱 Available phone numbers:');
        altNumbers.forEach((number, index) => {
          console.log(`${index + 1}. ${number.phoneNumber} (${number.locality}, ${number.region})`);
        });
        return altNumbers;
      }
    } else {
      console.log('📱 Available phone numbers:');
      numbers.forEach((number, index) => {
        console.log(`${index + 1}. ${number.phoneNumber} (${number.locality}, ${number.region})`);
      });
      return numbers;
    }

  } catch (error) {
    console.error('❌ Error searching for phone numbers:', error.message);
    
    if (error.code === 20003) {
      console.log('\n🔑 Authentication failed. Please check your credentials:');
      console.log('1. Go to https://console.twilio.com/');
      console.log('2. Copy your Account SID and Auth Token');
      console.log('3. Update the credentials in this script');
    }
  }
}

async function purchasePhoneNumber(phoneNumber) {
  try {
    console.log(`💳 Purchasing phone number: ${phoneNumber}...`);
    
    const number = await client.incomingPhoneNumbers.create({
      phoneNumber: phoneNumber,
      smsUrl: 'https://ac29e722-09ca-42da-a9f7-30f50b942baa-00-247nif8zj0wpk.worf.replit.dev/api/sms/webhook',
      smsMethod: 'POST',
      statusCallback: 'https://ac29e722-09ca-42da-a9f7-30f50b942baa-00-247nif8zj0wpk.worf.replit.dev/api/sms/status',
      statusCallbackMethod: 'POST'
    });

    console.log('✅ Phone number purchased successfully!');
    console.log(`📱 Your new number: ${number.phoneNumber}`);
    console.log(`🆔 Number SID: ${number.sid}`);
    console.log('\n🔧 Next steps:');
    console.log('1. Add this number to your Replit secrets as TWILIO_PHONE_NUMBER');
    console.log('2. Update your SMS service to use this number');
    console.log('3. Test SMS notifications');
    
    return number;

  } catch (error) {
    console.error('❌ Error purchasing phone number:', error.message);
    
    if (error.code === 21452) {
      console.log('💰 Insufficient funds. Please add credit to your Twilio account.');
    }
  }
}

// Instructions for manual setup
console.log(`
🚀 TWILIO LOCAL PHONE NUMBER SETUP
==================================

STEP 1: GET YOUR TWILIO CREDENTIALS
1. Go to https://console.twilio.com/
2. Copy your Account SID and Auth Token
3. Update the credentials at the top of this script

STEP 2: RUN THE SEARCH
node setup-local-phone-number.js

STEP 3: PURCHASE A NUMBER
After seeing available numbers, you can purchase one by running:
purchasePhoneNumber('+1630XXXXXXX');

STEP 4: ADD TO REPLIT SECRETS
Add these environment variables in Replit:
- TWILIO_ACCOUNT_SID: Your Account SID
- TWILIO_AUTH_TOKEN: Your Auth Token  
- TWILIO_PHONE_NUMBER: Your new phone number

STEP 5: TEST SMS
Your SMS system is already built and ready!

COST: Local phone numbers cost $1/month + SMS usage
SMS rates: $0.0075 per message sent

WEBHOOK URLS (already configured):
- SMS Webhook: /api/sms/webhook
- Status Callback: /api/sms/status
`);

// Uncomment to run the search
// setupLocalPhoneNumber();

// To purchase a specific number, uncomment this line and add the number:
// purchasePhoneNumber('+16305551234');