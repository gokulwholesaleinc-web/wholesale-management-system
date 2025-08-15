import https from 'https';

async function checkSendGridSenders() {
  console.log('🔍 Checking SendGrid Sender Identities...\n');
  
  const apiKey = process.env.SENDGRID_API_KEY;
  
  // Check verified senders
  const options = {
    hostname: 'api.sendgrid.com',
    path: '/v3/senders',
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  };
  
  return new Promise((resolve) => {
    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => responseData += chunk);
      res.on('end', () => {
        console.log(`📊 Response Status: ${res.statusCode}`);
        
        if (res.statusCode === 200) {
          try {
            const senders = JSON.parse(responseData);
            console.log('📧 SendGrid Sender Status:');
            
            if (senders.length === 0) {
              console.log('❌ No verified sender identities found');
              console.log('\n📝 Next Steps:');
              console.log('1. Go to: https://app.sendgrid.com/settings/sender_auth');
              console.log('2. Click "Create New Sender"');
              console.log('3. Add sender details:');
              console.log('   - From Email: noreply@deepakjeel.com');
              console.log('   - From Name: Gokul Wholesale');
              console.log('   - Reply To: support@deepakjeel.com (or same as from)');
              console.log('   - Address: Your business address');
              console.log('4. Verify the sender identity');
              console.log('5. Use the verified email in notifications');
            } else {
              console.log(`✅ Found ${senders.length} verified sender(s):`);
              senders.forEach((sender, index) => {
                console.log(`\n${index + 1}. Email: ${sender.from?.email || 'N/A'}`);
                console.log(`   Name: ${sender.from?.name || 'N/A'}`);
                console.log(`   Verified: ${sender.verified ? '✅ Yes' : '❌ No'}`);
                console.log(`   Reply To: ${sender.reply_to?.email || 'N/A'}`);
                console.log(`   Address: ${sender.address || 'N/A'}`);
                console.log(`   City: ${sender.city || 'N/A'}`);
                console.log(`   State: ${sender.state || 'N/A'}`);
                console.log(`   Country: ${sender.country || 'N/A'}`);
              });
              
              // Find verified senders
              const verifiedSenders = senders.filter(s => s.verified);
              if (verifiedSenders.length > 0) {
                console.log('\n✅ Verified senders ready to use:');
                verifiedSenders.forEach(sender => {
                  console.log(`   ${sender.from.email} (${sender.from.name})`);
                });
              } else {
                console.log('\n⚠️  Senders exist but need verification');
              }
            }
          } catch (parseError) {
            console.log('❌ Could not parse response');
            console.log('Raw response:', responseData);
          }
        } else {
          console.log('❌ Failed to get sender information');
          console.log('Response:', responseData);
        }
        
        resolve(res.statusCode === 200);
      });
    });
    
    req.on('error', (error) => {
      console.log('❌ Request error:', error.message);
      resolve(false);
    });
    
    req.end();
  });
}

checkSendGridSenders().catch(console.error);