#!/usr/bin/env node

/**
 * ENHANCED ENDPOINT AUDIT SYSTEM WITH ROUTING CONFLICT DETECTION
 * Detects duplicates, route conflicts, and ordering issues
 */

import fs from 'fs';
import path from 'path';

class RoutePattern {
  constructor(path) {
    this.originalPath = path;
    this.segments = path.split('/').filter(s => s);
    this.hasParams = path.includes(':');
    this.paramSegments = [];
    this.staticSegments = [];
    
    this.segments.forEach((segment, index) => {
      if (segment.startsWith(':')) {
        this.paramSegments.push({ index, name: segment });
      } else {
        this.staticSegments.push({ index, value: segment });
      }
    });
  }
  
  // Check if this route could conflict with another
  conflictsWith(other) {
    if (this.segments.length !== other.segments.length) {
      return false;
    }
    
    // Check segment by segment
    for (let i = 0; i < this.segments.length; i++) {
      const thisSeg = this.segments[i];
      const otherSeg = other.segments[i];
      
      // If both are static and different, no conflict
      if (!thisSeg.startsWith(':') && !otherSeg.startsWith(':') && thisSeg !== otherSeg) {
        return false;
      }
    }
    
    return true;
  }
  
  // Check if a specific path would match this pattern
  wouldMatch(testPath) {
    const testSegments = testPath.split('/').filter(s => s);
    
    if (testSegments.length !== this.segments.length) {
      return false;
    }
    
    for (let i = 0; i < this.segments.length; i++) {
      const patternSeg = this.segments[i];
      const testSeg = testSegments[i];
      
      // If pattern segment is not a parameter, must match exactly
      if (!patternSeg.startsWith(':') && patternSeg !== testSeg) {
        return false;
      }
    }
    
    return true;
  }
}

