# TM-T88V Driver Installation Guide

## Current Status
- Windows has NO TM-T88V drivers installed
- Print commands succeed but nothing prints physically
- RMH might have its own built-in drivers

## If RMH Cannot Print Either
You need to install proper TM-T88V drivers for Windows:

### Option 1: EPSON Advanced Printer Driver (APD)
1. Go to EPSON support website
2. Search for "TM-T88V Model M244A"
3. Download "Advanced Printer Driver (APD)"
4. Install and configure for USB connection

### Option 2: OPOS Drivers
1. Download EPSON OPOS drivers for TM-T88V
2. Install OPOS runtime
3. Configure printer in OPOS setup utility

### Option 3: Generic ESC/POS Driver
1. Add printer manually in Windows
2. Use "Generic/Text Only" driver
3. Set port to appropriate USB/Serial port

## If RMH Can Print Successfully
RMH has its own drivers - we'll capture and replicate its communication method:

1. Run capture tool while using RMH
2. Analyze captured commands and methods
3. Replicate RMH's approach in our bridge

## Next Steps After Driver Installation
1. Verify printer appears in Windows printer list
2. Test physical printing with our bridge
3. Test cash drawer commands
4. Update bridge with correct printer names

## Testing Commands After Driver Install
```batch
# Test printing
print /d:"TM-T88V" "testfile.txt"
print /d:"EPSON TM-T88V" "testfile.txt"

# Test drawer
print /d:"TM-T88V" "drawer_command.bin"
```

## Troubleshooting
- Ensure USB cable is connected properly
- Check Windows Device Manager for printer
- Verify printer is not paused or offline
- Test with EPSON utilities if available