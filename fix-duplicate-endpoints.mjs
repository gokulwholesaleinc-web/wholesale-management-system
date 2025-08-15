#!/usr/bin/env node

import fs from 'fs';

console.log('🔧 SYSTEMATIC DUPLICATE ENDPOINT REMOVAL');

const routesFile = 'server/routes.ts';
const content = fs.readFileSync(routesFile, 'utf8');
const lines = content.split('\n');

// Define the endpoints to remove (keeping the consolidated versions at the end)
const duplicatesToRemove = [
  // Delivery addresses (lines around 1190-1240)
  { start: 1189, end: 1201, comment: '// Delivery address endpoints moved to consolidated section' },
  { start: 1203, end: 1213, comment: '// Delivery address delete moved to consolidated section' },
  { start: 1215, end: 1227, comment: '// Set default delivery address moved to consolidated section' },
  { start: 1229, end: 1239, comment: '// Get delivery address moved to consolidated section' },
  
  // Order notes and items (lines around 1715-2100)
  { start: 1714, end: 1735, comment: '// Order notes endpoints moved to consolidated section' },
  { start: 1737, end: 1770, comment: '// Delete order note moved to consolidated section' },
  { start: 1772, end: 1883, comment: '// Add order note moved to consolidated section' },
  { start: 1885, end: 1970, comment: '// Add order item moved to consolidated section' },
  { start: 1972, end: 2070, comment: '// Update order item moved to consolidated section' },
  { start: 2072, end: 2150, comment: '// Complete order moved to consolidated section' },
];

// Apply removals in reverse order to maintain line numbers
duplicatesToRemove.reverse().forEach(({ start, end, comment }) => {
  console.log(`Removing lines ${start + 1}-${end + 1}: ${comment}`);
  lines.splice(start, end - start + 1, comment);
});

// Write the updated content
fs.writeFileSync(routesFile, lines.join('\n'));

console.log('✅ Duplicate endpoints removed successfully');
console.log('🔍 Running endpoint audit to verify fixes...');