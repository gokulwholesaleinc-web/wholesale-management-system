#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

/**
 * ENDPOINT REGISTRY ENFORCER & REAL-TIME VALIDATOR
 * 
 * This tool fixes the endpoint registry gaps and prevents future duplications.
 * It scans actual route files and frontend API calls to maintain consistency.
 */

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

console.log(`${colors.bold}${colors.blue}🛡️ ENDPOINT REGISTRY ENFORCER${colors.reset}\n`);

// Enhanced registry structure
class EndpointRegistry {
  constructor() {
    this.backendEndpoints = new Map();
    this.frontendCalls = new Map();
    this.issues = [];
  }

  // Scan backend route definitions
  scanBackendRoutes() {
    console.log('🔍 Scanning backend routes...');
    
    const backendFiles = [
      'server/routes.ts',
      'server/auth.ts',
      'server/cart.ts',
      'server/notifications.ts'
    ];

    backendFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        const lines = content.split('\n');
        
        // Enhanced regex patterns for different route styles
        const patterns = [
          /app\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
          /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
          /\.route\s*\(\s*['"`]([^'"`]+)['"`]\s*\)\s*\.(get|post|put|patch|delete)/gi
        ];

        patterns.forEach(pattern => {
          let match;
          while ((match = pattern.exec(content)) !== null) {
            let method, endpoint;
            
            // Handle different pattern structures
            if (match[3]) {
              endpoint = match[1];
              method = match[2].toUpperCase();
            } else {
              method = match[1].toUpperCase();
              endpoint = match[2];
            }

            const key = `${method} ${endpoint}`;
            const lineNumber = content.substring(0, match.index).split('\n').length;

            if (this.backendEndpoints.has(key)) {
              // Duplicate endpoint detected
              this.issues.push({
                type: 'DUPLICATE_BACKEND_ENDPOINT',
                severity: 'CRITICAL',
                endpoint: key,
                files: [this.backendEndpoints.get(key).file, file],
                message: `Duplicate endpoint definition: ${key}`
              });
            }

            this.backendEndpoints.set(key, {
              method,
              endpoint,
              file,
              lineNumber,
              handlers: this.extractHandlers(content, match.index)
            });
          }
        });
      }
    });

    console.log(`   Found ${this.backendEndpoints.size} backend endpoints`);
  }

  // Extract handler function names from route definitions
  extractHandlers(content, matchIndex) {
    const handlers = [];
    const afterMatch = content.substring(matchIndex);
    const handlerMatch = afterMatch.match(/,\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/);
    if (handlerMatch) {
      handlers.push(handlerMatch[1]);
    }
    return handlers;
  }

  // Scan frontend API calls
  scanFrontendAPICalls() {
    console.log('🔍 Scanning frontend API calls...');
    
    const frontendCallPatterns = [
      /fetch\s*\(\s*['"`]([^'"`]+)['"`]/gi,
      /apiRequest\s*\(\s*['"`]([^'"`]+)['"`]/gi,
      /queryKey:\s*\[\s*['"`]([^'"`]+)['"`]/gi,
      /axios\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi
    ];

    this.scanDirectoryForAPICalls('client/src', frontendCallPatterns);
    console.log(`   Found ${this.frontendCalls.size} frontend API calls`);
  }

  scanDirectoryForAPICalls(dir, patterns) {
    if (!fs.existsSync(dir)) return;

    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        this.scanDirectoryForAPICalls(fullPath, patterns);
      } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        patterns.forEach(pattern => {
          let match;
          while ((match = pattern.exec(content)) !== null) {
            let endpoint = match[1] || match[2];
            
            // Skip non-API endpoints
            if (!endpoint.startsWith('/api/')) continue;
            
            const lineNumber = content.substring(0, match.index).split('\n').length;
            
            if (this.frontendCalls.has(endpoint)) {
              this.frontendCalls.get(endpoint).files.push({
                file: fullPath,
                lineNumber
              });
            } else {
              this.frontendCalls.set(endpoint, {
                endpoint,
                files: [{
                  file: fullPath,
                  lineNumber
                }],
                pattern: match[0]
              });
            }
          }
        });
      }
    }
  }

  // Cross-reference frontend calls with backend endpoints
  validateEndpointConsistency() {
    console.log('🔍 Validating endpoint consistency...');
    
    const orphanedCalls = [];
    const unusedEndpoints = [];

    // Check for frontend calls without backend endpoints
    this.frontendCalls.forEach((callData, endpoint) => {
      // Try to match with different HTTP methods
      const hasBackendEndpoint = Array.from(this.backendEndpoints.keys())
        .some(backendKey => {
          const backendEndpoint = backendKey.split(' ')[1];
          return backendEndpoint === endpoint;
        });

      if (!hasBackendEndpoint) {
        orphanedCalls.push({
          endpoint,
          files: callData.files,
          pattern: callData.pattern
        });
        
        this.issues.push({
          type: 'ORPHANED_FRONTEND_CALL',
          severity: 'HIGH',
          endpoint,
          files: callData.files.map(f => f.file),
          message: `Frontend calls ${endpoint} but no backend endpoint exists`
        });
      }
    });

    // Check for backend endpoints without frontend calls
    this.backendEndpoints.forEach((endpointData, key) => {
      const endpoint = endpointData.endpoint;
      
      if (!this.frontendCalls.has(endpoint)) {
        unusedEndpoints.push({
          key,
          endpoint,
          file: endpointData.file
        });
        
        // Only flag as issue if it's not a webhook or external API
        if (!endpoint.includes('webhook') && !endpoint.includes('callback')) {
          this.issues.push({
            type: 'UNUSED_BACKEND_ENDPOINT',
            severity: 'MEDIUM',
            endpoint: key,
            file: endpointData.file,
            message: `Backend endpoint ${key} is not used by frontend`
          });
        }
      }
    });

    console.log(`   Found ${orphanedCalls.length} orphaned frontend calls`);
    console.log(`   Found ${unusedEndpoints.length} unused backend endpoints`);
  }

  // Generate updated registry file
  generateRegistryFile() {
    const registryData = {
      timestamp: new Date().toISOString(),
      backendEndpoints: Array.from(this.backendEndpoints.entries()).map(([key, data]) => ({
        key,
        method: data.method,
        endpoint: data.endpoint,
        file: data.file,
        lineNumber: data.lineNumber,
        handlers: data.handlers
      })),
      frontendCalls: Array.from(this.frontendCalls.entries()).map(([endpoint, data]) => ({
        endpoint,
        files: data.files,
        pattern: data.pattern
      })),
      issues: this.issues,
      statistics: {
        totalBackendEndpoints: this.backendEndpoints.size,
        totalFrontendCalls: this.frontendCalls.size,
        totalIssues: this.issues.length,
        criticalIssues: this.issues.filter(i => i.severity === 'CRITICAL').length
      }
    };

    fs.writeFileSync('endpoint-registry-report.json', JSON.stringify(registryData, null, 2));
    console.log(`📄 Generated endpoint registry report: endpoint-registry-report.json`);

    return registryData;
  }

  // Report issues
  reportIssues() {
    if (this.issues.length === 0) {
      console.log(`${colors.green}✅ No endpoint consistency issues found!${colors.reset}`);
      return;
    }

    console.log(`\n${colors.bold}=== ENDPOINT ISSUES DETECTED ===${colors.reset}\n`);

    const issuesByType = {};
    this.issues.forEach(issue => {
      if (!issuesByType[issue.type]) {
        issuesByType[issue.type] = [];
      }
      issuesByType[issue.type].push(issue);
    });

    Object.entries(issuesByType).forEach(([type, issues]) => {
      const severity = issues[0].severity;
      const colorCode = severity === 'CRITICAL' ? colors.red : 
                       severity === 'HIGH' ? colors.yellow : colors.blue;
      
      console.log(`${colorCode}${colors.bold}${severity}: ${type}${colors.reset}`);
      console.log(`   Found ${issues.length} issues of this type\n`);
      
      issues.slice(0, 3).forEach(issue => {
        console.log(`   ❌ ${issue.message}`);
        if (issue.files && Array.isArray(issue.files)) {
          issue.files.slice(0, 2).forEach(file => {
            console.log(`      📄 ${file}`);
          });
        } else if (issue.file) {
          console.log(`      📄 ${issue.file}`);
        }
      });
      
      if (issues.length > 3) {
        console.log(`   ... and ${issues.length - 3} more issues\n`);
      }
      console.log('');
    });

    const criticalCount = this.issues.filter(i => i.severity === 'CRITICAL').length;
    if (criticalCount > 0) {
      console.log(`${colors.red}${colors.bold}❌ ${criticalCount} critical endpoint issues require immediate attention!${colors.reset}\n`);
    }
  }
}

// Main execution
function main() {
  const registry = new EndpointRegistry();
  
  registry.scanBackendRoutes();
  registry.scanFrontendAPICalls();
  registry.validateEndpointConsistency();
  
  const report = registry.generateRegistryFile();
  registry.reportIssues();

  // Exit with error code if critical issues found
  const criticalIssues = registry.issues.filter(i => i.severity === 'CRITICAL').length;
  if (criticalIssues > 0) {
    process.exit(1);
  }

  console.log(`${colors.green}✅ Endpoint registry validation complete!${colors.reset}`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export default EndpointRegistry;