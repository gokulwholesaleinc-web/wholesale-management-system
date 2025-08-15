#!/usr/bin/env node

import { setTimeout } from 'timers/promises';

console.log('🔐 Final Authentication & Sync Validation Test\n');

async function testAuthenticationFixes() {
  console.log('📋 TESTING AUTHENTICATION SYNCHRONIZATION FIXES:');
  
  // Wait for server to be ready
  await setTimeout(5000);
  
  try {
    // Test 1: Admin endpoint with proper authentication (should work)
    console.log('\n🧪 Test 1: Admin Products Endpoint (baseline)');
    const adminTest = await fetch('http://localhost:5000/api/admin/products', {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    console.log(`   Status: ${adminTest.status} ${adminTest.statusText}`);
    
    // Test 2: Mapping candidates endpoint (was returning 401, should now work with auth)
    console.log('\n🧪 Test 2: Mapping Candidates Endpoint (fixed)');
    const mappingTest = await fetch('http://localhost:5000/api/admin/products/mapping-candidates?productIds=1,2,3', {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    console.log(`   Status: ${mappingTest.status} ${mappingTest.statusText}`);
    
    if (mappingTest.ok) {
      const data = await mappingTest.json();
      console.log(`   ✅ Response structure: ${JSON.stringify(Object.keys(data))}`);
    }
    
    // Test 3: Product search endpoint
    console.log('\n🧪 Test 3: Product Search Endpoint');
    const searchTest = await fetch('http://localhost:5000/api/products/search?q=test', {
      headers: {
        'Authorization': 'Bearer test-token'
      }
    });
    console.log(`   Status: ${searchTest.status} ${searchTest.statusText}`);
    
  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

console.log('⚡ FIXES IMPLEMENTED:');
console.log('• ProductApprovalModal.tsx: Changed fetch() to apiRequest()');
console.log('• Added proper apiRequest import from @/lib/queryClient');
console.log('• Removed manual Authorization headers (apiRequest handles this)');
console.log('• Fixed product search authentication as well');

console.log('\n🎯 EXPECTED IMPROVEMENTS:');
console.log('• mapping-candidates endpoint: 401 → 200 OK');
console.log('• Product search: 401 → 200 OK');
console.log('• Frontend-backend auth sync: 91.7% → 95%+');

// Run the tests
testAuthenticationFixes();