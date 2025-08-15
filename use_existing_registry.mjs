#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

console.log('🔍 USING EXISTING ENDPOINT REGISTRY FOR 100% SYNC');
console.log('=' .repeat(60));

// Replicate the existing registry logic in JavaScript
class EndpointRegistry {
  constructor() {
    this.endpoints = new Map();
  }

  register(endpoint) {
    const key = `${endpoint.method} ${endpoint.path}`;
    
    if (this.endpoints.has(key)) {
      const existing = this.endpoints.get(key);
      console.log(`🚨 DUPLICATE FOUND: ${key}`);
      console.log(`   Existing: ${existing.module || 'unknown'}`);
      console.log(`   Attempted: ${endpoint.module}`);
      return false;
    }
    
    this.endpoints.set(key, endpoint);
    return true;
  }

  findDuplicates() {
    const pathCounts = new Map();
    const duplicates = [];

    this.endpoints.forEach((endpoint, key) => {
      pathCounts.set(key, (pathCounts.get(key) || 0) + 1);
    });

    pathCounts.forEach((count, key) => {
      if (count > 1) {
        duplicates.push(`${key} (${count} times)`);
      }
    });

    return duplicates;
  }

  getAllEndpoints() {
    return Array.from(this.endpoints.values());
  }

  getStats() {
    return {
      total: this.endpoints.size,
      duplicates: this.findDuplicates().length
    };
  }
}

// Scan route files for endpoints
function scanRouteFiles() {
  const routeFiles = [
    'server/routes.ts',
    'server/routes/auth.ts',
    'server/routes/cart.ts',
    'server/routes/notifications.ts',
    'server/routes/purchase-orders.ts'
  ];

  const foundEndpoints = [];
  const endpointPattern = /app\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g;

  routeFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        let match;
        
        // Reset regex
        endpointPattern.lastIndex = 0;
        
        while ((match = endpointPattern.exec(content)) !== null) {
          const method = match[1].toUpperCase();
          const endpointPath = match[2];
          
          // Find line number
          const beforeMatch = content.substring(0, match.index);
          const lineNumber = beforeMatch.split('\n').length;
          
          foundEndpoints.push({
            method,
            path: endpointPath,
            handler: 'scanned-from-file',
            module: path.basename(filePath),
            middleware: ['unknown'],
            description: `${filePath}:${lineNumber}`,
            status: 'active',
            lineNumber
          });
        }
      } catch (error) {
        console.error(`Error scanning ${filePath}:`, error.message);
      }
    } else {
      console.log(`⚠️  File not found: ${filePath}`);
    }
  });

  return foundEndpoints;
}

// Main sync function
function syncWithActualRoutes() {
  console.log('📁 Scanning route files...');
  const scannedEndpoints = scanRouteFiles();
  const duplicates = [];
  const endpointCounts = new Map();
  
  // Count occurrences of each endpoint
  scannedEndpoints.forEach(endpoint => {
    const key = `${endpoint.method} ${endpoint.path}`;
    endpointCounts.set(key, (endpointCounts.get(key) || 0) + 1);
  });
  
  // Find duplicates
  endpointCounts.forEach((count, key) => {
    if (count > 1) {
      const duplicateEndpoints = scannedEndpoints.filter(e => `${e.method} ${e.path}` === key);
      duplicates.push({
        key,
        count,
        locations: duplicateEndpoints.map(e => `${e.module}:${e.lineNumber}`)
      });
    }
  });
  
  // Register all endpoints
  const registry = new EndpointRegistry();
  scannedEndpoints.forEach(endpoint => {
    registry.register(endpoint);
  });
  
  const stats = registry.getStats();
  
  console.log('\n📊 SCAN RESULTS:');
  console.log(`Files Scanned: 5 route files`);
  console.log(`Endpoints Found: ${scannedEndpoints.length}`);
  console.log(`Unique Endpoints: ${stats.total}`);
  console.log(`Duplicates Found: ${duplicates.length}`);
  
  if (duplicates.length > 0) {
    console.log('\n🔴 DUPLICATE ENDPOINTS DETECTED:');
    duplicates.forEach(dup => {
      console.log(`\n❌ ${dup.key} (${dup.count} times):`);
      dup.locations.forEach(loc => console.log(`   - ${loc}`));
    });
    
    console.log('\n🔧 RECOMMENDED ACTIONS:');
    console.log('1. Keep endpoints in main routes.ts');
    console.log('2. Remove duplicates from sub-route files');
    console.log('3. Use middleware for shared functionality');
  } else {
    console.log('\n✅ NO DUPLICATES FOUND - ROUTING IS CLEAN');
  }
  
  // Calculate sync score
  const uniqueEndpoints = stats.total;
  const totalRegistrations = scannedEndpoints.length;
  const syncScore = Math.round((uniqueEndpoints / totalRegistrations) * 100);
  
  console.log(`\n🎯 SYNC SCORE: ${syncScore}%`);
  
  if (syncScore < 100) {
    console.log('📈 TO ACHIEVE 100% SYNC:');
    console.log(`- Remove ${totalRegistrations - uniqueEndpoints} duplicate registrations`);
    console.log('- Consolidate route definitions');
  }
  
  return { 
    scanned: scannedEndpoints.length, 
    unique: uniqueEndpoints,
    duplicates, 
    syncScore 
  };
}

// Run the sync analysis
const result = syncWithActualRoutes();

// Generate fix recommendations
if (result.duplicates.length > 0) {
  console.log('\n🛠️  AUTOMATED FIX AVAILABLE');
  console.log('The existing endpoint registry can prevent these duplicates');
  console.log('Integration with route registration will achieve 100% sync');
}

console.log('\n🎯 ANALYSIS COMPLETE');