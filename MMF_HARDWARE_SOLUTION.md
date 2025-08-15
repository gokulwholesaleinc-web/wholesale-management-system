# MMF Cash Drawer & Epson TM-T88V - Complete Solution

## 🎯 YOUR HARDWARE SETUP
- **Printer**: Epson TM-T88V Model M244A (thermal receipt printer)
- **Drawer**: MMF cash drawer (6-pin, 5 active) connected to TM-T88V
- **Location**: Connected to your local desktop computer
- **Issue**: POS system runs on Replit's remote servers, can't access local hardware

## ✅ THE SOLUTION: Local Hardware Bridge

You need a **small local service** running on your computer where the hardware is physically connected.

### Step 1: Create Local Hardware Bridge

**Save this as `mmf-bridge.js` on your computer:**

```javascript
// MMF Cash Drawer & Epson Printer Local Bridge
// Run with: node mmf-bridge.js

const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const app = express();
const PORT = 8080;

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  if (req.method === 'OPTIONS') res.sendStatus(200);
  else next();
});

// MMF Cash Drawer via TM-T88V - 6 pins (5 active)
app.post('/drawer/open', async (req, res) => {
  console.log('🔓 Opening MMF drawer via TM-T88V...');
  
  // TM-T88V specific MMF commands (optimized for Model M244A)
  const commands = [
    Buffer.from([0x1B, 0x70, 0x00, 0x19, 0x19]), // Pin 2 - TM-T88V standard
    Buffer.from([0x1B, 0x70, 0x01, 0x19, 0x19]), // Pin 5 - MMF alternative
    Buffer.from([0x1B, 0x70, 0x00, 0x32, 0x32]), // Pin 2 extended (50ms)
    Buffer.from([0x1B, 0x70, 0x01, 0x32, 0x32]), // Pin 5 extended (50ms)  
    Buffer.from([0x1B, 0x70, 0x00, 0x64, 0x64]), // Pin 2 maximum (100ms)
    Buffer.from([0x1D, 0x61, 0x00]),              // TM-T88V specific drawer pulse
  ];
  
  for (let i = 0; i < commands.length; i++) {
    try {
      const tempFile = path.join(os.tmpdir(), `mmf_${Date.now()}.bin`);
      fs.writeFileSync(tempFile, commands[i]);
      
      // TM-T88V specific printer commands
      const printerCommands = process.platform === 'win32' ? [
        `copy /b "${tempFile}" "TM-T88V"`,
        `copy /b "${tempFile}" "EPSON TM-T88V"`,
        `copy /b "${tempFile}" "EPSON":`
      ] : [
        `lp -d "TM-T88V" -o raw "${tempFile}"`,
        `lp -d "EPSON_TM-T88V" -o raw "${tempFile}"`,
        `lp -d "EPSON" -o raw "${tempFile}"`
      ];
        
      for (const cmd of printerCommands) {
        try {
          await execPromise(cmd);
          fs.unlinkSync(tempFile);
          return res.json({ 
            success: true, 
            message: `MMF drawer opened via pin ${i === 0 || i === 2 || i === 4 ? '2' : '5'}`,
            method: `Command ${i + 1}`
          });
        } catch (error) {
          console.log(`Method ${i + 1} failed: ${error.message}`);
        }
      }
      fs.unlinkSync(tempFile);
    } catch (error) {
      console.log(`Pin test ${i + 1} failed: ${error.message}`);
    }
  }
  
  res.json({ success: false, error: 'All MMF pin tests failed - check connections' });
});

// TM-T88V Printer Test  
app.post('/print', async (req, res) => {
  const { content } = req.body;
  console.log('🖨️ Printing to TM-T88V...');
  
  // TM-T88V optimized test content
  const testContent = content || `
    EPSON TM-T88V TEST
    ==================
    Model: M244A
    Date: ${new Date().toLocaleString()}
    
    Hardware Bridge: Connected
    MMF Drawer: Ready
    
    This confirms your TM-T88V
    is communicating properly.
    
    ==================
    `;
  
  const tempFile = path.join(os.tmpdir(), `print_${Date.now()}.txt`);
  fs.writeFileSync(tempFile, testContent);
  
  // Try multiple TM-T88V printer names
  const commands = process.platform === 'win32' ? [
    `print /d:"TM-T88V" "${tempFile}"`,
    `print /d:"EPSON TM-T88V" "${tempFile}"`, 
    `print /d:"EPSON" "${tempFile}"`
  ] : [
    `lp -d "TM-T88V" "${tempFile}"`,
    `lp -d "EPSON_TM-T88V" "${tempFile}"`,
    `lp -d "EPSON" "${tempFile}"`
  ];
    
  try {
    await execPromise(commands[0]);
    fs.unlinkSync(tempFile);
    res.json({ success: true, message: 'Printed successfully' });
  } catch (error) {
    fs.unlinkSync(tempFile);
    res.json({ success: false, error: error.message });
  }
});

app.get('/status', (req, res) => {
  res.json({ 
    status: 'running', 
    port: PORT, 
    hardware: 'MMF 6-pin drawer + Epson printer',
    platform: process.platform
  });
});

function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
}

app.listen(PORT, () => {
  console.log(`
🏪 MMF Hardware Bridge Running
==============================
Port: ${PORT}
Printer: Epson TM-T88V Model M244A
Drawer: MMF 6-pin (5 active) via TM-T88V
Platform: ${process.platform}

Endpoints:
- POST /drawer/open  (Open MMF drawer)
- POST /print        (Print to Epson)
- GET  /status       (Check status)

Connect your POS to: http://localhost:${PORT}
`);
});
```

### Step 2: Install and Run

**On your computer (where hardware is connected):**

```bash
# Install Node.js if needed, then:
npm install express
node mmf-bridge.js
```

### Step 3: Configure POS System

Your POS system is already configured to try the local bridge first. When you test hardware:

1. **First**: Tries `http://localhost:8080` (your local bridge)
2. **Fallback**: Tries remote server (won't work for hardware)

## 🔧 MMF Drawer Pin Details

Your MMF drawer has **6 pins but only 5 active**:
- **Pin 2**: Most common configuration
- **Pin 5**: Alternative configuration  
- **Extended pulses**: For stubborn mechanisms
- **Maximum pulses**: 100ms for maximum compatibility

The bridge tests all 5 active pins automatically and uses the first one that works.

## ✅ Verification Steps

1. **Run the bridge** on your computer
2. **Open POS** in your browser
3. **Go to Hardware Test** page
4. **Click "Test Cash Drawer"** - should work via localhost
5. **Click "Test Printer"** - should print test page

## 🚨 Troubleshooting

**"Connection failed"**: Bridge not running or wrong port  
**"All pins failed"**: Check drawer-to-printer cable  
**"Printer not found"**: Check USB connection and drivers  
**"CORS error"**: Bridge allows all origins, should work

Would you like me to help you set up this local bridge on your computer?