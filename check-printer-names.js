// Windows Printer Name Discovery Tool
// This finds the exact names Windows uses for your printers

const { exec } = require('child_process');

function execPromise(command) {
  return new Promise((resolve, reject) => {
    exec(command, { encoding: 'utf8' }, (error, stdout, stderr) => {
      if (error) reject(error);
      else resolve(stdout);
    });
  });
}

async function discoverPrinters() {
  console.log('🔍 Windows Printer Discovery Tool');
  console.log('=================================');
  
  try {
    console.log('📋 Method 1: WMIC Printer List');
    console.log('------------------------------');
    const wmicResult = await execPromise('wmic printer list brief');
    const printers = wmicResult.split('\n')
      .filter(line => line.trim() && !line.includes('Name'))
      .map(line => line.trim());
    
    printers.forEach((printer, index) => {
      const isEpson = printer.toLowerCase().includes('epson') || 
                     printer.toLowerCase().includes('tm-t88');
      console.log(`${index + 1}. ${printer} ${isEpson ? '← EPSON DETECTED' : ''}`);
    });
    
    console.log('\n📋 Method 2: PowerShell Printer List');
    console.log('-------------------------------------');
    const psResult = await execPromise('powershell "Get-Printer | Format-Table Name, DriverName -AutoSize"');
    console.log(psResult);
    
    console.log('\n📋 Method 3: Registry Printer Check');
    console.log('------------------------------------');
    const regResult = await execPromise('reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Print\\Printers"');
    const regPrinters = regResult.split('\n')
      .filter(line => line.includes('Printers\\'))
      .map(line => line.split('\\').pop().trim());
    
    regPrinters.forEach((printer, index) => {
      const isEpson = printer.toLowerCase().includes('epson') || 
                     printer.toLowerCase().includes('tm-t88');
      console.log(`${index + 1}. ${printer} ${isEpson ? '← EPSON DETECTED' : ''}`);
    });
    
    console.log('\n🎯 RECOMMENDED COMMANDS TO TRY:');
    console.log('===============================');
    
    const epsonPrinters = [...printers, ...regPrinters]
      .filter(p => p && (p.toLowerCase().includes('epson') || p.toLowerCase().includes('tm-t88')))
      .filter((p, i, arr) => arr.indexOf(p) === i); // Remove duplicates
    
    if (epsonPrinters.length > 0) {
      epsonPrinters.forEach(printer => {
        console.log(`print /d:"${printer}" "filename.bin"`);
        console.log(`copy /b "filename.bin" "${printer}"`);
      });
    } else {
      console.log('No EPSON printers detected in Windows');
      console.log('Try these generic commands:');
      console.log('print /d:"TM-T88V" "filename.bin"');
      console.log('copy /b "filename.bin" PRN');
      console.log('copy /b "filename.bin" LPT1');
    }
    
    console.log('\n💡 NEXT STEPS:');
    console.log('--------------');
    console.log('1. Note the exact EPSON printer names above');
    console.log('2. Update your bridge to use these exact names');
    console.log('3. Test with the recommended commands');
    console.log('4. Run capture-rmh-commands.js while using RMH');
    
  } catch (error) {
    console.error('Error discovering printers:', error.message);
  }
}

discoverPrinters();