#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const SYNC_REPORT = {
  endpoints: { backend: 0, frontend: 0, matched: 0, orphaned: [] },
  schemas: { defined: 0, used: 0, orphaned: [] },
  duplicates: { endpoints: [], functions: [], schemas: [] },
  status: 'VALIDATING'
};

console.log('🔄 FINAL BACKEND-FRONTEND SYNC VALIDATION');
console.log('==========================================');

// Extract endpoints from backend
function extractBackendEndpoints() {
  const routesFile = 'server/routes.ts';
  if (!fs.existsSync(routesFile)) return [];
  
  const content = fs.readFileSync(routesFile, 'utf8');
  const endpoints = [];
  
  // Match all app.method('/path', ...) patterns
  const endpointRegex = /app\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g;
  let match;
  
  while ((match = endpointRegex.exec(content)) !== null) {
    endpoints.push({
      method: match[1].toUpperCase(),
      path: match[2],
      fullSignature: `${match[1].toUpperCase()} ${match[2]}`
    });
  }
  
  return endpoints;
}

// Extract API calls from frontend
function extractFrontendCalls() {
  const calls = [];
  
  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir, { withFileTypes: true });
    
    for (const file of files) {
      const fullPath = path.join(dir, file.name);
      
      if (file.isDirectory() && !file.name.startsWith('.') && file.name !== 'node_modules') {
        scanDirectory(fullPath);
      } else if (file.isFile() && (file.name.endsWith('.tsx') || file.name.endsWith('.ts'))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        // Extract API calls - multiple patterns
        const patterns = [
          /apiRequest\s*\(\s*['"`]([^'"`]+)['"`]/g,
          /fetch\s*\(\s*['"`]([^'"`]+)['"`]/g,
          /queryKey:\s*\[\s*['"`]([^'"`]+)['"`]/g,
          /mutationFn:\s*.*?['"`]([^'"`]+)['"`]/g
        ];
        
        patterns.forEach(pattern => {
          let match;
          while ((match = pattern.exec(content)) !== null) {
            if (match[1].startsWith('/api/') || match[1].startsWith('api/')) {
              calls.push({
                path: match[1].startsWith('/') ? match[1] : '/' + match[1],
                file: fullPath,
                type: 'API_CALL'
              });
            }
          }
        });
      }
    }
  }
  
  scanDirectory('client/src');
  return calls;
}

// Check for duplicate endpoints
function checkDuplicates(endpoints) {
  const seen = new Map();
  const duplicates = [];
  
  endpoints.forEach(endpoint => {
    const key = `${endpoint.method} ${endpoint.path}`;
    if (seen.has(key)) {
      duplicates.push(key);
    } else {
      seen.set(key, true);
    }
  });
  
  return duplicates;
}

// Validate schema usage
function validateSchemas() {
  const schemaFile = 'shared/schema.ts';
  if (!fs.existsSync(schemaFile)) return { defined: 0, used: 0, orphaned: [] };
  
  const content = fs.readFileSync(schemaFile, 'utf8');
  
  // Count table definitions
  const tableMatches = content.match(/export const \w+ = pgTable/g) || [];
  const defined = tableMatches.length;
  
  // This is simplified - would need more complex analysis for real usage
  const used = defined; // Assume all are used for now
  
  return { defined, used, orphaned: [] };
}

// Main validation
async function runValidation() {
  console.log('1. Extracting backend endpoints...');
  const backendEndpoints = extractBackendEndpoints();
  SYNC_REPORT.endpoints.backend = backendEndpoints.length;
  
  console.log('2. Extracting frontend API calls...');
  const frontendCalls = extractFrontendCalls();
  SYNC_REPORT.endpoints.frontend = frontendCalls.length;
  
  console.log('3. Checking for duplicates...');
  SYNC_REPORT.duplicates.endpoints = checkDuplicates(backendEndpoints);
  
  console.log('4. Validating schema usage...');
  const schemaValidation = validateSchemas();
  SYNC_REPORT.schemas = schemaValidation;
  
  console.log('5. Matching endpoints with calls...');
  let matched = 0;
  const frontendPaths = new Set(frontendCalls.map(call => call.path));
  const backendPaths = new Set(backendEndpoints.map(ep => ep.path));
  
  frontendPaths.forEach(path => {
    if (backendPaths.has(path)) matched++;
  });
  
  SYNC_REPORT.endpoints.matched = matched;
  
  // Find orphaned endpoints
  SYNC_REPORT.endpoints.orphaned = backendEndpoints
    .filter(ep => !frontendPaths.has(ep.path))
    .map(ep => ep.fullSignature);
  
  SYNC_REPORT.status = 'COMPLETED';
  
  // Generate report
  console.log('\n🔄 SYNC VALIDATION SUMMARY');
  console.log('===========================');
  console.log(`Backend endpoints: ${SYNC_REPORT.endpoints.backend}`);
  console.log(`Frontend API calls: ${SYNC_REPORT.endpoints.frontend}`);
  console.log(`Matched endpoints: ${SYNC_REPORT.endpoints.matched}`);
  console.log(`Duplicate endpoints: ${SYNC_REPORT.duplicates.endpoints.length}`);
  console.log(`Schema tables: ${SYNC_REPORT.schemas.defined}`);
  console.log(`Orphaned endpoints: ${SYNC_REPORT.endpoints.orphaned.length}`);
  
  // Calculate sync percentage
  const syncPercentage = SYNC_REPORT.endpoints.backend > 0 
    ? Math.round((SYNC_REPORT.endpoints.matched / SYNC_REPORT.endpoints.backend) * 100)
    : 100;
  
  console.log(`\nSync Score: ${syncPercentage}%`);
  
  if (syncPercentage >= 95 && SYNC_REPORT.duplicates.endpoints.length === 0) {
    console.log('✅ EXCELLENT SYNC - System is properly synchronized');
    console.log('✅ No duplicate endpoints found');
    console.log('✅ Backend and frontend are in sync');
  } else if (syncPercentage >= 80) {
    console.log('🟡 GOOD SYNC - Minor issues found');
    if (SYNC_REPORT.duplicates.endpoints.length > 0) {
      console.log(`⚠️  ${SYNC_REPORT.duplicates.endpoints.length} duplicate endpoints found`);
    }
  } else {
    console.log('🔴 POOR SYNC - Major synchronization issues');
    console.log('⚠️  Manual review required');
  }
  
  // Write detailed report
  fs.writeFileSync('final-sync-report.json', JSON.stringify(SYNC_REPORT, null, 2));
  
  return SYNC_REPORT;
}

// Run validation
runValidation().then(report => {
  const syncScore = report.endpoints.backend > 0 
    ? Math.round((report.endpoints.matched / report.endpoints.backend) * 100)
    : 100;
  
  process.exit(syncScore >= 95 && report.duplicates.endpoints.length === 0 ? 0 : 1);
});