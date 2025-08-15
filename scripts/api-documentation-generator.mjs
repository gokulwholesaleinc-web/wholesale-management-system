#!/usr/bin/env node

/**
 * API DOCUMENTATION GENERATOR WITH CONFLICT DETECTION
 * Generates comprehensive API docs and identifies potential issues
 */

import fs from 'fs';
import path from 'path';

class APIDocumentationGenerator {
  constructor() {
    this.endpoints = [];
    this.middlewareUsage = new Map();
    this.authRequirements = new Map();
    this.parameterPatterns = new Map();
  }

  scanRouteFiles() {
    const routeFiles = [
      './server/routes.ts',
      './server/auth.ts', 
      './server/cart.ts',
      './server/notifications.ts',
      './server/routes/orders.ts',
      './server/routes/admin.ts'
    ];
    
    console.log('📚 GENERATING API DOCUMENTATION...');
    console.log('='.repeat(40));
    
    routeFiles.forEach(filePath => {
      if (!fs.existsSync(filePath)) {
        console.log(`⚠️  File not found: ${filePath}`);
        return;
      }
      
      this.parseRouteFile(filePath);
    });
    
    return this.endpoints;
  }

  parseRouteFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    console.log(`📄 Parsing: ${filePath}`);
    
    let currentRoute = null;
    let currentMiddleware = [];
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim();
      
      // Detect middleware usage
      if (trimmedLine.includes('requireAuth') || 
          trimmedLine.includes('requireAdmin') || 
          trimmedLine.includes('requireEmployeeOrAdmin')) {
        const middleware = this.extractMiddleware(trimmedLine);
        currentMiddleware = middleware;
      }
      
