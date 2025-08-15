#!/usr/bin/env node

/**
 * Standalone POS API Server Launcher
 * 
 * This script starts the POS system as a standalone service
 * separate from the main e-commerce application.
 * 
 * Usage:
 *   node package-scripts/start-pos-standalone.js
 *   npm run pos:standalone
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🏪 Starting POS Standalone API Server...');
console.log('📍 Store Configuration:');
console.log(`   - Store ID: ${process.env.POS_STORE_ID || 'ITASCA'}`);
console.log(`   - Register ID: ${process.env.POS_REGISTER_ID || 'REG-01'}`);
console.log(`   - Port: ${process.env.POS_PORT || '3001'}`);

const serverPath = path.join(__dirname, '..', 'server', 'pos-standalone.ts');

const posServer = spawn('npx', ['tsx', serverPath], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'development',
    POS_STORE_ID: process.env.POS_STORE_ID || 'ITASCA',
    POS_REGISTER_ID: process.env.POS_REGISTER_ID || 'REG-01',
    POS_PORT: process.env.POS_PORT || '3001'
  }
});

posServer.on('close', (code) => {
  console.log(`🏪 POS API Server exited with code ${code}`);
  process.exit(code);
});

posServer.on('error', (err) => {
  console.error('🚨 POS API Server error:', err);
  process.exit(1);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down POS API Server...');
  posServer.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Terminating POS API Server...');
  posServer.kill('SIGTERM');
});