function scanRouteFiles() {
  const routeFiles = [
    './server/routes.ts',
    './server/auth.ts', 
    './server/cart.ts',
    './server/notifications.ts',
    './server/routes/orders.ts',
    './server/routes/admin.ts',
    './server/routes/reset-routes.ts'
  ];
  
  const endpoints = [];
  const methodGroups = new Map(); // Group by method for conflict analysis
  
  console.log('🔍 ENHANCED ENDPOINT AUDIT STARTING...');
  console.log('='.repeat(50));
  
  routeFiles.forEach(filePath => {
    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found: ${filePath}`);
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      // Enhanced regex to catch more route definition patterns
      const routeMatches = [
        line.match(/app\.(get|post|put|patch|delete|all)\s*\(\s*['"`]([^'"`]+)['"`]/),
        line.match(/router\.(get|post|put|patch|delete|all)\s*\(\s*['"`]([^'"`]+)['"`]/),
        line.match(/\.route\s*\(\s*['"`]([^'"`]+)['"`]\s*\)\s*\.(get|post|put|patch|delete|all)/),
      ];
      
      const routeMatch = routeMatches.find(match => match !== null);
      
      if (routeMatch) {
        let method, path;
        
        if (routeMatch[0].includes('.route(')) {
          // Handle .route() pattern
          path = routeMatch[1];
          method = routeMatch[2].toUpperCase();
        } else {
          method = routeMatch[1].toUpperCase();
          path = routeMatch[2];
        }
        
        const endpoint = {
          method,
          path,
          pattern: new RoutePattern(path),
          endpoint: `${method} ${path}`,
          file: filePath,
          line: index + 1,
          source: line.trim()
        };
        
        endpoints.push(endpoint);
        
        // Group by method for conflict analysis
        if (!methodGroups.has(method)) {
          methodGroups.set(method, []);
        }
        methodGroups.get(method).push(endpoint);
      }
    });
  });
  
  return { endpoints, methodGroups };
}

function analyzeRouteConflicts(methodGroups) {
  const conflicts = [];
  
  console.log('\n🔍 ANALYZING ROUTE CONFLICTS...');
  console.log('='.repeat(40));
  
  methodGroups.forEach((routes, method) => {
    console.log(`\n📋 Analyzing ${method} routes (${routes.length} total):`);
    
    // Sort routes by definition order (file + line)
    routes.sort((a, b) => {
      if (a.file !== b.file) {
        return a.file.localeCompare(b.file);
      }
      return a.line - b.line;
    });
    
    // Check for conflicts
    for (let i = 0; i < routes.length; i++) {
      for (let j = i + 1; j < routes.length; j++) {
        const route1 = routes[i];
        const route2 = routes[j];
        
        if (route1.pattern.conflictsWith(route2.pattern)) {
          const conflict = {
            type: 'ROUTE_CONFLICT',
            method,
            routes: [route1, route2],
            severity: 'HIGH'
          };
          
          // Check if this is a ordering issue (specific vs parameterized)
          if (route1.pattern.hasParams && !route2.pattern.hasParams) {
            conflict.issue = 'Parameterized route defined before specific route';
            conflict.suggestion = `Move "${route2.path}" before "${route1.path}"`;
            conflict.severity = 'CRITICAL';
          } else if (!route1.pattern.hasParams && route2.pattern.hasParams) {
            conflict.issue = 'Specific route correctly placed before parameterized route';
            conflict.severity = 'INFO';
          } else {
            conflict.issue = 'Routes have conflicting patterns';
            conflict.suggestion = 'Review route patterns for ambiguity';
          }
          
          conflicts.push(conflict);
        }
      }
    }
  });
  
  return conflicts;
}

function testCommonConflicts(methodGroups) {
  const testCases = [
    { method: 'DELETE', path: '/api/cart/clear' },
    { method: 'GET', path: '/api/products/123' },
    { method: 'GET', path: '/api/users/profile' },
    { method: 'POST', path: '/api/orders/123/items' }
  ];
  
  console.log('\n🧪 TESTING COMMON ROUTING SCENARIOS...');
  console.log('='.repeat(45));
  
  const routingIssues = [];
  
  testCases.forEach(testCase => {
    const { method, path } = testCase;
    const routes = methodGroups.get(method) || [];
    
    const matchingRoutes = routes.filter(route => route.pattern.wouldMatch(path));
    
    console.log(`\n🔍 Testing: ${method} ${path}`);
    console.log(`   Matching routes found: ${matchingRoutes.length}`);
    
    if (matchingRoutes.length > 1) {
      console.log(`   ⚠️  MULTIPLE MATCHES DETECTED:`);
      matchingRoutes.forEach((route, index) => {
        console.log(`      ${index + 1}. ${route.path} (${route.file}:${route.line})`);
      });
      
      // Check which route would actually be matched (first one)
      const firstMatch = matchingRoutes[0];
      console.log(`   🎯 Express would match: ${firstMatch.path}`);
      
      if (firstMatch.path !== path && matchingRoutes.some(r => r.path === path)) {
        routingIssues.push({
          testPath: path,
          expectedRoute: path,
          actualRoute: firstMatch.path,
          issue: 'Route ordering prevents specific route from being matched',
          severity: 'CRITICAL'
        });
      }
    } else if (matchingRoutes.length === 1) {
      console.log(`   ✅ Single match: ${matchingRoutes[0].path}`);
    } else {
      console.log(`   ❌ No matching routes found`);
    }
  });
  
  return routingIssues;
}

function generateReport(endpoints, conflicts, routingIssues) {
  console.log('\n📊 ENHANCED ENDPOINT AUDIT RESULTS');
  console.log('='.repeat(40));
  console.log(`📁 Total Endpoints: ${endpoints.length}`);
  console.log(`🔄 Route Conflicts: ${conflicts.length}`);
  console.log(`⚠️  Routing Issues: ${routingIssues.length}`);
  
  // Duplicates check
  const duplicateMap = new Map();
  endpoints.forEach(endpoint => {
    const key = endpoint.endpoint;
    if (!duplicateMap.has(key)) {
      duplicateMap.set(key, []);
    }
    duplicateMap.get(key).push(endpoint);
  });
  
  const duplicates = Array.from(duplicateMap.entries()).filter(([_, endpoints]) => endpoints.length > 1);
  console.log(`🔄 Exact Duplicates: ${duplicates.length}`);
  
  if (duplicates.length > 0) {
    console.log('\n❌ DUPLICATE ENDPOINTS FOUND:');
    duplicates.forEach(([endpoint, locations]) => {
      console.log(`   ${endpoint}`);
      locations.forEach(loc => {
        console.log(`      - ${loc.file}:${loc.line}`);
      });
    });
  }
  
  if (conflicts.length > 0) {
    console.log('\n⚠️  ROUTE CONFLICTS DETECTED:');
    conflicts.forEach((conflict, index) => {
      console.log(`\n   ${index + 1}. ${conflict.method} Routes - ${conflict.severity}`);
      console.log(`      Issue: ${conflict.issue}`);
      conflict.routes.forEach(route => {
        console.log(`        ${route.path} (${route.file}:${route.line})`);
      });
      if (conflict.suggestion) {
        console.log(`      💡 Suggestion: ${conflict.suggestion}`);
      }
    });
  }
  
  if (routingIssues.length > 0) {
    console.log('\n🚨 ROUTING ISSUES DETECTED:');
    routingIssues.forEach((issue, index) => {
      console.log(`\n   ${index + 1}. ${issue.severity} - ${issue.testPath}`);
      console.log(`      Expected: ${issue.expectedRoute}`);
      console.log(`      Actually matches: ${issue.actualRoute}`);
      console.log(`      Issue: ${issue.issue}`);
    });
  }
  
  if (duplicates.length === 0 && conflicts.length === 0 && routingIssues.length === 0) {
    console.log('\n✅ NO ISSUES FOUND - ROUTING IS PERFECT!');
  }
  
  // Generate summary for replit.md
  const summary = {
    totalEndpoints: endpoints.length,
    duplicates: duplicates.length,
    conflicts: conflicts.length,
    routingIssues: routingIssues.length,
    status: duplicates.length === 0 && conflicts.length === 0 && routingIssues.length === 0 ? 'CLEAN' : 'ISSUES_FOUND',
    timestamp: new Date().toISOString()
  };
  
  return summary;
}

// Main execution
async function main() {
  try {
    const { endpoints, methodGroups } = scanRouteFiles();
    const conflicts = analyzeRouteConflicts(methodGroups);
    const routingIssues = testCommonConflicts(methodGroups);
    const summary = generateReport(endpoints, conflicts, routingIssues);
    
    // Save detailed report
    const reportPath = './endpoint-audit-detailed-report.json';
    fs.writeFileSync(reportPath, JSON.stringify({
      summary,
      endpoints: endpoints.map(e => ({
        method: e.method,
        path: e.path,
        file: e.file,
        line: e.line
      })),
      conflicts,
      routingIssues
    }, null, 2));
    
    console.log(`\n📄 Detailed report saved to: ${reportPath}`);
    
    // Exit with error code if issues found
    if (summary.status !== 'CLEAN') {
      process.exit(1);
    }
    
  } catch (error) {
    console.error('Error during audit:', error);
    process.exit(1);
  }
}

main();