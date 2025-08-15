import * as fs from 'fs';
import * as path from 'path';

interface EndpointInfo {
  method: string;
  path: string;
  file: string;
  lineNumber: number;
}

function scanRouteFiles(): { endpoints: EndpointInfo[], duplicates: string[], report: string[] } {
  const routeFiles = [
    'server/routes.ts',
    'server/routes/auth.ts', 
    'server/routes/cart.ts',
    'server/routes/notifications.ts'
  ];

  const allEndpoints: EndpointInfo[] = [];
  const endpointMap = new Map<string, EndpointInfo[]>();
  
  // Patterns to match different endpoint definitions
  const patterns = [
    /app\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /authRoutes\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /cartRoutes\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g,
    /notificationRoutes\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g
  ];

  routeFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        
        patterns.forEach(pattern => {
          pattern.lastIndex = 0; // Reset regex state
          let match;
          
          while ((match = pattern.exec(content)) !== null) {
            const method = match[1].toUpperCase();
            const endpointPath = match[2];
            
            // Find line number
            const matchIndex = match.index!;
            const beforeMatch = content.substring(0, matchIndex);
            const lineNumber = beforeMatch.split('\n').length;
            
            const endpoint: EndpointInfo = {
              method,
              path: endpointPath,
              file: filePath,
              lineNumber
            };
            
            allEndpoints.push(endpoint);
            
            // Track for duplicate detection
            const key = `${method} ${endpointPath}`;
            if (!endpointMap.has(key)) {
              endpointMap.set(key, []);
            }
            endpointMap.get(key)!.push(endpoint);
          }
        });
      } catch (error) {
        console.error(`Error scanning ${filePath}:`, error);
      }
    }
  });

  // Find duplicates
  const duplicates: string[] = [];
  const duplicateDetails: string[] = [];
  
  endpointMap.forEach((endpoints, key) => {
    if (endpoints.length > 1) {
      duplicates.push(key);
      duplicateDetails.push(`❌ DUPLICATE: ${key}`);
      endpoints.forEach(ep => {
        duplicateDetails.push(`   📁 ${ep.file}:${ep.lineNumber}`);
      });
      duplicateDetails.push('');
    }
  });

  // Generate report
  const report = [
    '=== COMPREHENSIVE ENDPOINT VALIDATION ===',
    `📁 Files Scanned: ${routeFiles.length}`,
    `🔍 Total Endpoints Found: ${allEndpoints.length}`,
    `🔄 Duplicate Endpoints: ${duplicates.length}`,
    '',
    '=== ENDPOINTS BY FILE ===',
  ];

  // Group by file
  const byFile = new Map<string, EndpointInfo[]>();
  allEndpoints.forEach(ep => {
    if (!byFile.has(ep.file)) {
      byFile.set(ep.file, []);
    }
    byFile.get(ep.file)!.push(ep);
  });

  byFile.forEach((endpoints, file) => {
    report.push(`📁 ${file}: ${endpoints.length} endpoints`);
    endpoints.slice(0, 10).forEach(ep => {
      report.push(`   ${ep.method} ${ep.path} (line ${ep.lineNumber})`);
    });
    if (endpoints.length > 10) {
      report.push(`   ... and ${endpoints.length - 10} more endpoints`);
    }
    report.push('');
  });

  if (duplicates.length > 0) {
    report.push('=== DUPLICATE ENDPOINTS DETECTED ===');
    report.push(...duplicateDetails);
    report.push('🚨 ACTION REQUIRED:');
    report.push('- Review and remove duplicate endpoint definitions');
    report.push('- Consolidate routing logic to prevent conflicts');
  } else {
    report.push('✅ NO DUPLICATE ENDPOINTS FOUND');
  }

  return { endpoints: allEndpoints, duplicates, report };
}

// Run validation
const result = scanRouteFiles();
console.log(result.report.join('\n'));

// Check for common routing mismatches
console.log('\n=== ROUTING MISMATCH ANALYSIS ===');

const commonIssues = [
  { pattern: /\/api\/customer/, description: 'Customer-specific endpoints' },
  { pattern: /\/api\/admin/, description: 'Admin-specific endpoints' },
  { pattern: /\/api\/staff/, description: 'Staff-specific endpoints' },
  { pattern: /\/api\/auth/, description: 'Authentication endpoints' },
  { pattern: /\/api\/products/, description: 'Product endpoints' },
  { pattern: /\/api\/orders/, description: 'Order endpoints' },
  { pattern: /\/api\/cart/, description: 'Cart endpoints' }
];

commonIssues.forEach(issue => {
  const matching = result.endpoints.filter(ep => issue.pattern.test(ep.path));
  if (matching.length > 0) {
    console.log(`📊 ${issue.description}: ${matching.length} endpoints`);
    matching.slice(0, 5).forEach(ep => {
      console.log(`   ${ep.method} ${ep.path}`);
    });
    if (matching.length > 5) {
      console.log(`   ... and ${matching.length - 5} more`);
    }
  }
});

console.log(`\n📈 SUMMARY: ${result.endpoints.length} total endpoints, ${result.duplicates.length} duplicates`);

if (result.duplicates.length === 0) {
  console.log('🎉 ENDPOINT VALIDATION PASSED - NO ROUTING CONFLICTS');
} else {
  console.log('⚠️  ENDPOINT VALIDATION FAILED - DUPLICATES FOUND');
  process.exit(1);
}