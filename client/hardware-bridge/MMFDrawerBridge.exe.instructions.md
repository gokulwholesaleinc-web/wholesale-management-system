# MMF Cash Drawer & Epson Printer Local Bridge

Since your MMF drawer and Epson printer are connected to your local computer, you need a **local service** running on your Windows/Mac machine to communicate with the POS hardware.

## The Problem
- Your hardware is on your **local computer**  
- The POS system runs on **Replit's servers** (Linux)
- Hardware can't be accessed remotely over the internet

## The Solution: Local Hardware Bridge

### Step 1: Download Local Hardware Bridge
You need to run a small service on your computer where the hardware is connected.

**For Windows:**
```bash
# Download and run MMFBridge.exe (to be provided)
# This creates a local server at http://localhost:8080
```

**For Mac/Linux:**  
```bash
# Download and run mmf-bridge (to be provided)
# This creates a local server at http://localhost:8080
```

### Step 2: Hardware Bridge Features
The bridge service provides:

**Cash Drawer Commands (MMF 6-pin, 5 active):**
- `POST http://localhost:8080/drawer/open`
- Tests all 5 active pins automatically
- Finds the working pin configuration for your specific MMF model

**Printer Commands (Epson):**
- `POST http://localhost:8080/print` - Print receipts
- `POST http://localhost:8080/test` - Test printer connection

### Step 3: Configure POS Hardware Settings
In your POS system:
1. Go to Settings → Hardware  
2. Set "Local Hardware Bridge" to: `http://localhost:8080`
3. Test drawer and printer

## MMF Drawer Pin Configuration

Your MMF drawer has **6 pins but only 5 active**. The bridge will test:

1. **Pin 2** - Most common MMF configuration  
2. **Pin 5** - Alternative MMF configuration  
3. **Extended pulses** for stubborn mechanisms
4. **Maximum pulses** for maximum compatibility

## Alternative Manual Commands

If you want to test manually, use these ESC/POS commands:

**Standard Pin 2:** `1B 70 00 19 19`  
**Alternative Pin 5:** `1B 70 01 19 19`  
**Extended Pin 2:** `1B 70 00 32 32`  
**Extended Pin 5:** `1B 70 01 32 32`  
**Maximum Pin 2:** `1B 70 00 64 64`

## Hardware Requirements
- MMF cash drawer connected to Epson printer
- Epson printer connected via USB/Serial to your computer  
- Windows/Mac/Linux computer with admin privileges
- Internet connection for the POS web app

## Troubleshooting
1. **Drawer won't open:** Check cable connection between drawer and printer
2. **Printer not found:** Verify USB connection and driver installation  
3. **Port conflicts:** Change bridge port in config file
4. **Firewall issues:** Allow port 8080 in Windows Firewall

Would you like me to create the actual hardware bridge executable for your operating system?