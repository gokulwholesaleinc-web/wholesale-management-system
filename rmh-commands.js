/**
 * RMH Command Capture Tool - Understanding what RMH sends to TM-T88V
 * This script will help us understand exactly what commands RMH uses successfully
 */

console.log('🔍 RMH Command Capture Tool Started\n');

// What we know RMH does successfully:
console.log('✅ CONFIRMED WORKING - RMH SETUP:');
console.log('• Hardware: TM-T88V Model M244A with MMF cash drawer');
console.log('• Connection: USB cable (already activated and working)');
console.log('• Driver: Windows recognizes printer (RMH prints successfully)');
console.log('• Cash Drawer: RMH opens drawer successfully');
console.log('');

// Let's test what our POS system should send:
console.log('🎯 TESTING OUR POS COMMANDS:');

// Test 1: Check if we can reach backend cash drawer endpoint
console.log('Test 1: Backend Cash Drawer Endpoint');
fetch('/api/pos/open-drawer', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ method: 'powershell' })
})
.then(response => response.json())
.then(data => {
  console.log('✅ Backend Response:', data);
  if (data.success) {
    console.log(`✅ Method Used: ${data.method}`);
    console.log(`✅ Details: ${data.details}`);
  } else {
    console.log(`❌ Error: ${data.error}`);
  }
})
.catch(error => {
  console.log('❌ Backend Request Failed:', error.message);
});

// Test 2: Try direct Windows printer access
console.log('\nTest 2: Direct Browser Print Test');
try {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head><title>TM-T88V Drawer Test</title></head>
        <body>
          <pre>ESC p 0 100 100 - Cash Drawer Kick Command</pre>
          <script>
            window.print();
            setTimeout(() => window.close(), 1000);
          </script>
        </body>
      </html>
    `);
    console.log('✅ Print dialog opened - check if drawer opens');
  } else {
    console.log('❌ Pop-up blocked - unable to test direct print');
  }
} catch (error) {
  console.log('❌ Direct print test failed:', error.message);
}

// Test 3: Show what RMH might be doing differently
console.log('\n🤔 WHAT RMH MIGHT BE DOING DIFFERENTLY:');
console.log('• RMH likely uses OPOS drivers directly (COM objects)');
console.log('• RMH might have printer configured for specific port/driver');
console.log('• RMH might use different ESC/POS command timing');
console.log('• RMH might send commands through specific Windows API');

console.log('\n📋 NEXT STEPS TO TEST:');
console.log('1. Press F8 in POS system and check console for errors');
console.log('2. Look in Windows Event Viewer for printer communication');
console.log('3. Check if "EPSON TM-T88V Receipt" appears in Windows Printers');
console.log('4. Try printing a test page from Windows to verify driver');

// Monitor for F8 key press
console.log('\n👂 Monitoring for F8 key press...');
document.addEventListener('keydown', (event) => {
  if (event.key === 'F8') {
    console.log('🎯 F8 Key Detected! Cash drawer command should be sent now...');
    console.log('• Check browser network tab for /api/pos/open-drawer request');
    console.log('• Check for any error messages in console');
    console.log('• Watch for success/error toast notification');
  }
});

console.log('💡 Press F8 now to test the cash drawer command!');