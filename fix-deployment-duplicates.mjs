#!/usr/bin/env node

/**
 * DEPLOYMENT FIX SCRIPT
 * 
 * This script fixes all duplicate method issues preventing successful deployment
 * by removing duplicate method definitions that are causing build failures.
 */

import fs from 'fs';
import path from 'path';

const STORAGE_FILE = 'server/storage.ts';

console.log('🔧 DEPLOYMENT FIX: Removing duplicate methods to fix build issues...');

// Read the storage file
let content = fs.readFileSync(STORAGE_FILE, 'utf8');

// List of duplicate methods to remove (keeping the first occurrence)
const duplicatesToRemove = [
  {
    pattern: /async updateNotificationSettings\(userId: string, settings: any\): Promise<any> \{[\s\S]*?\n  \}/g,
    keepFirst: true,
    name: 'updateNotificationSettings'
  },
  {
    pattern: /async markNotificationAsRead\(notificationId: number\): Promise<void> \{[\s\S]*?\n  \}/g,
    keepFirst: true,
    name: 'markNotificationAsRead (single param)'
  },
  {
    pattern: /async getDeliveryAddressById\(id: number\): Promise<DeliveryAddress \| undefined> \{[\s\S]*?\n  \}/g,
    keepFirst: true,
    name: 'getDeliveryAddressById'
  }
];

let fixedCount = 0;

// Remove duplicates
duplicatesToRemove.forEach(duplicate => {
  const matches = [...content.matchAll(duplicate.pattern)];
  
  if (matches.length > 1) {
    console.log(`📍 Found ${matches.length} instances of ${duplicate.name}`);
    
    // Remove all but the first occurrence
    for (let i = matches.length - 1; i >= 1; i--) {
      const match = matches[i];
      const startIndex = match.index;
      const endIndex = startIndex + match[0].length;
      
      content = content.substring(0, startIndex) + 
                `  // REMOVED DUPLICATE: ${duplicate.name} method\n` +
                content.substring(endIndex);
      
      fixedCount++;
      console.log(`✅ Removed duplicate ${duplicate.name} #${i + 1}`);
    }
  }
});

// Additional specific fixes
const specificFixes = [
  {
    search: /async getNotificationSettings\(userId: string\): Promise<any> \{[\s\S]*?return \{[\s\S]*?orderUpdates: true,[\s\S]*?promotions: true,[\s\S]*?systemMessages: true[\s\S]*?\};[\s\S]*?\}/g,
    replace: '  // REMOVED DUPLICATE: getNotificationSettings method (simple version)',
    name: 'getNotificationSettings simple version'
  }
];

specificFixes.forEach(fix => {
  if (fix.search.test(content)) {
    content = content.replace(fix.search, fix.replace);
    fixedCount++;
    console.log(`✅ Fixed: ${fix.name}`);
  }
});

// Write the fixed content back
fs.writeFileSync(STORAGE_FILE, content);

console.log(`\n🎉 DEPLOYMENT FIX COMPLETE:`);
console.log(`   - Fixed ${fixedCount} duplicate method issues`);
console.log(`   - Build should now succeed`);
console.log(`   - Ready for deployment\n`);

// Test the build
console.log('🧪 Testing build...');
try {
  const { execSync } = await import('child_process');
  execSync('npm run build', { stdio: 'pipe' });
  console.log('✅ Build test PASSED - deployment ready!');
} catch (error) {
  console.log('❌ Build test FAILED - additional fixes needed');
  console.log('Error:', error.message);
}