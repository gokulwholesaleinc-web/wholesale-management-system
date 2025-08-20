#!/usr/bin/env tsx

import { syncWithActualRoutes, validateAllEndpoints } from '../server/endpoint-registry';

console.log('🏗️  COMPREHENSIVE ENDPOINT VALIDATION STARTING...\n');

// Scan actual files and validate
const result = syncWithActualRoutes();

console.log('📊 VALIDATION SUMMARY:');
console.log(`   Endpoints Scanned: ${result.scanned}`);
console.log(`   Duplicates Found: ${result.duplicates.length}`);
console.log(`   Status: ${result.duplicates.length === 0 ? '✅ CLEAN' : '❌ NEEDS FIXING'}\n`);

if (result.duplicates.length > 0) {
  console.log('🔧 FIXES NEEDED:');
  result.duplicates.forEach(dup => {
    console.log(`   - Remove duplicate: ${dup}`);
  });
  console.log('');
}

// Run full validation
validateAllEndpoints();

console.log('\n🎯 NEXT STEPS:');
if (result.duplicates.length === 0) {
  console.log('   ✅ Your routing system is clean and optimized!');
  console.log('   ✅ No duplicates or conflicts detected');
} else {
  console.log('   1. Fix the duplicate endpoints listed above');
  console.log('   2. Run this script again to verify fixes');
  console.log('   3. Consider using the consolidated routing approach');
}