#!/usr/bin/env node
/**
 * Direct Hardware Communication Service for MMF Cash Drawer & Epson Printer
 * Bypasses complex service architecture for direct ESC/POS commands
 */

import { exec, execFile, spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';

class DirectHardwareManager {
  constructor() {
    this.platform = process.platform;
    console.log(`[HARDWARE] Initializing for platform: ${this.platform}`);
  }

  /**
   * Open MMF cash drawer with enhanced ESC/POS commands
   */
  async openDrawer(printerName = 'EPSON') {
    console.log(`[MMF DRAWER] Attempting to open via ${printerName}...`);
    
    // Enhanced ESC/POS commands specifically for MMF 6-pin drawers (5 active)
    const commands = [
      Buffer.from([0x1B, 0x70, 0x00, 0x19, 0x19]), // Pin 2 (most common for MMF)
      Buffer.from([0x1B, 0x70, 0x01, 0x19, 0x19]), // Pin 5 (secondary MMF)
      Buffer.from([0x1B, 0x70, 0x00, 0x32, 0x32]), // Pin 2 with extended pulse
      Buffer.from([0x1B, 0x70, 0x01, 0x32, 0x32]), // Pin 5 with extended pulse
      Buffer.from([0x1B, 0x70, 0x00, 0x64, 0x64]), // Pin 2 with long pulse (100ms)
      Buffer.from([0x10, 0x14, 0x01, 0x00, 0x05]), // Alternative MMF direct command
    ];

    for (let i = 0; i < commands.length; i++) {
      const result = await this.sendRawCommand(commands[i], printerName, `MMF Method ${i + 1}`);
      if (result.success) {
        return result;
      }
    }
    
    return { success: false, error: 'All MMF drawer commands failed' };
  }

  /**
   * Test Epson printer with multiple approaches
   */
  async testPrinter(printerName = 'EPSON') {
    console.log(`[EPSON] Testing printer ${printerName}...`);
    
    const testContent = `
EPSON PRINTER TEST
==================
Date: ${new Date().toLocaleString()}
Hardware: Direct Communication
Status: Testing Connection

This is a test print to verify
your Epson printer connectivity.

If you see this, the connection
is working properly.

================================
`;

    const methods = [
      () => this.printViaLP(testContent, printerName),
      () => this.printViaRaw(testContent, printerName),
      () => this.printViaDevice(testContent),
      () => this.printViaNetwork(testContent)
    ];

    for (let i = 0; i < methods.length; i++) {
      try {
        console.log(`[EPSON] Trying print method ${i + 1}...`);
        const result = await methods[i]();
        if (result.success) {
          return { success: true, method: `Method ${i + 1}`, message: 'Printer test successful' };
        }
      } catch (error) {
        console.warn(`[EPSON] Method ${i + 1} failed:`, error.message);
      }
    }

    return { success: false, error: 'All printer methods failed' };
  }

  /**
   * Send raw command to hardware
   */
  async sendRawCommand(command, printerName, methodName) {
    return new Promise((resolve) => {
      const tempFile = path.join(os.tmpdir(), `hw_${Date.now()}.bin`);
      
      try {
        fs.writeFileSync(tempFile, command);
        
        const commands = this.platform === 'win32' ? [
          `copy /b "${tempFile}" ${printerName}:`,
          `print /d:${printerName} "${tempFile}"`
        ] : [
          `lp -d "${printerName}" -o raw "${tempFile}"`,
          `cat "${tempFile}" > /dev/usb/lp0`,
          `cat "${tempFile}" > /dev/ttyUSB0`
        ];

        let tried = 0;
        const tryCommand = () => {
          if (tried >= commands.length) {
            this.cleanup(tempFile);
            resolve({ success: false, error: `${methodName} - all approaches failed` });
            return;
          }

          exec(commands[tried], (error, stdout, stderr) => {
            if (!error) {
              console.log(`[SUCCESS] ${methodName} worked with command: ${commands[tried]}`);
              this.cleanup(tempFile);
              resolve({ success: true, method: methodName, command: commands[tried] });
            } else {
              tried++;
              tryCommand();
            }
          });
        };

        tryCommand();
      } catch (error) {
        this.cleanup(tempFile);
        resolve({ success: false, error: error.message });
      }
    });
  }

  /**
   * Print via standard LP command
   */
  async printViaLP(content, printerName) {
    return new Promise((resolve) => {
      const tempFile = path.join(os.tmpdir(), `print_${Date.now()}.txt`);
      fs.writeFileSync(tempFile, content);
      
      exec(`lp -d "${printerName}" "${tempFile}"`, (error, stdout, stderr) => {
        this.cleanup(tempFile);
        resolve({ success: !error, error: error?.message, output: stdout });
      });
    });
  }

  /**
   * Print via raw mode
   */
  async printViaRaw(content, printerName) {
    return new Promise((resolve) => {
      const tempFile = path.join(os.tmpdir(), `raw_${Date.now()}.txt`);
      fs.writeFileSync(tempFile, content);
      
      exec(`lp -d "${printerName}" -o raw "${tempFile}"`, (error, stdout, stderr) => {
        this.cleanup(tempFile);
        resolve({ success: !error, error: error?.message, output: stdout });
      });
    });
  }

  /**
   * Print via direct device
   */
  async printViaDevice(content) {
    return new Promise((resolve) => {
      const devices = ['/dev/usb/lp0', '/dev/ttyUSB0', '/dev/ttyACM0'];
      
      for (const device of devices) {
        try {
          if (fs.existsSync(device)) {
            fs.writeFileSync(device, content);
            resolve({ success: true, device });
            return;
          }
        } catch (error) {
          // Try next device
        }
      }
      
      resolve({ success: false, error: 'No accessible devices found' });
    });
  }

  /**
   * Print via network (for network printers)
   */
  async printViaNetwork(content, ip = '192.168.1.100', port = 9100) {
    return new Promise((resolve) => {
      const tempFile = path.join(os.tmpdir(), `net_${Date.now()}.txt`);
      fs.writeFileSync(tempFile, content);
      
      exec(`nc -w1 ${ip} ${port} < "${tempFile}"`, (error, stdout, stderr) => {
        this.cleanup(tempFile);
        resolve({ success: !error, error: error?.message });
      });
    });
  }

  /**
   * Clean up temporary files
   */
  cleanup(filePath) {
    try {
      fs.unlinkSync(filePath);
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  /**
   * Get hardware status
   */
  async getHardwareStatus() {
    const status = {
      platform: this.platform,
      timestamp: new Date().toISOString(),
      printers: [],
      devices: []
    };

    try {
      // Check for available printers
      const printerCheck = await new Promise((resolve) => {
        exec('lpstat -p 2>/dev/null', (error, stdout) => {
          resolve(stdout || 'No printers detected');
        });
      });
      status.printers = printerCheck.split('\n').filter(line => line.includes('printer'));

      // Check for USB devices
      const deviceCheck = await new Promise((resolve) => {
        exec('ls /dev/usb/lp* /dev/ttyUSB* 2>/dev/null', (error, stdout) => {
          resolve(stdout?.split('\n').filter(Boolean) || []);
        });
      });
      status.devices = deviceCheck;

    } catch (error) {
      status.error = error.message;
    }

    return status;
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const hardware = new DirectHardwareManager();
  const action = process.argv[2];
  const param = process.argv[3];

  switch (action) {
    case 'drawer':
      hardware.openDrawer(param).then(result => {
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.success ? 0 : 1);
      });
      break;
      
    case 'test':
      hardware.testPrinter(param).then(result => {
        console.log(JSON.stringify(result, null, 2));
        process.exit(result.success ? 0 : 1);
      });
      break;
      
    case 'status':
      hardware.getHardwareStatus().then(result => {
        console.log(JSON.stringify(result, null, 2));
      });
      break;
      
    default:
      console.log('Usage: node directHardware.js [drawer|test|status] [printer_name]');
      process.exit(1);
  }
}

export default DirectHardwareManager;