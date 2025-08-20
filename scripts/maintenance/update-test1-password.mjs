#!/usr/bin/env node

import bcrypt from 'bcrypt';

async function updateTest1Password() {
  const adminToken = 'admin_49rzcl0p-1749838972228-x0xvbwf41si';
  const baseUrl = 'http://localhost:5000';
  
  console.log('Updating test1 password to "test1"...');
  
  // Generate hash for "test1"
  const hashedPassword = await bcrypt.hash('test1', 10);
  
  const updateQuery = `
    UPDATE users 
    SET "passwordHash" = '${hashedPassword}', "updatedAt" = NOW()
    WHERE username = 'test1'
  `;

  const response = await fetch(`${baseUrl}/api/admin/execute-sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
      'x-auth-token': adminToken
    },
    body: JSON.stringify({ query: updateQuery })
  });

  if (response.ok) {
    console.log('Password updated successfully');
    
    // Test the new password
    console.log('Testing test1/test1 login...');
    
    const testResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'test1', password: 'test1' })
    });

    if (testResponse.ok) {
      const result = await testResponse.json();
      console.log('✅ test1/test1 login successful');
      console.log('User details:', {
        name: `${result.user.firstName} ${result.user.lastName}`,
        company: result.user.company,
        customerLevel: result.user.customerLevel
      });
    } else {
      console.log('❌ test1/test1 login failed');
      const error = await testResponse.text();
      console.log('Error:', error);
    }
  } else {
    console.log('Failed to update password');
    console.log('Response:', await response.text());
  }
}

updateTest1Password().catch(console.error);