// RMH Success Analysis Tool
// Since RMH works, let's analyze how it communicates with TM-T88V

const { exec } = require('child_process');
const fs = require('fs');

function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, { encoding: 'utf8' }, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
}

async function analyzeRMHSuccess() {
  console.log('🔍 RMH Success Analysis');
  console.log('=======================');
  console.log('RMH can print and open drawer - analyzing communication method...\n');
  
  // Check if capture log exists
  try {
    if (fs.existsSync('rmh-capture.log')) {
      console.log('📋 Analyzing capture log...');
      const logData = fs.readFileSync('rmh-capture.log', 'utf8');
      const entries = logData.trim().split('\n').map(line => {
        try { return JSON.parse(line); } catch { return null; }
      }).filter(e => e);
      
      console.log(`Found ${entries.length} captured events\n`);
      
      entries.forEach(entry => {
        if (entry.type === 'DRAWER_COMMAND') {
          console.log(`🎯 DRAWER COMMAND FOUND:`);
          console.log(`   Time: ${entry.timestamp}`);
          console.log(`   Source: ${entry.source}`);
          console.log(`   Hex: ${entry.data}`);
          console.log('');
        } else if (entry.type === 'PROCESS' && (entry.data.includes('print') || entry.data.includes('copy'))) {
          console.log(`🔄 PRINT PROCESS:`);
          console.log(`   Time: ${entry.timestamp}`);
          console.log(`   Command: ${entry.data}`);
          console.log('');
        }
      });
    } else {
      console.log('⚠️ No rmh-capture.log found in current directory');
    }
  } catch (error) {
    console.log('⚠️ Could not read capture log:', error.message);
  }
  
  // Check what RMH process is running
  console.log('🔍 Checking for RMH processes...');
  try {
    const processes = await execPromise('tasklist /fo csv | findstr /i rmh');
    if (processes.trim()) {
      console.log('Found RMH processes:');
      console.log(processes);
    } else {
      console.log('No RMH processes currently running');
    }
  } catch (error) {
    console.log('Could not check RMH processes');
  }
  
  // Analyze what made RMH work
  console.log('\n🎯 RMH SUCCESS ANALYSIS:');
  console.log('========================');
  console.log('✅ RMH can print to TM-T88V (hardware connection confirmed)');
  console.log('✅ RMH can open MMF drawer (communication method works)');
  console.log('❌ Our bridge cannot print or open drawer (missing drivers/method)');
  console.log('');
  console.log('🔧 POSSIBLE RMH METHODS:');
  console.log('1. Direct USB communication (bypassing Windows print system)');
  console.log('2. Built-in EPSON drivers included with RMH');
  console.log('3. OPOS (OLE for POS) communication layer');
  console.log('4. Custom serial/USB protocols');
  console.log('');
  console.log('💡 NEXT STEPS:');
  console.log('1. Install EPSON TM-T88V drivers for Windows');
  console.log('2. Or replicate RMH\'s direct communication method');
  console.log('3. Test our bridge after driver installation');
  console.log('');
  
  // Create driver download guide
  console.log('📥 DRIVER INSTALLATION GUIDE:');
  console.log('=============================');
  console.log('Since RMH works, your hardware is fine - we just need proper drivers.');
  console.log('');
  console.log('Option 1 - EPSON Official Drivers:');
  console.log('- Visit: support.epson.com');
  console.log('- Search: "TM-T88V drivers"');
  console.log('- Download: "Advanced Printer Driver (APD)"');
  console.log('- Install for USB connection');
  console.log('');
  console.log('Option 2 - Windows Generic Driver:');
  console.log('- Control Panel → Devices and Printers');
  console.log('- Add Printer → Local Printer');
  console.log('- Use existing port (USB001, USB002, etc.)');
  console.log('- Choose Generic/Text Only driver');
  console.log('- Name it "TM-T88V"');
  console.log('');
  console.log('After driver install, run our bridge tests again.');
}

analyzeRMHSuccess();