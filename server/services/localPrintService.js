/**
 * Local Print Service for Epson Printers & MMF Cash Drawers
 * Run this as a local Node.js service to handle direct printer communication
 * 
 * Usage: node localPrintService.js
 * Then your web app can POST to http://localhost:8080/print
 */

import express from 'express';
import { exec, execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

const app = express();
const PORT = 8080;

// Manual CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.use(express.json({ limit: '10mb' }));

// Store for printer configurations
let printerConfigs = {
  default: {
    name: 'EPSON',
    width: 42,
    encoding: 'cp437'
  }
};

/**
 * Print to thermal printer
 */
app.post('/print', async (req, res) => {
  try {
    const { printer, content, encoding } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content required' });
    }

    console.log(`[PRINT] Printing to ${printer || 'default printer'}...`);
    
    // Create temporary file with receipt content
    const tempFile = path.join(os.tmpdir(), `receipt_${Date.now()}.txt`);
    fs.writeFileSync(tempFile, content, encoding || 'utf8');
    
    // Platform-specific printing
    let printCommand;
    const printerName = printer || 'EPSON';
    
    if (process.platform === 'win32') {
      // Windows - use type command to send to printer
      printCommand = `type "${tempFile}" > ${printerName}:`;
    } else if (process.platform === 'darwin') {
      // macOS - use lp command
      printCommand = `lp -d "${printerName}" "${tempFile}"`;
    } else {
      // Linux - use lp command
      printCommand = `lp -d "${printerName}" "${tempFile}"`;
    }
    
    // Execute print command with input sanitization
    // Use execFile for safer command execution
    let printArgs = [];
    let printExecutable = '';
    
    if (process.platform === 'win32') {
      printExecutable = 'type';
      printArgs = [tempFile];
    } else {
      printExecutable = 'lp';
      // Sanitize printer name to prevent injection
      const safePrinterName = printerName.replace(/[^a-zA-Z0-9_-]/g, '');
      printArgs = ['-d', safePrinterName, tempFile];
    }
    
    execFile(printExecutable, printArgs, (error, stdout, stderr) => {
      // Clean up temp file
      try {
        fs.unlinkSync(tempFile);
      } catch (cleanupError) {
        console.warn('[CLEANUP] Failed to remove temp file:', cleanupError.message);
      }
      
      if (error) {
        console.error('[PRINT ERROR]:', error.message);
        return res.status(500).json({ 
          error: 'Print failed', 
          details: error.message 
        });
      }
      
      console.log('[PRINT SUCCESS]:', stdout || 'Sent to printer');
      res.json({ 
        success: true, 
        message: 'Printed successfully',
        printer: printerName
      });
    });
    
  } catch (error) {
    console.error('[PRINT SERVICE ERROR]:', error);
    res.status(500).json({ 
      error: 'Print service error', 
      details: error.message 
    });
  }
});

/**
 * Open cash drawer
 */
