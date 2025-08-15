#!/usr/bin/env node

import fs from 'fs';

console.log('🔧 FIXING DUPLICATE ENDPOINTS FOR 100% SYNC');
console.log('=' .repeat(50));

// Read the routes file
let routesContent = fs.readFileSync('server/routes.ts', 'utf8');

// Track duplicates to remove
const duplicatesToRemove = [
  // Cart clear duplicates - keep DELETE, remove GET
  {
    pattern: /app\.get\(\'\/api\/cart\/clear\'/g,
    replacement: '',
    reason: 'Duplicate cart clear - keeping DELETE version'
  },
  {
    pattern: /app\.get\(\'\/api\/admin\/clear-global-cart\'/g,
    replacement: '',
    reason: 'Duplicate admin cart clear - keeping DELETE version'
  },
  
  // Order status duplicates - keep PATCH, remove PUT
  {
    pattern: /app\.put\(\'\/api\/orders\/:\w+\/status\'/g,
    replacement: '',
    reason: 'Duplicate order status - keeping PATCH version'
  },
  
  // User management duplicates - consolidate
  {
    pattern: /app\.put\(\'\/api\/admin\/users\/:\w+\'/g,
    replacement: '',
    reason: 'Duplicate user update - keeping PATCH version'
  },
  
  // Purchase order duplicates - keep admin versions
  {
    pattern: /app\.(get|post|delete)\(\'\/purchase-orders/g,
    replacement: '',
    reason: 'Duplicate purchase orders - keeping /api/admin/purchase-orders'
  }
];

// Apply duplicate removal
let removedCount = 0;
duplicatesToRemove.forEach(dup => {
  const matches = routesContent.match(dup.pattern);
  if (matches) {
    console.log(`Removing ${matches.length} duplicate(s): ${dup.reason}`);
    
    // Find and remove the entire endpoint block
    const lines = routesContent.split('\n');
    const newLines = [];
    let inEndpointBlock = false;
    let braceCount = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check if this line starts a duplicate endpoint
      if (dup.pattern.test(line)) {
        console.log(`  Removing line ${i + 1}: ${line.trim()}`);
        inEndpointBlock = true;
        braceCount = 0;
        continue;
      }
      
      if (inEndpointBlock) {
        // Count braces to find end of endpoint
        braceCount += (line.match(/\{/g) || []).length;
        braceCount -= (line.match(/\}/g) || []).length;
        
        if (braceCount <= 0 && line.includes('});')) {
          inEndpointBlock = false;
          removedCount++;
          continue;
        }
        continue;
      }
      
      newLines.push(line);
    }
    
    routesContent = newLines.join('\n');
  }
});

console.log(`✅ Removed ${removedCount} duplicate endpoint blocks`);

// Add missing critical endpoints that frontend actually needs
const missingEndpoints = [
  {
    path: '/api/products/search',
    method: 'GET',
    handler: `
  // Product search endpoint
  app.get('/api/products/search', async (req: Request, res: Response) => {
    try {
      const { q } = req.query;
      const products = await storage.searchProducts(q as string);
      res.json(products);
    } catch (error) {
      console.error('Error searching products:', error);
      res.status(500).json({ error: 'Failed to search products' });
    }
  });`
  },
  {
    path: '/api/analytics/trending-products',
    method: 'GET', 
    handler: `
  // Trending products endpoint
  app.get('/api/analytics/trending-products', async (req: Request, res: Response) => {
    try {
      const trending = await storage.getTrendingProducts();
      res.json(trending);
    } catch (error) {
      console.error('Error fetching trending products:', error);
      res.status(500).json({ error: 'Failed to fetch trending products' });
    }
  });`
  },
  {
    path: '/api/admin/stats',
    method: 'GET',
    handler: `
  // Admin stats endpoint
  app.get('/api/admin/stats', requireAdmin, async (req: Request, res: Response) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
  });`
  }
];

// Check if endpoints already exist before adding
const existingEndpoints = [];
missingEndpoints.forEach(endpoint => {
  const regex = new RegExp(`app\\.${endpoint.method.toLowerCase()}\\s*\\(\\s*['"\`]${endpoint.path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`);
  if (!routesContent.match(regex)) {
    existingEndpoints.push(endpoint);
  } else {
    console.log(`✓ ${endpoint.method} ${endpoint.path} already exists`);
  }
});

// Add missing endpoints before 404 handler
if (existingEndpoints.length > 0) {
  const insertionPoint = routesContent.lastIndexOf('app.use(\'/api/*\'');
  
  if (insertionPoint !== -1) {
    const beforeHandler = routesContent.substring(0, insertionPoint);
    const afterHandler = routesContent.substring(insertionPoint);
    
    const newEndpointsCode = existingEndpoints.map(e => e.handler).join('\n');
    
    routesContent = beforeHandler + 
      '\n  // =============================================\n' +
      '  // CRITICAL MISSING ENDPOINTS FOR 100% SYNC\n' +
      '  // =============================================' +
      newEndpointsCode + '\n\n  ' +
      afterHandler;
    
    console.log(`✅ Added ${existingEndpoints.length} missing critical endpoints`);
  }
}

// Write the cleaned routes file
fs.writeFileSync('server/routes.ts', routesContent);

console.log('\n🎯 ENDPOINT DEDUPLICATION COMPLETE');
console.log('🔄 Server will restart automatically');
console.log('📊 Run audit again to verify 100% sync rate');