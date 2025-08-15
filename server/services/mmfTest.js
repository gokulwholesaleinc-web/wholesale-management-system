#!/usr/bin/env node
/**
 * Direct MMF Cash Drawer Test
 * Tests all 5 active pins on 6-pin MMF drawer
 */

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

console.log('=== MMF 6-Pin Cash Drawer Test ===');
console.log('Testing 5 active pins...\n');

// MMF-specific commands for 6-pin drawer (5 active)
const mmfCommands = [
  {
    name: 'Pin 2 - Standard Pulse',
    buffer: Buffer.from([0x1B, 0x70, 0x00, 0x19, 0x19]),
    description: 'Most common MMF configuration'
  },
  {
    name: 'Pin 5 - Alternative',
    buffer: Buffer.from([0x1B, 0x70, 0x01, 0x19, 0x19]),
    description: 'Secondary pin for MMF drawers'
  },
  {
    name: 'Pin 2 - Extended Pulse',
    buffer: Buffer.from([0x1B, 0x70, 0x00, 0x32, 0x32]),
    description: 'Longer pulse for stubborn mechanisms'
  },
  {
    name: 'Pin 5 - Extended Pulse',
    buffer: Buffer.from([0x1B, 0x70, 0x01, 0x32, 0x32]),
    description: 'Alternative pin with extended timing'
  },
  {
    name: 'Pin 2 - Maximum Pulse',
    buffer: Buffer.from([0x1B, 0x70, 0x00, 0x64, 0x64]),
    description: '100ms pulse for maximum compatibility'
  }
];

async function testMMFPin(command, index) {
  return new Promise((resolve) => {
    console.log(`[${index + 1}/5] Testing: ${command.name}`);
    console.log(`        ${command.description}`);
    
    const tempFile = path.join(os.tmpdir(), `mmf_test_${index}.bin`);
    fs.writeFileSync(tempFile, command.buffer);
    
    // Try multiple output methods
    const methods = [
      `lp -d EPSON -o raw "${tempFile}"`,
      `cat "${tempFile}" > /dev/usb/lp0`,
      `cat "${tempFile}" > /dev/ttyUSB0`,
      `copy /b "${tempFile}" EPSON:` // Windows fallback
    ];
    
    let methodIndex = 0;
    
    const tryMethod = () => {
      if (methodIndex >= methods.length) {
        cleanup();
        resolve({ success: false, command: command.name });
        return;
      }
      
      exec(methods[methodIndex], (error, stdout, stderr) => {
        if (!error) {
          console.log(`        ✅ SUCCESS via: ${methods[methodIndex]}`);
          console.log(`        → If drawer opened, this is your working command!\n`);
          cleanup();
          resolve({ success: true, command: command.name, method: methods[methodIndex] });
        } else {
          methodIndex++;
          tryMethod();
        }
      });
    };
    
    const cleanup = () => {
      try {
        fs.unlinkSync(tempFile);
      } catch (e) {
        // Ignore cleanup errors
      }
    };
    
    tryMethod();
  });
}

async function runMMFTests() {
  console.log('Hardware Detection:');
  
  // Check for printers
  exec('lpstat -p 2>/dev/null', (error, stdout) => {
    if (stdout) {
      console.log('Available printers:');
      stdout.split('\n').forEach(line => {
        if (line.includes('printer')) console.log(`  ${line}`);
      });
    }
    console.log('');
  });
  
  // Check for USB devices
  exec('ls /dev/usb/lp* /dev/ttyUSB* 2>/dev/null', (error, stdout) => {
    if (stdout) {
      console.log('USB devices found:');
      stdout.split('\n').forEach(device => {
        if (device) console.log(`  ${device}`);
      });
    }
    console.log('');
  });
  
  // Wait for hardware detection
  setTimeout(async () => {
    console.log('Starting MMF Pin Tests...\n');
    
    for (let i = 0; i < mmfCommands.length; i++) {
      const result = await testMMFPin(mmfCommands[i], i);
      
      if (result.success) {
        console.log(`🎯 FOUND WORKING CONFIGURATION:`);
        console.log(`   Command: ${result.command}`);
        console.log(`   Method: ${result.method}`);
        console.log(`\n⚠️  IMPORTANT: Note this command for your MMF drawer!\n`);
      }
      
      // Wait between tests to avoid hardware conflicts
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('=== Test Complete ===');
    console.log('If none worked, check:');
    console.log('1. Drawer is connected to printer');
    console.log('2. Printer is powered on');
    console.log('3. Correct printer name (try "EPSON" or actual name)');
    console.log('4. USB/Serial cable connections');
    
  }, 2000);
}

runMMFTests();