      // Match route definitions
      const routeMatch = trimmedLine.match(/app\.(get|post|put|patch|delete|all)\s*\(\s*['"`]([^'"`]+)['"`]/);
      
      if (routeMatch) {
        const method = routeMatch[1].toUpperCase();
        const path = routeMatch[2];
        
        const endpoint = {
          method,
          path,
          file: filePath,
          line: index + 1,
          middleware: [...currentMiddleware],
          parameters: this.extractParameters(path),
          description: this.extractDescription(lines, index),
          requestBody: this.extractRequestBody(lines, index),
          responseFormat: this.extractResponseFormat(lines, index),
          errors: this.extractErrorCodes(lines, index)
        };
        
        this.endpoints.push(endpoint);
        this.categorizeEndpoint(endpoint);
        
        // Reset middleware for next route
        currentMiddleware = [];
      }
    });
  }

  extractMiddleware(line) {
    const middleware = [];
    if (line.includes('requireAuth')) middleware.push('requireAuth');
    if (line.includes('requireAdmin')) middleware.push('requireAdmin');
    if (line.includes('requireEmployeeOrAdmin')) middleware.push('requireEmployeeOrAdmin');
    return middleware;
  }

  extractParameters(path) {
    const params = [];
    const segments = path.split('/');
    
    segments.forEach(segment => {
      if (segment.startsWith(':')) {
        params.push({
          name: segment.slice(1),
          type: 'path',
          required: true,
          description: `${segment.slice(1)} identifier`
        });
      }
    });
    
    return params;
  }

  extractDescription(lines, startIndex) {
    // Look for comments above the route
    for (let i = startIndex - 1; i >= Math.max(0, startIndex - 5); i--) {
      const line = lines[i].trim();
      if (line.startsWith('//') && !line.includes('TODO') && !line.includes('FIXME')) {
        return line.slice(2).trim();
      }
    }
    return null;
  }

  extractRequestBody(lines, startIndex) {
    // Look for request body validation or usage
    for (let i = startIndex; i < Math.min(lines.length, startIndex + 20); i++) {
      const line = lines[i].trim();
      if (line.includes('req.body') || line.includes('validate(') || line.includes('schema')) {
        // Basic detection - could be enhanced
        return 'JSON object (see code for details)';
      }
    }
    return null;
  }

  extractResponseFormat(lines, startIndex) {
    // Look for response patterns
    for (let i = startIndex; i < Math.min(lines.length, startIndex + 30); i++) {
      const line = lines[i].trim();
      if (line.includes('res.json(') || line.includes('res.send(')) {
        return 'JSON response';
      }
      if (line.includes('res.status(200)')) {
        return 'Success response';
      }
    }
    return 'Standard response';
  }

  extractErrorCodes(lines, startIndex) {
    const errors = [];
    for (let i = startIndex; i < Math.min(lines.length, startIndex + 30); i++) {
      const line = lines[i].trim();
      const statusMatch = line.match(/res\.status\((\d+)\)/);
      if (statusMatch) {
        errors.push(statusMatch[1]);
      }
    }
    return [...new Set(errors)];
  }

  categorizeEndpoint(endpoint) {
    // Track authentication requirements
    const authLevel = endpoint.middleware.includes('requireAdmin') ? 'admin' :
                     endpoint.middleware.includes('requireEmployeeOrAdmin') ? 'staff' :
                     endpoint.middleware.includes('requireAuth') ? 'authenticated' : 'public';
    
    if (!this.authRequirements.has(authLevel)) {
      this.authRequirements.set(authLevel, []);
    }
    this.authRequirements.get(authLevel).push(endpoint);
    
    // Track parameter patterns
    endpoint.parameters.forEach(param => {
      if (!this.parameterPatterns.has(param.name)) {
        this.parameterPatterns.set(param.name, []);
      }
      this.parameterPatterns.get(param.name).push(endpoint);
    });
  }

  analyzeSecurityGaps() {
    const gaps = [];
    
    // Check for unprotected admin endpoints
    this.endpoints.forEach(endpoint => {
      if (endpoint.path.includes('/admin/') && !endpoint.middleware.includes('requireAdmin') && !endpoint.middleware.includes('requireEmployeeOrAdmin')) {
        gaps.push({
          type: 'SECURITY_GAP',
          endpoint: endpoint.path,
          issue: 'Admin endpoint without proper authentication',
          severity: 'HIGH'
        });
      }
      
      // Check for sensitive operations without authentication
      const sensitiveOperations = ['delete', 'put', 'patch'];
      if (sensitiveOperations.includes(endpoint.method.toLowerCase()) && 
          endpoint.middleware.length === 0) {
        gaps.push({
          type: 'SECURITY_GAP',
          endpoint: `${endpoint.method} ${endpoint.path}`,
          issue: 'Sensitive operation without authentication',
          severity: 'MEDIUM'
        });
      }
    });
    
    return gaps;
  }

  analyzeParameterConsistency() {
    const inconsistencies = [];
    
    this.parameterPatterns.forEach((endpoints, paramName) => {
      const types = new Set();
      const usages = new Set();
      
      endpoints.forEach(endpoint => {
        // Basic type inference from context
        if (paramName.includes('id') || paramName.includes('Id')) {
          types.add('identifier');
        }
        usages.add(endpoint.path);
      });
      
      if (usages.size > 1) {
        // Check for potential naming inconsistencies
        const variations = Array.from(usages).map(path => {
          const match = path.match(new RegExp(`:${paramName}\\b`));
          return match ? match[0] : null;
        }).filter(Boolean);
        
        if (new Set(variations).size > 1) {
          inconsistencies.push({
            type: 'PARAMETER_INCONSISTENCY',
            parameter: paramName,
            variations: variations,
            endpoints: Array.from(usages)
          });
        }
      }
    });
    
    return inconsistencies;
  }

  generateDocumentation() {
    const doc = {
      metadata: {
        generatedAt: new Date().toISOString(),
        totalEndpoints: this.endpoints.length,
        authLevels: Object.fromEntries(this.authRequirements),
        summary: this.generateSummary()
      },
      endpoints: this.organizeEndpointsByCategory(),
      security: {
        authenticationLevels: this.generateAuthLevelsDocs(),
        securityGaps: this.analyzeSecurityGaps()
      },
      analysis: {
        parameterConsistency: this.analyzeParameterConsistency(),
        routeConflicts: this.checkRouteConflicts()
      }
    };
    
    return doc;
  }

  generateSummary() {
    const methodCounts = {};
    const authCounts = {};
    
    this.endpoints.forEach(endpoint => {
      methodCounts[endpoint.method] = (methodCounts[endpoint.method] || 0) + 1;
      
      const authLevel = endpoint.middleware.includes('requireAdmin') ? 'admin' :
                       endpoint.middleware.includes('requireEmployeeOrAdmin') ? 'staff' :
                       endpoint.middleware.includes('requireAuth') ? 'authenticated' : 'public';
      authCounts[authLevel] = (authCounts[authLevel] || 0) + 1;
    });
    
    return { methodCounts, authCounts };
  }

  organizeEndpointsByCategory() {
    const categories = {
      auth: [],
      admin: [],
      products: [],
      orders: [],
      cart: [],
      users: [],
      analytics: [],
      other: []
    };
    
    this.endpoints.forEach(endpoint => {
      if (endpoint.path.includes('/auth') || endpoint.path.includes('/login')) {
        categories.auth.push(endpoint);
      } else if (endpoint.path.includes('/admin')) {
        categories.admin.push(endpoint);
      } else if (endpoint.path.includes('/products')) {
        categories.products.push(endpoint);
      } else if (endpoint.path.includes('/orders')) {
        categories.orders.push(endpoint);
      } else if (endpoint.path.includes('/cart')) {
        categories.cart.push(endpoint);
      } else if (endpoint.path.includes('/users') || endpoint.path.includes('/customer')) {
        categories.users.push(endpoint);
      } else if (endpoint.path.includes('/analytics') || endpoint.path.includes('/ai-analytics')) {
        categories.analytics.push(endpoint);
      } else {
        categories.other.push(endpoint);
      }
    });
    
    return categories;
  }

  generateAuthLevelsDocs() {
    const docs = {};
    
    this.authRequirements.forEach((endpoints, level) => {
      docs[level] = {
        count: endpoints.length,
        description: this.getAuthLevelDescription(level),
        endpoints: endpoints.map(e => `${e.method} ${e.path}`)
      };
    });
    
    return docs;
  }

  getAuthLevelDescription(level) {
    const descriptions = {
      'public': 'No authentication required',
      'authenticated': 'Valid user token required',
      'staff': 'Employee or admin access required',
      'admin': 'Administrator access only'
    };
    return descriptions[level] || 'Unknown authentication level';
  }

  checkRouteConflicts() {
    // Basic conflict detection (enhanced version would use the RoutePattern class)
    const conflicts = [];
    const routesByMethod = new Map();
    
    this.endpoints.forEach(endpoint => {
      const method = endpoint.method;
      if (!routesByMethod.has(method)) {
        routesByMethod.set(method, []);
      }
      routesByMethod.get(method).push(endpoint);
    });
    
    routesByMethod.forEach((routes, method) => {
      routes.forEach((route1, i) => {
        routes.slice(i + 1).forEach(route2 => {
          if (this.routesCouldConflict(route1.path, route2.path)) {
            conflicts.push({
              method,
              route1: route1.path,
              route2: route2.path,
              files: [route1.file, route2.file]
            });
          }
        });
      });
    });
    
    return conflicts;
  }

  routesCouldConflict(path1, path2) {
    const segments1 = path1.split('/');
    const segments2 = path2.split('/');
    
    if (segments1.length !== segments2.length) return false;
    
    for (let i = 0; i < segments1.length; i++) {
      const seg1 = segments1[i];
      const seg2 = segments2[i];
      
      // If neither is a parameter and they're different, no conflict
      if (!seg1.startsWith(':') && !seg2.startsWith(':') && seg1 !== seg2) {
        return false;
      }
    }
    
    return true;
  }
}

// Main execution
async function main() {
  const generator = new APIDocumentationGenerator();
  
  try {
    generator.scanRouteFiles();
    const documentation = generator.generateDocumentation();
    
    // Save documentation
    const docPath = './api-documentation.json';
    fs.writeFileSync(docPath, JSON.stringify(documentation, null, 2));
    
    // Generate readable markdown
    const markdownDoc = generateMarkdownDoc(documentation);
    fs.writeFileSync('./API_DOCUMENTATION.md', markdownDoc);
    
    console.log(`\n📚 API Documentation generated:`);
    console.log(`   JSON: ${docPath}`);
    console.log(`   Markdown: ./API_DOCUMENTATION.md`);
    
    // Report summary
    console.log(`\n📊 API OVERVIEW:`);
    console.log(`   Total Endpoints: ${documentation.metadata.totalEndpoints}`);
    console.log(`   Security Gaps: ${documentation.security.securityGaps.length}`);
    console.log(`   Route Conflicts: ${documentation.analysis.routeConflicts.length}`);
    
    if (documentation.security.securityGaps.length > 0) {
      console.log(`\n⚠️  SECURITY GAPS FOUND:`);
      documentation.security.securityGaps.forEach(gap => {
        console.log(`   ${gap.severity}: ${gap.endpoint} - ${gap.issue}`);
      });
    }
    
  } catch (error) {
    console.error('Error generating documentation:', error);
    process.exit(1);
  }
}

function generateMarkdownDoc(doc) {
  let markdown = `# API Documentation\n\n`;
  markdown += `Generated: ${doc.metadata.generatedAt}\n\n`;
  markdown += `## Overview\n\n`;
  markdown += `- **Total Endpoints**: ${doc.metadata.totalEndpoints}\n`;
  markdown += `- **Authentication Levels**: ${Object.keys(doc.metadata.summary.authCounts).join(', ')}\n\n`;
  
  // Add categories
  Object.entries(doc.endpoints).forEach(([category, endpoints]) => {
    if (endpoints.length > 0) {
      markdown += `## ${category.toUpperCase()} Endpoints\n\n`;
      endpoints.forEach(endpoint => {
        markdown += `### ${endpoint.method} ${endpoint.path}\n\n`;
        if (endpoint.description) {
          markdown += `**Description**: ${endpoint.description}\n\n`;
        }
        if (endpoint.middleware.length > 0) {
          markdown += `**Authentication**: ${endpoint.middleware.join(', ')}\n\n`;
        }
        if (endpoint.parameters.length > 0) {
          markdown += `**Parameters**:\n`;
          endpoint.parameters.forEach(param => {
            markdown += `- \`${param.name}\` (${param.type}): ${param.description}\n`;
          });
          markdown += `\n`;
        }
        markdown += `**File**: ${endpoint.file}:${endpoint.line}\n\n`;
        markdown += `---\n\n`;
      });
    }
  });
  
  return markdown;
}

main();