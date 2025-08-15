#!/usr/bin/env tsx

/**
 * ENDPOINT VALIDATION SCRIPT
 * 
 * Run this script to check for duplicate endpoints and generate reports:
 * 
 * npm run check-endpoints
 * 
 * This script will:
 * 1. Scan all route files for endpoint definitions
 * 2. Compare against the central registry
 * 3. Report duplicates and conflicts
 * 4. Generate documentation
 */

import fs from 'fs';
import path from 'path';
import { ENDPOINT_REGISTRY, validateAllEndpoints } from '../server/endpoint-registry';

function scanRouteFiles(): { found: string[], duplicates: string[] } {
  const routeFiles = [
    'server/routes.ts',
    'server/routes/auth.ts',
    'server/routes/cart.ts',
    'server/routes/notifications.ts'
  ];

  const found: string[] = [];
  const duplicates: string[] = [];
  const endpointPattern = /app\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g;

  routeFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      let match;
      
      while ((match = endpointPattern.exec(content)) !== null) {
        const method = match[1].toUpperCase();
        const path = match[2];
        const endpoint = `${method} ${path}`;
        
        found.push(`${endpoint} (${filePath})`);
        
        // Check for duplicates
        const occurrences = found.filter(f => f.startsWith(endpoint)).length;
        if (occurrences > 1) {
          duplicates.push(endpoint);
        }
      }
    }
  });

  return { found, duplicates: [...new Set(duplicates)] };
}

function generateReport(): void {
  console.log('🔍 ENDPOINT ANALYSIS REPORT');
  console.log('=' .repeat(50));
  
  // Registry validation
  const registryReport = ENDPOINT_REGISTRY.validateEndpoints();
  console.log('\n📋 REGISTRY VALIDATION:');
  registryReport.report.forEach(line => console.log(line));
  
  // File scan
  const { found, duplicates } = scanRouteFiles();
  console.log(`\n📁 FILES SCANNED: ${found.length} endpoints found`);
  
  if (duplicates.length > 0) {
    console.log('\n❌ DUPLICATES IN FILES:');
    duplicates.forEach(dup => {
      console.log(`  🔄 ${dup}`);
      const instances = found.filter(f => f.startsWith(dup));
      instances.forEach(instance => console.log(`    - ${instance}`));
    });
  } else {
    console.log('\n✅ NO FILE-LEVEL DUPLICATES FOUND');
  }
  
  // Summary
  console.log('\n📊 SUMMARY:');
  console.log(`  Registry Endpoints: ${registryReport.valid + registryReport.duplicates}`);
  console.log(`  File Endpoints: ${found.length}`);
  console.log(`  Registry Duplicates: ${registryReport.duplicates}`);
  console.log(`  File Duplicates: ${duplicates.length}`);
  
  // Recommendations
  console.log('\n💡 RECOMMENDATIONS:');
  if (registryReport.duplicates > 0 || duplicates.length > 0) {
    console.log('  1. Remove duplicate endpoints from route files');
    console.log('  2. Update endpoint-registry.ts with correct information');
    console.log('  3. Use modular route architecture to prevent future duplicates');
    console.log('  4. Run this script before adding new endpoints');
  } else {
    console.log('  ✅ No action needed - all endpoints are properly organized');
  }
}

// Main execution
generateReport();

export { scanRouteFiles, generateReport };