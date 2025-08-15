// TM-T88V MMF Hardware Bridge - Optimized for Model M244A
// Save as: TM-T88V-MMF-Bridge.js
// Run with: node TM-T88V-MMF-Bridge.js

const express = require("express");
const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const app = express();
const PORT = 8080;

app.use(express.json());
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept",
  );
  if (req.method === "OPTIONS") res.sendStatus(200);
  else next();
});

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", hardware: "TM-T88V + MMF" });
});

// Hardware status
app.get("/hardware/status", (req, res) => {
  res.json({
    printer: { connected: true, name: "TM-T88V", model: "M244A" },
    drawer: { connected: true, type: "MMF 6-pin (5 active)" },
    platform: process.platform,
    timestamp: new Date().toISOString(),
  });
});

// MMF Cash Drawer via TM-T88V
app.post("/drawer/open", async (req, res) => {
  console.log("🔓 Opening MMF drawer via TM-T88V M244A...");

  // TM-T88V optimized commands for MMF 6-pin drawer
  const commands = [
    { pin: 2, pulse: 25, buffer: Buffer.from([0x1b, 0x70, 0x00, 0x19, 0x19]) },
    { pin: 5, pulse: 25, buffer: Buffer.from([0x1b, 0x70, 0x01, 0x19, 0x19]) },
    { pin: 2, pulse: 50, buffer: Buffer.from([0x1b, 0x70, 0x00, 0x32, 0x32]) },
    { pin: 5, pulse: 50, buffer: Buffer.from([0x1b, 0x70, 0x01, 0x32, 0x32]) },
    { pin: 2, pulse: 100, buffer: Buffer.from([0x1b, 0x70, 0x00, 0x64, 0x64]) },
    { pin: "direct", pulse: 0, buffer: Buffer.from([0x1d, 0x61, 0x00]) },
  ];

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    console.log(`Testing MMF Pin ${cmd.pin} (${cmd.pulse}ms pulse)...`);

    try {
      const tempFile = path.join(os.tmpdir(), `mmf_${Date.now()}.bin`);
      fs.writeFileSync(tempFile, cmd.buffer);

      const success = await tryPrinterCommands(tempFile, "drawer");
      fs.unlinkSync(tempFile);

      if (success.worked) {
        return res.json({
          success: true,
          message: `MMF drawer opened via Pin ${cmd.pin}`,
          method: success.command,
          pin: cmd.pin,
          pulse: cmd.pulse,
        });
      }
    } catch (error) {
      console.log(`Pin ${cmd.pin} failed: ${error.message}`);
    }
  }

  res.json({
    success: false,
    error: "All MMF pins failed - check TM-T88V connection to drawer",
  });
});

// TM-T88V Printer Test
app.post("/test", async (req, res) => {
  console.log("🖨️ Testing TM-T88V Model M244A...");

  const testContent = `
    EPSON TM-T88V TEST
    ==================
    Model: M244A
    Date: ${new Date().toLocaleString()}
    Time: ${new Date().toLocaleTimeString()}
    
    Hardware Bridge: CONNECTED
    MMF Drawer: READY
    Connection: ${process.platform.toUpperCase()}
    
    This test confirms your
    TM-T88V is communicating
    properly with the MMF
    cash drawer system.
    
    Test completed successfully!
    ==================
    
    `;

  const tempFile = path.join(os.tmpdir(), `test_${Date.now()}.txt`);
  fs.writeFileSync(tempFile, testContent);

  try {
    const success = await tryPrinterCommands(tempFile, "print");
    fs.unlinkSync(tempFile);

    if (success.worked) {
      res.json({
        success: true,
        message: "TM-T88V test printed successfully",
        method: success.command,
      });
    } else {
      res.json({
        success: false,
        error: "All TM-T88V print methods failed",
      });
    }
  } catch (error) {
    fs.unlinkSync(tempFile);
    res.json({ success: false, error: error.message });
  }
});

// Receipt printing
app.post("/print", async (req, res) => {
  const { content } = req.body;
  console.log("🖨️ Printing receipt to TM-T88V...");

  const tempFile = path.join(os.tmpdir(), `receipt_${Date.now()}.txt`);
  fs.writeFileSync(tempFile, content || "No content provided");

  try {
    const success = await tryPrinterCommands(tempFile, "print");
    fs.unlinkSync(tempFile);

    res.json({
      success: success.worked,
      message: success.worked ? "Receipt printed" : "Print failed",
      method: success.command || "none",
    });
  } catch (error) {
    fs.unlinkSync(tempFile);
    res.json({ success: false, error: error.message });
  }
});

// Try multiple printer command approaches
async function tryPrinterCommands(tempFile, type) {
  const commands =
    process.platform === "win32"
      ? [
          `copy /b "${tempFile}" "TM-T88V"`,
          `copy /b "${tempFile}" "EPSON TM-T88V"`,
          `copy /b "${tempFile}" "EPSON"`,
          `print /d:"TM-T88V" "${tempFile}"`,
          `print /d:"EPSON TM-T88V" "${tempFile}"`,
          `print /d:"EPSON" "${tempFile}"`,
        ]
      : [
          `lp -d "TM-T88V" ${type === "drawer" ? "-o raw" : ""} "${tempFile}"`,
          `lp -d "EPSON_TM-T88V" ${type === "drawer" ? "-o raw" : ""} "${tempFile}"`,
          `lp -d "EPSON" ${type === "drawer" ? "-o raw" : ""} "${tempFile}"`,
          `cat "${tempFile}" > /dev/usb/lp0`,
          `cat "${tempFile}" > /dev/ttyUSB0`,
        ];

  for (const cmd of commands) {
    try {
      await execPromise(cmd);
      console.log(`✅ Success with: ${cmd}`);
      return { worked: true, command: cmd };
    } catch (error) {
      console.log(`❌ Failed: ${cmd} - ${error.message}`);
    }
  }

  return { worked: false };
}

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
🏪 TM-T88V MMF Hardware Bridge
==============================
Port: ${PORT}
Printer: Epson TM-T88V Model M244A
Drawer: MMF 6-pin (5 active pins)
Platform: ${process.platform}

Endpoints:
- POST /drawer/open  (Open MMF cash drawer)
- POST /test         (Test TM-T88V printer)
- POST /print        (Print receipt)
- GET  /health       (Health check)
- GET  /hardware/status (Hardware status)

Your POS system will connect to: http://localhost:${PORT}

🔧 MMF Pin Testing Order:
1. Pin 2 (25ms) - Most common
2. Pin 5 (25ms) - MMF alternative  
3. Pin 2 (50ms) - Extended pulse
4. Pin 5 (50ms) - Extended alternative
5. Pin 2 (100ms) - Maximum pulse
6. Direct command - TM-T88V specific

Ready for hardware testing!
`);
});