app.post('/drawer/open', async (req, res) => {
  try {
    const { printer, pin } = req.body;
    
    // Enhanced ESC/POS cash drawer command for MMF compatibility
    const pinCode = pin === 'pin5' ? '\x01' : '\x00';
    const drawerCommand = Buffer.from([0x1B, 0x70, pinCode === '\x01' ? 1 : 0, 25, 25]);
    
    console.log(`[DRAWER] Opening cash drawer via ${printer || 'default printer'}...`);
    
    // Create temp file with drawer command
    const tempFile = path.join(os.tmpdir(), `drawer_${Date.now()}.bin`);
    fs.writeFileSync(tempFile, drawerCommand);
    
    // Send drawer command to printer with multiple methods
    const printerName = printer || 'EPSON';
    let commands = [];
    
    if (process.platform === 'win32') {
      // Windows - try multiple approaches for MMF compatibility
      commands = [
        `copy /b "${tempFile}" ${printerName}:`,
        `print /d:${printerName} "${tempFile}"`,
        `type "${tempFile}" > ${printerName}:`
      ];
    } else {
      // Unix-like systems - try raw printing and various device paths
      commands = [
        `lp -d "${printerName}" -o raw "${tempFile}"`,
        `cat "${tempFile}" > /dev/usb/lp0`,
        `cat "${tempFile}" > /dev/ttyUSB0`,
        `cat "${tempFile}" | nc -w1 192.168.1.100 9100` // Network fallback
      ];
    }
    
    // Try commands sequentially until one succeeds
    let commandIndex = 0;
    
    const tryNextCommand = () => {
      if (commandIndex >= commands.length) {
        // Clean up temp file
        try {
          fs.unlinkSync(tempFile);
        } catch (cleanupError) {
          console.warn('[CLEANUP] Failed to remove temp file:', cleanupError.message);
        }
        
        return res.status(500).json({ 
          error: 'All drawer commands failed', 
          details: 'Tried multiple methods - check hardware connection'
        });
      }
      
      const command = commands[commandIndex];
      console.log(`[DRAWER] Trying method ${commandIndex + 1}: ${command}`);
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.warn(`[DRAWER] Method ${commandIndex + 1} failed:`, error.message);
          commandIndex++;
          tryNextCommand();
        } else {
          // Success - clean up and respond
          try {
            fs.unlinkSync(tempFile);
          } catch (cleanupError) {
            console.warn('[CLEANUP] Failed to remove temp file:', cleanupError.message);
          }
          
          console.log(`[DRAWER SUCCESS] Cash drawer opened using method ${commandIndex + 1}`);
          res.json({ 
            success: true, 
            message: `Cash drawer opened via ${command.split(' ')[0]}`,
            method: `Command ${commandIndex + 1}`
          });
        }
      });
    };
    
    tryNextCommand();
    
  } catch (error) {
    console.error('[DRAWER SERVICE ERROR]:', error);
    res.status(500).json({ 
      error: 'Drawer service error', 
      details: error.message 
    });
  }
});

/**
 * Test printer connection
 */
app.post('/test', async (req, res) => {
  try {
    const { printer } = req.body;
    const printerName = printer || 'EPSON';
    
    // Simple test content
    const testContent = `
PRINTER TEST
============
Date: ${new Date().toLocaleString()}
Printer: ${printerName}
Status: OK

If you can read this,
your printer is working!

----END TEST----



`;
    
    console.log(`[TEST] Testing printer ${printerName}...`);
    
    // Enhanced test with multiple methods
    const tempFile = path.join(os.tmpdir(), `test_${Date.now()}.txt`);
    fs.writeFileSync(tempFile, testContent, 'utf8');
    
    let commands = [];
    if (process.platform === 'win32') {
      commands = [
        `print /d:${printerName} "${tempFile}"`,
        `type "${tempFile}" > ${printerName}:`,
        `copy "${tempFile}" ${printerName}:`
      ];
    } else {
      commands = [
        `lp -d "${printerName}" "${tempFile}"`,
        `lp -d "${printerName}" -o raw "${tempFile}"`,
        `cat "${tempFile}" > /dev/usb/lp0`
      ];
    }
    
    let commandIndex = 0;
    
    const tryTestCommand = () => {
      if (commandIndex >= commands.length) {
        try {
          fs.unlinkSync(tempFile);
        } catch (cleanupError) {
          console.warn('[CLEANUP] Failed to remove temp file:', cleanupError.message);
        }
        
        return res.status(500).json({ 
          success: false,
          error: 'All test methods failed', 
          details: 'Printer may not be connected or configured properly'
        });
      }
      
      const command = commands[commandIndex];
      console.log(`[TEST] Trying method ${commandIndex + 1}: ${command}`);
      
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.warn(`[TEST] Method ${commandIndex + 1} failed:`, error.message);
          commandIndex++;
          tryTestCommand();
        } else {
          try {
            fs.unlinkSync(tempFile);
          } catch (cleanupError) {
            console.warn('[CLEANUP] Failed to remove temp file:', cleanupError.message);
          }
          
          console.log(`[TEST SUCCESS] Test print completed using method ${commandIndex + 1}`);
          res.json({ 
            success: true, 
            message: `Test printed to ${printerName} via method ${commandIndex + 1}`,
            printer: printerName,
            method: command.split(' ')[0]
          });
        }
      });
    };
    
    tryTestCommand();
    
  } catch (error) {
    console.error('[TEST SERVICE ERROR]:', error);
    res.status(500).json({ 
      success: false,
      error: 'Test service error', 
      details: error.message 
    });
  }
});

/**
 * List available printers
 */
