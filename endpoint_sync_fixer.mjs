#!/usr/bin/env node

import fs from 'fs';

console.log('🔧 ENDPOINT SYNCHRONIZATION FIXER');
console.log('=' .repeat(50));

// Read the sync report to identify missing endpoints
const syncReport = JSON.parse(fs.readFileSync('api-sync-report.json', 'utf8'));
const mismatches = syncReport.details.mismatches;

console.log(`Found ${mismatches.length} missing backend endpoints`);

// Read current routes file
const routesContent = fs.readFileSync('server/routes.ts', 'utf8');

// Track what we need to add
const endpointsToAdd = [];

// Filter out endpoints that actually exist but weren't detected properly
const criticalMissing = mismatches.filter(mismatch => {
  const endpoint = mismatch.endpoint;
  
  // Skip template literals and dynamic routes
  if (endpoint.includes('${') || endpoint.includes('/:')) {
    return false;
  }
  
  // Extract method and path
  const [method, path] = endpoint.split(' ');
  
  // Check if endpoint actually exists in routes file
  const methodLower = method.toLowerCase();
  const pathRegex = new RegExp(`app\\.${methodLower}\\s*\\(\\s*['"\`]${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}['"\`]`);
  
  if (routesContent.match(pathRegex)) {
    console.log(`✓ Found existing: ${endpoint}`);
    return false;
  }
  
  return true;
});

console.log(`\nActual missing endpoints: ${criticalMissing.length}`);

// Generate missing endpoints
const newEndpoints = [];

criticalMissing.forEach(mismatch => {
  const endpoint = mismatch.endpoint;
  const [method, path] = endpoint.split(' ');
  
  console.log(`→ Will add: ${endpoint}`);
  
  let endpointCode = '';
  
  switch (endpoint) {
    case 'GET /api/cart/clear':
      endpointCode = `
  // Clear cart endpoint
  app.get('/api/cart/clear', requireAuth, async (req: Request, res: Response) => {
    try {
      await storage.clearCart(req.user!.id);
      res.json({ success: true, message: 'Cart cleared successfully' });
    } catch (error) {
      console.error('Error clearing cart:', error);
      res.status(500).json({ error: 'Failed to clear cart' });
    }
  });`;
      break;
      
    case 'GET /api/admin/clear-global-cart':
      endpointCode = `
  // Clear all carts endpoint
  app.get('/api/admin/clear-global-cart', requireAdmin, async (req: Request, res: Response) => {
    try {
      await storage.clearAllCarts();
      res.json({ success: true, message: 'All carts cleared successfully' });
    } catch (error) {
      console.error('Error clearing all carts:', error);
      res.status(500).json({ error: 'Failed to clear all carts' });
    }
  });`;
      break;
      
    case 'GET /api/admin/activity-log':
      endpointCode = `
  // Activity log endpoint
  app.get('/api/admin/activity-log', requireAdmin, async (req: Request, res: Response) => {
    try {
      const logs = await storage.getActivityLogs(50);
      res.json(logs);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      res.status(500).json({ error: 'Failed to fetch activity logs' });
    }
  });`;
      break;
      
    case 'GET /api/admin/activity-logs':
      endpointCode = `
  // Activity logs endpoint (plural)
  app.get('/api/admin/activity-logs', requireAdmin, async (req: Request, res: Response) => {
    try {
      const logs = await storage.getActivityLogs(100);
      res.json(logs);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      res.status(500).json({ error: 'Failed to fetch activity logs' });
    }
  });`;
      break;
      
    case 'POST /api/update-cart-direct':
      endpointCode = `
  // Direct cart update endpoint
  app.post('/api/update-cart-direct', requireAuth, async (req: Request, res: Response) => {
    try {
      const { productId, quantity } = req.body;
      await storage.updateCartItem(req.user!.id, productId, quantity);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating cart directly:', error);
      res.status(500).json({ error: 'Failed to update cart' });
    }
  });`;
      break;
      
    case 'DELETE /api/simple-remove-from-cart':
      endpointCode = `
  // Simple cart removal endpoint
  app.delete('/api/simple-remove-from-cart', requireAuth, async (req: Request, res: Response) => {
    try {
      const { productId } = req.query;
      await storage.removeFromCart(req.user!.id, parseInt(productId as string));
      res.json({ success: true });
    } catch (error) {
      console.error('Error removing from cart:', error);
      res.status(500).json({ error: 'Failed to remove from cart' });
    }
  });`;
      break;
      
    default:
      // Skip unknown endpoints for now
      console.log(`  ⚠️  Skipping unknown endpoint: ${endpoint}`);
      return;
  }
  
  if (endpointCode) {
    newEndpoints.push(endpointCode);
  }
});

if (newEndpoints.length > 0) {
  // Find insertion point (before the 404 handler)
  const insertionPoint = routesContent.lastIndexOf('app.use(\'/api/*\'');
  
  if (insertionPoint === -1) {
    console.log('❌ Could not find insertion point in routes file');
    process.exit(1);
  }
  
  // Insert new endpoints before the 404 handler
  const beforeHandler = routesContent.substring(0, insertionPoint);
  const afterHandler = routesContent.substring(insertionPoint);
  
  const newRoutesContent = beforeHandler + 
    '\n  // =============================================\n' +
    '  // SYNC FIXER - MISSING ENDPOINTS\n' +
    '  // =============================================' +
    newEndpoints.join('') + '\n\n  ' +
    afterHandler;
  
  // Write updated routes file
  fs.writeFileSync('server/routes.ts', newRoutesContent);
  
  console.log(`\n✅ Added ${newEndpoints.length} missing endpoints to server/routes.ts`);
  console.log('🔄 Server will restart automatically');
} else {
  console.log('\n✅ No endpoints need to be added');
}

console.log('\n🎯 Endpoint synchronization complete!');