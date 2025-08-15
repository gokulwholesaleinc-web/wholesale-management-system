#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

/**
 * ROUTE DUPLICATION DETECTOR & PREVENTION TOOL
 * 
 * This tool identifies and prevents route/component duplication issues.
 * It should be run in CI/CD and pre-commit hooks.
 */

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m'
};

console.log(`${colors.bold}${colors.blue}🔍 ROUTE DUPLICATION DETECTOR${colors.reset}\n`);

// Scan for route patterns
function scanRoutes() {
  const routeMap = new Map();
  const duplicateRoutes = new Map();
  const suspiciousPatterns = [];

  // Scan App.tsx for route definitions
  const appFile = 'client/src/App.tsx';
  if (fs.existsSync(appFile)) {
    const content = fs.readFileSync(appFile, 'utf8');
    
    // Extract route patterns
    const routePattern = /<Route\s+path="([^"]+)"[^>]*component=\{([^}]+)\}/g;
    let match;
    
    while ((match = routePattern.exec(content)) !== null) {
      const routePath = match[1];
      const component = match[2];
      
      // Check for similar routes
      const similarRoutes = Array.from(routeMap.keys()).filter(existing => {
        return existing.includes(':id') && routePath.includes(':id') && 
               existing.split('/')[1] === routePath.split('/')[1];
      });
      
      if (similarRoutes.length > 0) {
        const key = `${routePath.split('/')[1]}/:id routes`;
        if (!duplicateRoutes.has(key)) {
          duplicateRoutes.set(key, []);
        }
        duplicateRoutes.get(key).push({
          path: routePath,
          component: component,
          similar: similarRoutes
        });
      }
      
      routeMap.set(routePath, component);
    }
  }

  return { routeMap, duplicateRoutes };
}

// Scan for component patterns
function scanComponents() {
  const componentPatterns = new Map();
  const suspiciousComponents = [];

  function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        scanDirectory(fullPath);
      } else if (item.endsWith('.tsx') || item.endsWith('.ts')) {
        // Look for order/detail pattern files
        if (item.toLowerCase().includes('order') && item.toLowerCase().includes('detail')) {
          suspiciousComponents.push({
            file: fullPath,
            name: item,
            type: 'OrderDetail'
          });
        }
        
        // Look for duplicated function patterns
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('downloadOrderPDF') || content.includes('downloadPDF')) {
          suspiciousComponents.push({
            file: fullPath,
            name: item,
            type: 'PDF Generation',
            issue: 'Uses potentially duplicated PDF generation logic'
          });
        }
      }
    }
  }

  scanDirectory('client/src/pages');
  scanDirectory('client/src/components');

  return suspiciousComponents;
}

// Scan for API endpoint duplication
function scanAPIEndpoints() {
  const endpointMap = new Map();
  const backendFiles = [
    'server/routes.ts',
    'server/auth.ts',
    'server/cart.ts',
    'server/notifications.ts'
  ];

  backendFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      
      const patterns = [
        /app\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi,
        /router\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/gi
      ];
      
      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const method = match[1].toUpperCase();
          const endpoint = match[2];
          const key = `${method} ${endpoint}`;
          
          if (endpointMap.has(key)) {
            endpointMap.get(key).files.push(file);
          } else {
            endpointMap.set(key, { files: [file], method, endpoint });
          }
        }
      });
    }
  });

  // Find duplicates
  const duplicateEndpoints = Array.from(endpointMap.entries())
    .filter(([key, data]) => data.files.length > 1);

  return { endpointMap, duplicateEndpoints };
}

// Generate recommendations
function generateRecommendations(routeAnalysis, componentAnalysis, endpointAnalysis) {
  const recommendations = [];

  // Route duplication recommendations
  if (routeAnalysis.duplicateRoutes.size > 0) {
    recommendations.push({
      type: 'CRITICAL',
      category: 'Route Duplication',
      message: 'Multiple similar routes detected for the same functionality',
      details: Array.from(routeAnalysis.duplicateRoutes.entries()),
      solution: 'Create a unified component with role-based rendering instead of separate routes'
    });
  }

  // Component duplication recommendations
  const orderDetailComponents = componentAnalysis.filter(c => c.type === 'OrderDetail');
  if (orderDetailComponents.length > 3) {
    recommendations.push({
      type: 'CRITICAL',
      category: 'Component Duplication',
      message: `Found ${orderDetailComponents.length} order detail components`,
      details: orderDetailComponents,
      solution: 'Replace with single UnifiedOrderDetail component with role-based props'
    });
  }

  // PDF generation duplication
  const pdfComponents = componentAnalysis.filter(c => c.type === 'PDF Generation');
  if (pdfComponents.length > 1) {
    recommendations.push({
      type: 'HIGH',
      category: 'PDF Generation Duplication',
      message: `Found ${pdfComponents.length} components with PDF generation logic`,
      details: pdfComponents,
      solution: 'Use unified server-side /api/orders/:id/receipt endpoint everywhere'
    });
  }

  // Endpoint duplication
  if (endpointAnalysis.duplicateEndpoints.length > 0) {
    recommendations.push({
      type: 'HIGH',
      category: 'API Endpoint Duplication',
      message: 'Duplicate API endpoints detected',
      details: endpointAnalysis.duplicateEndpoints,
      solution: 'Consolidate duplicate endpoints and update endpoint registry'
    });
  }

  return recommendations;
}

// Main execution
function main() {
  console.log('📊 Analyzing routes...');
  const routeAnalysis = scanRoutes();
  
  console.log('🔍 Analyzing components...');
  const componentAnalysis = scanComponents();
  
  console.log('🌐 Analyzing API endpoints...');
  const endpointAnalysis = scanAPIEndpoints();
  
  console.log('💡 Generating recommendations...\n');
  const recommendations = generateRecommendations(routeAnalysis, componentAnalysis, endpointAnalysis);

  // Output results
  console.log(`${colors.bold}=== DUPLICATION ANALYSIS RESULTS ===${colors.reset}\n`);

  if (recommendations.length === 0) {
    console.log(`${colors.green}✅ No critical duplication issues detected!${colors.reset}\n`);
    return;
  }

  recommendations.forEach((rec, index) => {
    const colorCode = rec.type === 'CRITICAL' ? colors.red : 
                     rec.type === 'HIGH' ? colors.yellow : colors.blue;
    
    console.log(`${colorCode}${colors.bold}${rec.type}: ${rec.category}${colors.reset}`);
    console.log(`   ${rec.message}`);
    console.log(`   💡 Solution: ${rec.solution}\n`);
    
    if (rec.details && Array.isArray(rec.details) && rec.details.length > 0) {
      console.log(`   📋 Details:`);
      rec.details.slice(0, 5).forEach(detail => {
        if (typeof detail === 'object') {
          console.log(`   - ${detail.file || detail.name || JSON.stringify(detail)}`);
        } else {
          console.log(`   - ${detail}`);
        }
      });
      if (rec.details.length > 5) {
        console.log(`   ... and ${rec.details.length - 5} more`);
      }
      console.log('');
    }
  });

  // Exit with error code if critical issues found
  const criticalIssues = recommendations.filter(r => r.type === 'CRITICAL').length;
  if (criticalIssues > 0) {
    console.log(`${colors.red}${colors.bold}❌ Found ${criticalIssues} critical duplication issues!${colors.reset}`);
    console.log(`${colors.yellow}Run this script again after implementing fixes.${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${colors.green}✅ No critical issues, but consider addressing the warnings above.${colors.reset}\n`);
  }
}

main();