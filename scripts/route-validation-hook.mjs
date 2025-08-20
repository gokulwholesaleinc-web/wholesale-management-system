#!/usr/bin/env node

/**
 * PRE-COMMIT ROUTE VALIDATION HOOK
 * Automatically validates routes before commits to prevent conflicts
 */

import { execSync } from 'child_process';
import fs from 'fs';

async function validateRoutes() {
  console.log('🔍 Running route validation before commit...');
  
  try {
    // Run the enhanced audit
    execSync('node scripts/enhanced-endpoint-audit.mjs', { stdio: 'inherit' });
    
    console.log('✅ Route validation passed');
    return true;
  } catch (error) {
    console.log('❌ Route validation failed');
    console.log('Please fix routing conflicts before committing');
    return false;
  }
}

// Integration with git hooks
if (process.argv.includes('--install-hook')) {
  const hookPath = '.git/hooks/pre-commit';
  const hookContent = `#!/bin/sh
node scripts/route-validation-hook.mjs
`;
  
  fs.writeFileSync(hookPath, hookContent);
  execSync('chmod +x .git/hooks/pre-commit');
  console.log('✅ Pre-commit hook installed');
} else {
  const passed = await validateRoutes();
  process.exit(passed ? 0 : 1);
}