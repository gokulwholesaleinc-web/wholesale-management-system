# Epson Printer & MMF Cash Drawer Integration Setup

## Hardware Requirements

### Supported Hardware
- **Epson Thermal Printers**: TM-T20II, TM-T88V, TM-T88VI, TM-U220, etc.
- **MMF Cash Drawers**: Compatible with standard ESC/POS kick commands
- **Connection Types**: USB, Serial (RS-232), Network (Ethernet), Bluetooth

## Setup Instructions

### Step 1: Install Local Print Service (Recommended)

1. **Download the local print service file** from `server/services/localPrintService.js`
2. **Install Node.js** on the POS computer (if not already installed)
3. **Run the service**:
   ```bash
   node localPrintService.js
   ```
4. **Keep the service running** in the background while using the POS system

### Step 2: Printer Configuration

#### USB Connection (Most Common)
1. Connect Epson printer via USB
2. Install Epson printer drivers
3. Set printer name in Windows/macOS (usually "EPSON" or "TM-T20II")
4. In POS settings, set Printer Name to match system printer name

#### Serial Connection
1. Connect printer to COM port or USB-to-Serial adapter
2. Configure baud rate (typically 9600)
3. Enable Web Serial API in Chrome (chrome://flags/#enable-experimental-web-platform-features)

#### Network Connection
1. Configure printer IP address
2. Install network printer drivers
3. Set printer name in system

### Step 3: Cash Drawer Setup

1. **Connect cash drawer to printer** (most MMF drawers connect to printer's DK port)
2. **Configure pin**: Most MMF drawers use Pin 2 (default), some use Pin 5
3. **Test connection**: Use the "Open Drawer" button in POS system

### Step 4: Paper Configuration

- **58mm paper**: Set width to 32 characters
- **80mm paper**: Set width to 42 or 48 characters
- **Load paper** with printed side facing out

## Connection Methods Priority

The system tries multiple connection methods in order:

1. **Direct Connection** (via local service) - Best performance
2. **Web Serial API** (Chrome 89+) - Good for development
3. **Download File** (fallback) - Works everywhere but manual

## Troubleshooting

### Common Issues

**Printer not found**
- Check printer is powered on and connected
- Verify printer drivers are installed
- Ensure printer name matches configuration

**Cash drawer not opening**
- Check cable connection between printer and drawer
- Try different pin setting (Pin 2 vs Pin 5)
- Test with manual drawer command

**Print quality issues**
- Check paper alignment
- Clean print head
- Verify paper width setting matches physical paper

### Testing

Use the built-in test functions:
- **Test Printer**: Prints a test receipt
- **Open Drawer**: Tests cash drawer connection
- **Print Receipt**: Full transaction receipt test

### Browser Compatibility

- **Chrome 89+**: Full Web Serial API support
- **Edge 89+**: Full Web Serial API support  
- **Firefox**: Local service required
- **Safari**: Local service required

## Security Notes

- Local print service runs on localhost:8080
- Web Serial API requires user permission
- All connections use standard ESC/POS commands
- No sensitive data stored in print service

## Advanced Configuration

### Custom ESC/POS Commands

Modify `printerService.ts` to add custom commands:
```typescript
// Example: Add logo printing
private printLogo() {
  return '\x1D\x2A\x20\x20' + logoData;
}
```

### Multiple Printers

Configure different printers for different purposes:
- Receipt printer: Thermal printer
- Invoice printer: Laser printer
- Label printer: Label printer

### Network Deployment

For multiple POS stations:
1. Install local service on each computer
2. Configure firewall to allow localhost:8080
3. Test each station independently

## Maintenance

### Daily
- Check paper levels
- Test cash drawer operation
- Verify print quality

### Weekly  
- Clean printer exterior
- Check cable connections
- Test backup procedures

### Monthly
- Clean print head with cleaning pen
- Check printer driver updates
- Review error logs in browser console

## Support

For technical support:
- Check browser console for error messages
- Verify local service is running (http://localhost:8080/health)
- Test with simple receipt first
- Contact system administrator for hardware issues