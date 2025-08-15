import { exec } from 'child_process';

console.log('🔍 TM-T88V Connection Verification\n');

// Check Windows printer recognition
exec('powershell.exe -Command "Get-Printer | Where-Object {$_.Name -like \'*TM-T88V*\' -or $_.Name -like \'*T88V*\'} | Select-Object Name, DriverName, PortName, PrinterStatus"', (error, stdout, stderr) => {
    console.log('📋 WINDOWS PRINTER STATUS:');
    if (error) {
        console.log('❌ Error checking printers:', error.message);
        return;
    }
    
    if (stdout.trim()) {
        console.log('✅ TM-T88V Found in Windows:');
        console.log(stdout);
    } else {
        console.log('❌ TM-T88V not found in Windows printers');
        console.log('💡 This indicates USB port may not be activated');
    }
    console.log('');

    // Check USB devices
    exec('powershell.exe -Command "Get-PnpDevice | Where-Object {$_.FriendlyName -like \'*EPSON*\' -or $_.FriendlyName -like \'*T88*\'} | Select-Object FriendlyName, Status, InstanceId"', (error2, stdout2, stderr2) => {
        console.log('🔌 USB DEVICE STATUS:');
        if (error2) {
            console.log('❌ Error checking USB devices:', error2.message);
            return;
        }
        
        if (stdout2.trim()) {
            console.log('✅ EPSON USB Devices Found:');
            console.log(stdout2);
        } else {
            console.log('❌ No EPSON USB devices detected');
            console.log('💡 USB port activation required');
        }
        console.log('');

        // Test basic printer communication
        exec('powershell.exe -Command "try { $printer = Get-Printer -Name \'*TM-T88V*\'; if($printer) { Write-Output \'Printer object exists\' } else { Write-Output \'Printer not accessible\' } } catch { Write-Output \'Printer access failed\' }"', (error3, stdout3, stderr3) => {
            console.log('💬 PRINTER COMMUNICATION TEST:');
            if (stdout3.includes('exists')) {
                console.log('✅ Printer communication: OK');
                console.log('🎯 Ready to test cash drawer commands');
            } else {
                console.log('❌ Printer communication: FAILED');
                console.log('🔧 USB port activation needed');
            }
            
            console.log('\n📋 NEXT STEPS:');
            console.log('1. If printer not found: Activate USB port on TM-T88V');
            console.log('2. If printer found: Test cash drawer with F8 key');
            console.log('3. If drawer doesn\'t open: Check CD-101A cable connection');
        });
    });
});