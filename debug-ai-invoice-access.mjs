// Check AI invoice processing accessibility
import fetch from 'node-fetch';

async function checkAIInvoiceAccess() {
  console.log('🔍 Diagnosing AI Invoice Processing Issue...\n');
  
  try {
    // 1. Check user authentication and permissions
    console.log('1. Checking current user authentication...');
    const authResponse = await fetch('http://localhost:5000/api/auth/user', {
      headers: {
        'Authorization': 'Bearer user_1754759817284_kk5l75mvr'
      }
    });
    
    if (!authResponse.ok) {
      console.error('❌ Authentication failed:', authResponse.status);
      return;
    }
    
    const user = await authResponse.json();
    console.log('👤 Current user:', user.username);
    console.log('🔐 Admin status:', user.isAdmin);
    console.log('🔐 Employee status:', user.isEmployee);
    
    // 2. Test access to AI processing endpoint
    console.log('\n2. Testing access to AI processing endpoint...');
    const testResponse = await fetch('http://localhost:5000/api/admin/ai/process-invoice', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer user_1754759817284_kk5l75mvr',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({}) // Empty body to test permissions
    });
    
    console.log('📊 Response status:', testResponse.status);
    const responseText = await testResponse.text();
    console.log('📄 Response:', responseText);
    
    // 3. Provide diagnosis
    console.log('\n📋 DIAGNOSIS:');
    if (!user.isAdmin) {
      console.log('❌ PROBLEM FOUND: User is not an admin');
      console.log('💡 SOLUTION: The AI invoice processing feature requires admin privileges.');
      console.log('   To use this feature, you need to:');
      console.log('   a) Login as an admin user, OR');
      console.log('   b) Promote the current user to admin status');
      console.log('\n🔧 To promote current user to admin:');
      console.log('   You can ask the agent to update the user permissions in the database');
    } else {
      console.log('✅ User has admin privileges');
      if (testResponse.status === 400) {
        console.log('✅ Endpoint is accessible (400 = missing file, which is expected)');
        console.log('💡 The AI invoice processing is working! It just needs a file to process.');
      } else {
        console.log('❌ Unexpected response from endpoint');
      }
    }
    
    // 4. Check OpenAI configuration
    console.log('\n4. Checking OpenAI configuration...');
    const openaiConfigured = process.env.OPENAI_API_KEY ? 'Yes' : 'No';
    console.log('🤖 OpenAI API Key configured:', openaiConfigured);
    
    // 5. Check directories
    console.log('\n5. Checking required directories...');
    import fs from 'fs';
    const uploadsExists = fs.existsSync('uploads');
    const tempExists = fs.existsSync('uploads/temp');
    console.log('📁 uploads/ directory exists:', uploadsExists);
    console.log('📁 uploads/temp/ directory exists:', tempExists);
    
    console.log('\n=== SUMMARY ===');
    if (!user.isAdmin) {
      console.log('🚫 AI Invoice Processing is BLOCKED due to insufficient permissions');
      console.log('🔑 User needs admin privileges to access this feature');
    } else {
      console.log('✅ AI Invoice Processing should be working');
      console.log('📤 Try uploading a PDF or image invoice through the admin interface');
    }
    
  } catch (error) {
    console.error('❌ Diagnosis failed:', error.message);
  }
}

checkAIInvoiceAccess();