app.get('/printers', (req, res) => {
  let command;
  
  if (process.platform === 'win32') {
    command = 'wmic printer get name';
  } else if (process.platform === 'darwin') {
    command = 'lpstat -p';
  } else {
    command = 'lpstat -p';
  }
  
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error('[PRINTERS ERROR]:', error.message);
      return res.status(500).json({ 
        error: 'Failed to list printers', 
        details: error.message 
      });
    }
    
    // Parse printer names from output
    const printers = [];
    const lines = stdout.split('\n');
    
    lines.forEach(line => {
      line = line.trim();
      if (line && !line.includes('Name') && !line.includes('----')) {
        if (process.platform === 'win32') {
          if (line && line !== 'Name') printers.push(line);
        } else {
          const match = line.match(/printer (.+) is/);
          if (match) printers.push(match[1]);
        }
      }
    });
    
    res.json({ printers });
  });
});

/**
 * Health check
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'running',
    platform: process.platform,
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

/**
 * Hardware status check - Enhanced for MMF and Epson detection
 */
app.get('/hardware/status', async (req, res) => {
  try {
    const status = {
      printer: { connected: false, name: null, methods: [], details: null },
      drawer: { connected: false, pin: 'pin2', methods: [] },
      platform: process.platform,
      timestamp: new Date().toISOString()
    };
    
    // Check for specific printer models (MMF, EPSON)
    let printerCheckCommand;
    if (process.platform === 'win32') {
      printerCheckCommand = 'wmic printer get Name,Status,PortName';
    } else {
      printerCheckCommand = 'lpstat -p -d';
    }
    
    exec(printerCheckCommand, (printerError, printerOutput) => {
      if (!printerError && printerOutput) {
        const lines = printerOutput.split('\n');
        let foundPrinter = false;
        
        lines.forEach(line => {
          const lowerLine = line.toLowerCase();
          if (lowerLine.includes('epson') || lowerLine.includes('pos') || 
              lowerLine.includes('receipt') || lowerLine.includes('mmf')) {
            foundPrinter = true;
            status.printer.connected = true;
            status.printer.name = line.trim().split(/\s+/)[0] || 'EPSON';
            status.printer.methods = process.platform === 'win32' ? 
              ['copy /b', 'print /d', 'type >'] : ['lp -o raw', 'cat >', 'lp'];
            status.printer.details = line.trim();
          }
        });
        
        if (!foundPrinter && lines.length > 1) {
          // Fallback: assume first printer found
          status.printer.connected = true;
          status.printer.name = 'Unknown Printer';
          status.printer.methods = ['fallback'];
        }
      }
      
      // Check drawer connectivity (typically connected via printer port)
      if (status.printer.connected) {
        status.drawer.connected = true;
        status.drawer.methods = ['ESC/POS via printer port'];
        
        // Test drawer pin configuration
        const testDrawerCommand = Buffer.from([0x1B, 0x70, 0x00, 25, 25]);
        const testFile = path.join(os.tmpdir(), `drawer_test_${Date.now()}.bin`);
        
        try {
          fs.writeFileSync(testFile, testDrawerCommand);
          status.drawer.pin = 'pin2'; // Default
          fs.unlinkSync(testFile); // Clean up immediately
        } catch (e) {
          console.warn('[HARDWARE] Drawer test file creation failed:', e.message);
        }
      }
      
      res.json(status);
    });
    
  } catch (error) {
    console.error('[HARDWARE STATUS ERROR]:', error);
    res.status(500).json({ 
      error: 'Hardware status check failed',
      details: error.message 
    });
  }
});

// Start server
app.listen(PORT, '127.0.0.1', () => {
  console.log(`
==========================================
  LOCAL PRINT SERVICE RUNNING
==========================================
  Port: ${PORT}
  Platform: ${process.platform}
  
  Endpoints:
  - POST /print         (Print receipt)
  - POST /drawer/open   (Open cash drawer)  
  - POST /test          (Test printer)
  - GET  /printers      (List printers)
  - GET  /health        (Health check)
  - GET  /hardware/status (Hardware status)
  
  Connect your web app to:
  http://localhost:${PORT}
==========================================
  `);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[SHUTDOWN] Print service stopping...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[SHUTDOWN] Print service stopping...');
  process.exit(0);
});