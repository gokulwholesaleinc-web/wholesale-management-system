import { readFileSync } from 'fs';

async function getAuthToken() {
  const response = await fetch('http://localhost:5000/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'admin123' })
  });
  
  if (!response.ok) {
    throw new Error(`Authentication failed: ${response.status}`);
  }
  
  const data = await response.json();
  return data.token;
}

async function testUpdatedEndpoints() {
  console.log('Testing the 4 endpoints we fixed...');
  const token = await getAuthToken();
  
  const endpointsToTest = [
    { method: 'GET', path: '/api/products/search?q=red', auth: false, description: 'Product search with query' },
    { method: 'POST', path: '/api/cart/add', auth: true, description: 'Add to cart', body: { productId: 1, quantity: 1 } },
    { method: 'GET', path: '/api/addresses', auth: true, description: 'Get user addresses' },
    { method: 'GET', path: '/api/purchase-orders', auth: true, description: 'Get purchase orders' },
  ];

  console.log('\n=== TESTING UPDATED ENDPOINTS ===');
  let successCount = 0;

  for (const endpoint of endpointsToTest) {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (endpoint.auth && token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const options = { method: endpoint.method, headers };
      if (endpoint.body) {
        options.body = JSON.stringify(endpoint.body);
      }
      
      const response = await fetch(`http://localhost:5000${endpoint.path}`, options);
      
      if (response.ok) {
        console.log(`✅ ${endpoint.method} ${endpoint.path} - SUCCESS (${response.status})`);
        successCount++;
      } else {
        console.log(`❌ ${endpoint.method} ${endpoint.path} - FAILED (${response.status})`);
        const error = await response.text();
        console.log(`   Error: ${error}`);
      }
      
    } catch (error) {
      console.log(`💥 ${endpoint.method} ${endpoint.path} - EXCEPTION: ${error.message}`);
    }
  }

  console.log(`\n=== RESULTS ===`);
  console.log(`Successful endpoints: ${successCount}/4`);
  console.log(`Fixed endpoints success rate: ${(successCount/4*100).toFixed(1)}%`);
}

testUpdatedEndpoints().catch(console.error);
