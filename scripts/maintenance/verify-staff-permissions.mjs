#!/usr/bin/env node

async function verifyStaffPermissions() {
  console.log('🔐 STAFF PERMISSIONS VERIFICATION');
  console.log('=================================');

  try {
    // Login as staff member (lalit)
    const loginResponse = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'lalit', password: 'lalit123' })
    });

    if (!loginResponse.ok) {
      console.log('❌ Staff login failed:', loginResponse.status);
      const error = await loginResponse.text();
      console.log('Error:', error);
      return;
    }

    const loginData = await loginResponse.json();
    console.log('✅ Staff (lalit) login successful');

    const token = loginData.token;
    const headers = { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // Test endpoints that should work for staff
    const endpointTests = [
      { 
        name: 'Orders Access', 
        method: 'GET',
        url: '/api/orders',
        shouldWork: true 
      },
      { 
        name: 'Admin Orders', 
        method: 'GET',
        url: '/api/admin/orders',
        shouldWork: true 
      },
      { 
        name: 'Admin Products', 
        method: 'GET',
        url: '/api/admin/products',
        shouldWork: true 
      },
      { 
        name: 'Price History', 
        method: 'GET',
        url: '/api/admin/products/30/price-history',
        shouldWork: true 
      },
      { 
        name: 'Product Update', 
        method: 'PUT',
        url: '/api/admin/products/30',
        body: {
          priceLevel1: 27.99,
          priceLevel2: 26.99,
          priceLevel3: 25.99,
          priceLevel4: 24.99,
          priceLevel5: 23.99
        },
        shouldWork: true 
      }
    ];

    for (const test of endpointTests) {
      try {
        const requestOptions = {
          method: test.method,
          headers: headers
        };

        if (test.body) {
          requestOptions.body = JSON.stringify(test.body);
        }

        const response = await fetch(`http://localhost:5000${test.url}`, requestOptions);
        
        const status = response.status;
        const isSuccess = status >= 200 && status < 300;
        
        if (test.shouldWork) {
          if (isSuccess) {
            console.log(`✅ ${test.name}: ${status} (Working)`);
            
            // For GET requests, show data count
            if (test.method === 'GET' && response.headers.get('content-type')?.includes('application/json')) {
              try {
                const data = await response.json();
                if (Array.isArray(data)) {
                  console.log(`   📊 Data: ${data.length} items`);
                } else if (data && typeof data === 'object') {
                  console.log(`   📄 Data: object with ${Object.keys(data).length} keys`);
                }
              } catch (e) {
                // Ignore JSON parsing errors for non-JSON responses
              }
            }
          } else {
            console.log(`❌ ${test.name}: ${status} (Should work but failed)`);
            const errorText = await response.text();
            console.log(`   Error: ${errorText.substring(0, 150)}`);
          }
        } else {
          if (!isSuccess) {
            console.log(`✅ ${test.name}: ${status} (Correctly denied)`);
          } else {
            console.log(`❌ ${test.name}: ${status} (Should be denied but allowed)`);
          }
        }
      } catch (error) {
        console.log(`❌ ${test.name}: Network error - ${error.message}`);
      }
    }

    console.log('\n📋 SUMMARY');
    console.log('----------');
    console.log('If all tests show ✅, then staff permissions are working correctly.');
    console.log('If any show ❌, there are still routing/permission issues to fix.');

  } catch (error) {
    console.log('❌ Verification failed:', error.message);
  }
}

verifyStaffPermissions();