// RMH Command Capture Tool
// This monitors Windows print spooler and system calls to capture what RMH is doing
// Run this while using RMH to open your cash drawer

const { exec, spawn } = require('child_process');
const fs = require('fs');

console.log('🔍 RMH Command Capture Tool Started');
console.log('=======================================');
console.log('This tool will monitor:');
console.log('- Windows print spooler activity');
console.log('- File system operations to temp folders');
console.log('- Process creation events');
console.log('');
console.log('📋 Instructions:');
console.log('1. Start this tool first');
console.log('2. Open RMH software');
console.log('3. Open the cash drawer through RMH');
console.log('4. Watch this console for captured commands');
console.log('');

// Monitor print spooler
function monitorPrintSpooler() {
  console.log('👀 Monitoring Windows Print Spooler...');
  
  const spoolerCmd = 'wmic process where "name=\'spoolsv.exe\'" get processid,commandline /format:list';
  
  setInterval(async () => {
    try {
      const result = await execPromise(spoolerCmd);
      // Log any changes in spooler activity
      if (result && result.includes('CommandLine')) {
        const timestamp = new Date().toLocaleTimeString();
        console.log(`[${timestamp}] Print Spooler Activity Detected`);
      }
    } catch (error) {
      // Silent - don't spam console
    }
  }, 1000);
}

// Monitor temp folder for new files (where print jobs often go)
function monitorTempFolder() {
  console.log('📁 Monitoring temp folder for print jobs...');
  
  const tempDir = process.env.TEMP || process.env.TMP || 'C:\\Windows\\Temp';
  
  let previousFiles = new Set();
  
  setInterval(() => {
    try {
      fs.readdir(tempDir, (err, files) => {
        if (err) return;
        
        const currentFiles = new Set(files);
        const newFiles = [...currentFiles].filter(file => !previousFiles.has(file));
        
        newFiles.forEach(file => {
          if (file.includes('spl') || file.includes('tmp') || file.includes('.bin')) {
            const timestamp = new Date().toLocaleTimeString();
            console.log(`[${timestamp}] 📄 New temp file: ${file}`);
            
            // Try to read small files to see if they contain ESC/POS commands
            const filepath = `${tempDir}\\${file}`;
            try {
              const stats = fs.statSync(filepath);
              if (stats.size < 1024) { // Only read small files
                const buffer = fs.readFileSync(filepath);
                const hex = buffer.toString('hex').toUpperCase();
                if (hex.includes('1B70') || hex.includes('1D61')) { // ESC/POS drawer commands
                  console.log(`[${timestamp}] 🎯 POTENTIAL DRAWER COMMAND: ${hex}`);
                  logCapture('DRAWER_COMMAND', file, hex);
                }
              }
            } catch (readError) {
              // File might be locked, skip
            }
          }
        });
        
        previousFiles = currentFiles;
      });
    } catch (error) {
      // Silent monitoring
    }
  }, 500);
}

// Monitor process creation (to see what commands RMH runs)
function monitorProcesses() {
  console.log('🔄 Monitoring new process creation...');
  
  const wmiCmd = 'wmic process where "name like \'%print%\' or name like \'%cmd%\' or name like \'%rmh%\'" get processid,commandline,name /format:csv';
  
  let previousProcesses = new Set();
  
  setInterval(async () => {
    try {
      const result = await execPromise(wmiCmd);
      const lines = result.split('\n').filter(line => line.trim());
      
      lines.forEach(line => {
        if (line && !previousProcesses.has(line)) {
          const timestamp = new Date().toLocaleTimeString();
          if (line.includes('print') || line.includes('cmd') || line.includes('copy')) {
            console.log(`[${timestamp}] 🔄 Process: ${line}`);
            logCapture('PROCESS', 'command', line);
          }
          previousProcesses.add(line);
        }
      });
      
      // Clean old entries periodically
      if (previousProcesses.size > 1000) {
        previousProcesses.clear();
      }
      
    } catch (error) {
      // Silent monitoring
    }
  }, 2000);
}

// Log captured information
function logCapture(type, source, data) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    type,
    source,
    data: data.substring(0, 500) // Limit data length
  };
  
  const logFile = 'rmh-capture.log';
  fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  
  console.log(`💾 Logged ${type} to ${logFile}`);
}

// Utility function
function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, { encoding: 'utf8', maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
}

// Start monitoring
console.log('🚀 Starting all monitors...');
console.log('');

monitorPrintSpooler();
monitorTempFolder();
monitorProcesses();

console.log('✅ All monitors active!');
console.log('');
console.log('🎯 Now use RMH to open your cash drawer');
console.log('   Watch this console for captured commands');
console.log('');
console.log('Press Ctrl+C to stop monitoring');
console.log('=======================================');

// Keep the process running
process.on('SIGINT', () => {
  console.log('\n🛑 Monitoring stopped');
  console.log('Check rmh-capture.log for detailed results');
  process.exit(0);
});