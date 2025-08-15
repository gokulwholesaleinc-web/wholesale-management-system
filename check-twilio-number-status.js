#!/usr/bin/env node

// Script to check Twilio messaging number approval status
import https from 'https';

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;

if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
  console.error('❌ Missing Twilio credentials');
  process.exit(1);
}

// Basic auth for Twilio API
const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

console.log('🔍 Checking Twilio messaging number status...');
console.log(`📱 Phone Number: ${TWILIO_PHONE_NUMBER}`);
console.log(`🏢 Account SID: ${TWILIO_ACCOUNT_SID}`);

// Check phone number capabilities
const options = {
  hostname: 'api.twilio.com',
  port: 443,
  path: `/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json`,
  method: 'GET',
  headers: {
    'Authorization': `Basic ${auth}`,
    'Content-Type': 'application/x-www-form-urlencoded'
  }
};

const req = https.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      
      if (res.statusCode === 200) {
        console.log('\n✅ TWILIO API CONNECTION SUCCESSFUL');
        
        if (response.incoming_phone_numbers && response.incoming_phone_numbers.length > 0) {
          console.log(`\n📞 FOUND ${response.incoming_phone_numbers.length} PHONE NUMBER(S):\n`);
          
          response.incoming_phone_numbers.forEach((number, index) => {
            console.log(`--- NUMBER ${index + 1} ---`);
            console.log(`📱 Phone Number: ${number.phone_number}`);
            console.log(`🏷️  Friendly Name: ${number.friendly_name || 'Not set'}`);
            console.log(`📧 SMS Capability: ${number.capabilities.sms ? '✅ ENABLED' : '❌ DISABLED'}`);
            console.log(`📞 Voice Capability: ${number.capabilities.voice ? '✅ ENABLED' : '❌ DISABLED'}`);
            console.log(`🌐 MMS Capability: ${number.capabilities.mms ? '✅ ENABLED' : '❌ DISABLED'}`);
            console.log(`📅 Date Created: ${new Date(number.date_created).toLocaleString()}`);
            console.log(`🔗 SID: ${number.sid}`);
            
            if (number.phone_number === TWILIO_PHONE_NUMBER) {
              console.log('🎯 THIS IS YOUR CONFIGURED NUMBER');
              
              if (number.capabilities.sms) {
                console.log('\n🎉 SMS MESSAGING IS APPROVED AND READY!');
                console.log('✅ You can send SMS notifications');
                console.log('✅ Your number is active for messaging');
              } else {
                console.log('\n⚠️  SMS NOT YET APPROVED');
                console.log('❌ SMS capability is disabled');
                console.log('📋 Contact Twilio support or check your verification status');
              }
            }
            console.log('');
          });
        } else {
          console.log('\n❌ NO PHONE NUMBERS FOUND');
          console.log('Your Twilio account has no active phone numbers');
          console.log('You may need to purchase a number or complete verification');
        }
        
      } else {
        console.log('\n❌ TWILIO API ERROR');
        console.log(`Status: ${res.statusCode}`);
        console.log('Response:', response);
      }
      
    } catch (error) {
      console.error('❌ Error parsing response:', error);
      console.log('Raw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error);
});

req.end();