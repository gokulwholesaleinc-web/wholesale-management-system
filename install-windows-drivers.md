# Install TM-T88V Windows Drivers

## Status: RMH Works, Our Bridge Doesn't
- ✅ RMH successfully prints and opens drawer
- ❌ Windows has no TM-T88V drivers installed  
- ❌ Our bridge commands succeed but nothing happens physically

## Hardware Confirmed Working
Your TM-T88V and MMF drawer are properly connected and functional since RMH can control them.

## Solution: Install Windows Drivers

### Method 1: Manual Windows Driver Installation
1. **Open Control Panel** → **Devices and Printers**
2. **Click "Add a printer"**
3. **Select "Add a local printer"**
4. **Choose "Use an existing port"** and select **USB001** (or USB002, USB003)
5. **Manufacturer**: Select **"Generic"**
6. **Printer**: Select **"Generic / Text Only"**
7. **Name**: Enter **"TM-T88V"**
8. **Test print**: Send a test page

### Method 2: EPSON Official Drivers
1. Go to **support.epson.com**
2. Search for **"TM-T88V Model M244A"**
3. Download **"Advanced Printer Driver (APD)"** for Windows
4. Install and select USB connection
5. Follow setup wizard

### Method 3: OPOS Drivers (Professional POS Solution)
1. Download **EPSON OPOS Driver** from EPSON website
2. Install **OPOS Runtime**
3. Configure in **OPOS Setup Utility**
4. Set communication to USB

## After Driver Installation

### Test Windows Recognition
```bash
# Check if TM-T88V appears in printer list
node check-printer-names.js
```

### Test Physical Printing
```bash
# Verify actual printing works
node verify-tm-t88v-connection.js
```

### Test Our Bridge
```bash
# Test both printing and drawer
node TM-T88V-MMF-Bridge-Enhanced.js
```
Then use POS system to test printer and drawer functions.

## Troubleshooting

### If Driver Install Fails
- Try different USB port
- Run as Administrator
- Check Windows Device Manager for unrecognized devices

### If Still No Printing
- Verify printer shows as "Ready" in Windows
- Check printer is not paused or offline
- Try setting as default printer

### If Drawer Still Won't Open
- Ensure MMF cable connected to TM-T88V drawer port
- Check for manual lock/switch on MMF drawer
- Verify drawer power connection

## Expected Results After Success
1. **TM-T88V appears in Windows printer list**
2. **Our bridge can physically print test pages**
3. **Our bridge can open MMF cash drawer**
4. **POS system fully functional with hardware**

Since RMH demonstrates your hardware works perfectly, installing proper Windows drivers should resolve all issues.