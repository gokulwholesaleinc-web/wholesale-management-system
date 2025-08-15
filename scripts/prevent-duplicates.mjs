#!/usr/bin/env node

/**
 * DUPLICATE ENDPOINT PREVENTION SYSTEM
 * 
 * This script prevents duplicate endpoints by:
 * 1. Running validation before each commit
 * 2. Checking for duplicates in real-time during development
 * 3. Blocking problematic code from entering the repository
 * 
 * Usage:
 * - npm run validate-endpoints (manual check)
 * - Runs automatically on git pre-commit hook
 * - Integrated into development workflow
 */

import fs from 'fs';
import path from 'path';

class DuplicateEndpointPrevention {
  constructor() {
    this.routeFiles = [
      'server/routes.ts',
      'server/auth.ts', 
      'server/cart.ts',
      'server/notifications.ts'
    ];
    this.endpointMap = new Map();
    this.duplicates = [];
    this.issues = [];
  }

  // Extract endpoints from route files
  extractEndpoints(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      const endpoints = [];

      lines.forEach((line, index) => {
        // Match app.METHOD('path', ...)
        const match = line.match(/\s*app\.(get|post|put|patch|delete|all)\s*\(\s*['"`]([^'"`]+)['"`]/);
        if (match) {
          const method = match[1].toUpperCase();
          const path = match[2];
          
          // Normalize path for duplicate detection
          const normalizedPath = this.normalizePath(path);
          const key = `${method}:${normalizedPath}`;
          
          endpoints.push({
            method,
            path,
            normalizedPath,
            key,
            file: filePath,
            line: index + 1,
            lineContent: line.trim()
          });
        }
      });

      return endpoints;
    } catch (error) {
      this.issues.push(`Error reading ${filePath}: ${error.message}`);
      return [];
    }
  }

  // Normalize paths for consistent duplicate detection
  normalizePath(path) {
    return path
      .replace(/:([^/]+)/g, ':param')  // :id, :userId -> :param
      .replace(/\*/g, '*')             // Keep wildcards
      .toLowerCase();
  }

  // Scan all route files for duplicates
  scanForDuplicates() {
    console.log('🔍 Scanning for duplicate endpoints...\n');
    
    this.endpointMap.clear();
    this.duplicates = [];
    this.issues = [];

    // Extract endpoints from all files
    const allEndpoints = [];
    for (const file of this.routeFiles) {
      if (fs.existsSync(file)) {
        const endpoints = this.extractEndpoints(file);
        allEndpoints.push(...endpoints);
        console.log(`📁 ${file}: ${endpoints.length} endpoints`);
      }
    }

    // Group endpoints by key to find duplicates
    const endpointGroups = new Map();
    allEndpoints.forEach(endpoint => {
      if (!endpointGroups.has(endpoint.key)) {
        endpointGroups.set(endpoint.key, []);
      }
      endpointGroups.get(endpoint.key).push(endpoint);
    });

    // Identify duplicates
    endpointGroups.forEach((endpoints, key) => {
      if (endpoints.length > 1) {
        this.duplicates.push({
          key,
          count: endpoints.length,
          endpoints
        });
      }
    });

    return {
      total: allEndpoints.length,
      duplicates: this.duplicates.length,
      issues: this.issues.length
    };
  }

  // Generate detailed report
  generateReport() {
    const stats = this.scanForDuplicates();
    
    console.log('\n=== DUPLICATE ENDPOINT PREVENTION REPORT ===\n');
    
    // Summary
    console.log('📊 SCAN SUMMARY:');
    console.log(`   Total Endpoints: ${stats.total}`);
    console.log(`   Duplicate Groups: ${stats.duplicates}`);
    console.log(`   Issues Found: ${stats.issues}`);
    console.log(`   Status: ${stats.duplicates === 0 ? '✅ CLEAN' : '❌ DUPLICATES DETECTED'}\n`);

    // Report duplicates
    if (this.duplicates.length > 0) {
      console.log('🚨 DUPLICATE ENDPOINTS DETECTED:\n');
      this.duplicates.forEach(dup => {
        console.log(`❌ ${dup.key} (${dup.count} times):`);
        dup.endpoints.forEach(ep => {
          console.log(`   📍 ${ep.file}:${ep.line} - ${ep.lineContent}`);
        });
        console.log('');
      });

      console.log('🔧 REQUIRED ACTIONS:');
      console.log('   1. Remove duplicate endpoint definitions');
      console.log('   2. Consolidate logic into single endpoint');
      console.log('   3. Use middleware for shared functionality');
      console.log('   4. Run this script again to verify fixes\n');
    }

    // Report issues
    if (this.issues.length > 0) {
      console.log('⚠️  SCAN ISSUES:');
      this.issues.forEach(issue => console.log(`   - ${issue}`));
      console.log('');
    }

    return stats.duplicates === 0 && stats.issues === 0;
  }

  // Check if system is clean (no duplicates)
  isClean() {
    const stats = this.scanForDuplicates();
    return stats.duplicates === 0 && stats.issues === 0;
  }

  // Generate pre-commit hook
  installPreCommitHook() {
    const hookPath = '.git/hooks/pre-commit';
    const hookContent = `#!/bin/sh
# Duplicate Endpoint Prevention Hook
echo "🔍 Checking for duplicate endpoints..."
node scripts/prevent-duplicates.mjs --check

if [ $? -ne 0 ]; then
    echo "❌ Commit blocked: Duplicate endpoints detected"
    echo "Run 'npm run validate-endpoints' to see details"
    exit 1
fi

echo "✅ No duplicates detected"
`;

    try {
      if (!fs.existsSync('.git/hooks')) {
        fs.mkdirSync('.git/hooks', { recursive: true });
      }
      
      fs.writeFileSync(hookPath, hookContent, { mode: 0o755 });
      console.log('✅ Pre-commit hook installed');
      console.log('   Duplicate endpoints will be blocked automatically');
    } catch (error) {
      console.log('⚠️  Could not install pre-commit hook:', error.message);
    }
  }
}

// CLI Interface
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
DUPLICATE ENDPOINT PREVENTION SYSTEM

Usage:
  node scripts/prevent-duplicates.mjs [options]

Options:
  --check         Check for duplicates (exit 1 if found)
  --report        Generate detailed report
  --install-hook  Install git pre-commit hook
  --help, -h      Show this help

Examples:
  node scripts/prevent-duplicates.mjs --report
  node scripts/prevent-duplicates.mjs --check
  npm run validate-endpoints
`);
  process.exit(0);
}

const prevention = new DuplicateEndpointPrevention();

if (args.includes('--install-hook')) {
  prevention.installPreCommitHook();
  process.exit(0);
}

if (args.includes('--check')) {
  const isClean = prevention.isClean();
  if (!isClean) {
    console.log('❌ Duplicate endpoints detected');
    process.exit(1);
  } else {
    console.log('✅ No duplicates found');
    process.exit(0);
  }
}

// Default: Generate full report
const isClean = prevention.generateReport();

if (!isClean) {
  console.log('💡 TIP: Add this to package.json scripts:');
  console.log('   "validate-endpoints": "node scripts/prevent-duplicates.mjs --report"');
  console.log('   "precommit": "node scripts/prevent-duplicates.mjs --check"');
  process.exit(1);
} else {
  console.log('🎉 Endpoint system is clean and optimized!');
  process.exit(0);
}