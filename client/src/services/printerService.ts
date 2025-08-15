/**
 * Epson Printer & MMF Cash Drawer Service
 * Handles ESC/POS commands for thermal receipt printing and cash drawer control
 */

export interface PrinterConfig {
  printerName?: string;
  paperWidth?: number; // in characters (typically 32, 42, or 48)
  cashdrawerPin?: 'pin2' | 'pin5'; // Most MMF drawers use pin 2
  encoding?: string;
}

export interface ReceiptData {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  orderId: number;
  cashier: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  tax?: number;
  total: number;
  paymentMethod: string;
  amountTendered?: number;
  change?: number;
  loyaltyPointsUsed?: number;
  loyaltyPointsEarned?: number;
  timestamp: Date;
}

class PrinterService {
  private config: PrinterConfig;
  private isWebPrintingSupported: boolean;

  constructor(config: PrinterConfig = {}) {
    this.config = {
      printerName: config.printerName || 'Default',
      paperWidth: config.paperWidth || 42,
      cashdrawerPin: config.cashdrawerPin || 'pin2',
      encoding: config.encoding || 'utf-8',
      ...config
    };
    
    // Check if browser supports printing API
    this.isWebPrintingSupported = 'serviceWorker' in navigator;
  }

  /**
   * ESC/POS Command Builders
   */
  private escpos = {
    // Initialize printer
    init: () => '\x1B\x40',
    
    // Text formatting
    bold: (enable: boolean) => enable ? '\x1B\x45\x01' : '\x1B\x45\x00',
    underline: (enable: boolean) => enable ? '\x1B\x2D\x01' : '\x1B\x2D\x00',
    fontSize: (size: 'normal' | 'double') => size === 'double' ? '\x1D\x21\x11' : '\x1D\x21\x00',
    
    // Alignment
    alignLeft: () => '\x1B\x61\x00',
    alignCenter: () => '\x1B\x61\x01',
    alignRight: () => '\x1B\x61\x02',
    
    // Line feeds
    newLine: () => '\x0A',
    feed: (lines: number = 1) => '\x0A'.repeat(lines),
    
    // Cut paper
    cut: () => '\x1D\x56\x42\x00',
    partialCut: () => '\x1D\x56\x01',
    
    // Cash drawer commands
    openDrawer: (pin: 'pin2' | 'pin5' = 'pin2') => {
      // ESC/POS cash drawer kick command
      const pinCode = pin === 'pin2' ? '\x00' : '\x01';
      return `\x1B\x70${pinCode}\x19\x19`; // Standard pulse timing
    },
    
    // Barcode (for order numbers)
    barcode: (data: string) => `\x1D\x6B\x02${data}\x00`,
    
    // Separator line
    separator: (char: string = '-', width?: number) => {
      const lineWidth = width || this.config.paperWidth || 42;
      return char.repeat(lineWidth) + '\x0A';
    }
  };

  /**
   * Format receipt text for thermal printer
   */
  private formatReceipt(data: ReceiptData): string {
    let receipt = '';
    const width = this.config.paperWidth || 42;
    
    // Initialize printer
    receipt += this.escpos.init();
    receipt += this.escpos.alignCenter();
    
    // Store header
    receipt += this.escpos.bold(true);
    receipt += this.escpos.fontSize('double');
    receipt += data.storeName + this.escpos.newLine();
    receipt += this.escpos.fontSize('normal');
    receipt += this.escpos.bold(false);
    
    receipt += data.storeAddress + this.escpos.newLine();
    receipt += data.storePhone + this.escpos.newLine();
    receipt += this.escpos.alignRight();
    receipt += 'TP#97239' + this.escpos.newLine();
    receipt += this.escpos.alignCenter();
    receipt += this.escpos.feed(1);
    
    // Order info
    receipt += this.escpos.alignLeft();
    receipt += this.escpos.bold(true);
    receipt += `Order #${data.orderId}` + this.escpos.newLine();
    receipt += this.escpos.bold(false);
    receipt += `Cashier: ${data.cashier}` + this.escpos.newLine();
    receipt += `Date: ${data.timestamp.toLocaleString()}` + this.escpos.newLine();
    receipt += this.escpos.separator('=');
    
    // Items
    receipt += this.escpos.bold(true);
    receipt += this.padLine('ITEM', 'QTY', 'PRICE', 'TOTAL', width) + this.escpos.newLine();
    receipt += this.escpos.bold(false);
    receipt += this.escpos.separator('-');
    
    data.items.forEach(item => {
      // Item name (may wrap to next line if too long)
      const maxNameWidth = width - 15; // Reserve space for qty, price, total
      let itemName = item.name;
      if (itemName.length > maxNameWidth) {
        itemName = itemName.substring(0, maxNameWidth - 3) + '...';
      }
      
      receipt += this.padLine(
        itemName,
        item.quantity.toString(),
        `$${item.price.toFixed(2)}`,
        `$${item.total.toFixed(2)}`,
        width
      ) + this.escpos.newLine();
    });
    
    receipt += this.escpos.separator('-');
    
    // Totals
    receipt += this.escpos.alignRight();
    receipt += `Subtotal: $${data.subtotal.toFixed(2)}` + this.escpos.newLine();
    
    if (data.tax && data.tax > 0) {
      receipt += `Tax: $${data.tax.toFixed(2)}` + this.escpos.newLine();
    }
    
    if (data.loyaltyPointsUsed && data.loyaltyPointsUsed > 0) {
      receipt += `Loyalty Discount: -$${(data.loyaltyPointsUsed * 0.01).toFixed(2)}` + this.escpos.newLine();
    }
    
    receipt += this.escpos.bold(true);
    receipt += `TOTAL: $${data.total.toFixed(2)}` + this.escpos.newLine();
    receipt += this.escpos.bold(false);
    receipt += this.escpos.newLine();
    
    // Payment info
    receipt += `Payment: ${data.paymentMethod}` + this.escpos.newLine();
    if (data.amountTendered) {
      receipt += `Tendered: $${data.amountTendered.toFixed(2)}` + this.escpos.newLine();
    }
    if (data.change) {
      receipt += `Change: $${data.change.toFixed(2)}` + this.escpos.newLine();
    }
    
    // Loyalty points
    if (data.loyaltyPointsEarned) {
      receipt += this.escpos.newLine();
      receipt += this.escpos.alignCenter();
      receipt += `Points Earned: ${data.loyaltyPointsEarned}` + this.escpos.newLine();
    }
    
    // IL Tobacco Tax Notice (as required)
    receipt += this.escpos.feed(2);
    receipt += this.escpos.alignCenter();
    receipt += this.escpos.bold(true);
    receipt += this.escpos.fontSize('normal');
    receipt += '45% IL Tobacco Exercise Tax' + this.escpos.newLine();
    receipt += 'Paid On All Tobacco Products' + this.escpos.newLine();
    receipt += this.escpos.bold(false);
    receipt += this.escpos.feed(2);
    
    // Footer
    receipt += 'Thank you for your business!' + this.escpos.newLine();
    receipt += this.escpos.feed(3);
    
    // Cut paper
    receipt += this.escpos.cut();
    
    return receipt;
  }

  /**
   * Helper to pad text into columns
   */
  private padLine(col1: string, col2: string, col3: string, col4: string, totalWidth: number): string {
    const col2Width = 4;
    const col3Width = 8;
    const col4Width = 10;
    const col1Width = totalWidth - col2Width - col3Width - col4Width;
    
    return col1.padEnd(col1Width).substring(0, col1Width) +
           col2.padStart(col2Width).substring(0, col2Width) +
           col3.padStart(col3Width).substring(0, col3Width) +
           col4.padStart(col4Width).substring(0, col4Width);
  }

  /**
   * Print receipt using available methods
   */
  async printReceipt(data: ReceiptData): Promise<{ success: boolean; method: string; error?: string }> {
    try {
      const receiptContent = this.formatReceipt(data);
      
      // Method 1: Try Windows printer (with installed drivers)
      if (await this.tryDirectPrint(receiptContent)) {
        return { success: true, method: 'Windows Driver' };
      }
      
      // Method 2: Try Web Serial API (Chrome 89+) 
      if (await this.trySerialPrint(receiptContent)) {
        return { success: true, method: 'Web Serial' };
      }
      
      // Method 3: Generate downloadable receipt file
      this.downloadReceiptFile(receiptContent, data.orderId);
      return { success: true, method: 'Download' };
      
    } catch (error) {
      console.error('Print failed:', error);
      return { 
        success: false, 
        method: 'none', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Open cash drawer only (without printing receipt)
   */
  async openCashDrawer(): Promise<{ success: boolean; method: string; error?: string }> {
    try {
      // Method 1: Try OPOS direct command through Windows
      if (await this.tryOPOSDrawer()) {
        return { success: true, method: 'OPOS Driver' };
      }
      
      // Method 2: Try raw ESC/POS command via Web Serial
      if (await this.tryRawDrawerCommand()) {
        return { success: true, method: 'Direct ESC/POS' };
      }
      
      // Method 3: Create invisible minimal print job with only drawer command
      if (await this.tryMinimalDrawerPrint()) {
        return { success: true, method: 'Minimal Print' };
      }
      
      // Fallback: show manual instruction
      this.showDrawerInstruction();
      return { success: true, method: 'Manual' };
      
    } catch (error) {
      return { 
        success: false, 
        method: 'none', 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Try OPOS drawer command (Windows drivers) - TM-T88V Model M244A specific
   */
  private async tryOPOSDrawer(): Promise<boolean> {
    try {
      // Method 1: Try direct OPOS ActiveX if available
      if ((window as any).external && (window as any).external.OPOS) {
        const opos = (window as any).external.OPOS;
        await opos.OpenCashDrawer();
        return true;
      }

      // Method 2: Try Windows COM object for EPSON OPOS
      try {
        const oposControl = new (window as any).ActiveXObject('OPOS.POSPrinter');
        if (oposControl) {
          oposControl.Open('EPSON TM-T88V Receipt');
          oposControl.ClaimDevice(1000);
          oposControl.DeviceEnabled = true;
          // Send drawer kick command
          oposControl.PrintNormal(0, '\x1B\x70\x00\x37\x37');
          oposControl.ReleaseDevice();
          oposControl.Close();
          return true;
        }
      } catch (e) {
        console.log('ActiveX OPOS not available:', e);
      }

      // Method 3: Try local hardware bridge (TM-T88V MMF Bridge)
      try {
        console.log('🔓 Attempting local hardware bridge (localhost:8080)...');
        const response = await fetch('http://localhost:8080/drawer/open', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ hardware: 'TM-T88V', model: 'M244A' })
        });
        
        const result = await response.json();
        console.log('🔓 Local bridge cash drawer response:', result);
        
        if (response.ok && result.success) {
          // Also log to server for tracking
          this.logDrawerAction('success', 'local_bridge', result.method);
          return true;
        } else {
          console.log('❌ Local bridge drawer command failed:', result.message || result.error);
        }
      } catch (e) {
        console.log('❌ Local bridge connection failed - is TM-T88V-MMF-Bridge.js running?', e);
      }

      return false;
    } catch {
      return false;
    }
  }

  /**
   * Try raw ESC/POS drawer command via Web Serial (TM-T88V + APG MMF optimized)
   */
  private async tryRawDrawerCommand(): Promise<boolean> {
    try {
      if (!('serial' in navigator)) {
        return false;
      }
      
      // TM-T88V + APG MMF drawer command (based on RockGymPro guide)
      // ESC p pin pulse1 pulse2 - optimized for APG 4000 MMF drawer
      const drawerCommand = this.config.cashdrawerPin === 'pin5' ? 
        '\x1B\x70\x01\x64\x64' :  // Pin 5 with 100ms pulse (longer for MMF)
        '\x1B\x70\x00\x64\x64';   // Pin 2 with 100ms pulse (default for MMF)
      
      const ports = await (navigator as any).serial.getPorts();
      if (ports.length === 0) return false;
      
      const port = ports[0];
      await port.open({ baudRate: 9600 });
      
      const writer = port.writable.getWriter();
      const encoder = new TextEncoder();
      await writer.write(encoder.encode(drawerCommand));
      writer.releaseLock();
      await port.close();
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Try direct Windows OPOS cash drawer command (TM-T88V specific)
   */
  private async tryMinimalDrawerPrint(): Promise<boolean> {
    try {
      // For TM-T88V Model M244A with MMF drawer, send direct OPOS command
      // Create a completely empty print job that only contains the ESC/POS drawer command
      
      const printFrame = document.createElement('iframe');
      printFrame.style.cssText = `
        position: absolute; 
        top: -1000px; 
        left: -1000px; 
        width: 1px; 
        height: 1px; 
        border: none; 
        visibility: hidden;
      `;
      document.body.appendChild(printFrame);
      
      const frameDoc = printFrame.contentDocument || printFrame.contentWindow?.document;
      if (!frameDoc) return false;
      
      // TM-T88V + APG MMF drawer kick command (from RockGymPro guide)
      const drawerCommand = '\x1B\x70\x00\x64\x64'; // ESC p 0 100 100 (100ms pulse for MMF)
      
      frameDoc.open();
      frameDoc.write(`
        <html>
          <head>
            <style>
              @page { margin: 0; size: 1mm 1mm; }
              body { margin: 0; padding: 0; font-size: 1px; }
              .cmd { position: absolute; top: -100px; left: -100px; }
            </style>
          </head>
          <body>
            <div class="cmd">${drawerCommand}</div>
          </body>
        </html>
      `);
      frameDoc.close();
      
      // Print and cleanup
      setTimeout(() => {
        printFrame.contentWindow?.print();
        setTimeout(() => {
          document.body.removeChild(printFrame);
        }, 2000);
      }, 500);
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Direct Windows printer connection
   */
  private async tryDirectPrint(content: string): Promise<boolean> {
    try {
      // Use browser's print API with Windows driver
      const printWindow = window.open('', '_blank');
      if (!printWindow) return false;
      
      // Format content for Windows printing
      const printContent = content
        .replace(/\x1B\x40/g, '') // Remove ESC/POS init
        .replace(/\x1B\x45\x01/g, '<b>') // Bold on
        .replace(/\x1B\x45\x00/g, '</b>') // Bold off
        .replace(/\x1B\x61\x01/g, '<center>') // Center align
        .replace(/\x1B\x61\x00/g, '</center>') // Left align
        .replace(/\x0A/g, '<br>') // Line feeds
        .replace(/\x1D\x56\x42\x00/g, ''); // Remove cut command
      
      printWindow.document.write(`
        <html>
          <head><title>Receipt Print</title></head>
          <body style="font-family: monospace; font-size: 10px; margin: 0; white-space: pre-wrap;">
            ${printContent}
          </body>
        </html>
      `);
      printWindow.document.close();
      
      // Auto-print after short delay
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Web Serial API printing (Chrome 89+)
   */
  private async trySerialPrint(content: string): Promise<boolean> {
    try {
      if (!('serial' in navigator)) {
        return false;
      }
      
      // Request serial port (user must grant permission)
      const port = await (navigator as any).serial.requestPort();
      await port.open({ baudRate: 9600 });
      
      const writer = port.writable.getWriter();
      const encoder = new TextEncoder();
      await writer.write(encoder.encode(content));
      writer.releaseLock();
      await port.close();
      
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Download receipt as text file (fallback)
   */
  private downloadReceiptFile(content: string, orderId: number): void {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `receipt-${orderId}-${Date.now()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Log drawer action to server for tracking
   */
  private async logDrawerAction(status: 'success' | 'failure', method: string, details?: string): Promise<void> {
    try {
      const authToken = localStorage.getItem('pos_auth_token');
      await fetch('/api/pos/log-drawer-action', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        },
        body: JSON.stringify({ 
          status, 
          method, 
          details,
          timestamp: new Date().toISOString(),
          hardware: 'TM-T88V MMF'
        })
      });
    } catch (e) {
      console.log('Failed to log drawer action:', e);
    }
  }

  /**
   * Show manual cash drawer instruction with bridge setup help
   */
  private showDrawerInstruction(): void {
    const instruction = document.createElement('div');
    instruction.style.cssText = `
      position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
      background: #fff; border: 2px solid #333; padding: 20px; z-index: 9999;
      font-family: monospace; text-align: left; box-shadow: 0 4px 20px rgba(0,0,0,0.3);
      max-width: 500px; line-height: 1.4;
    `;
    instruction.innerHTML = `
      <h3 style="text-align: center; margin-top: 0;">Cash Drawer Setup Required</h3>
      <ol style="margin: 15px 0;">
        <li><strong>Start the hardware bridge:</strong><br>
            • Open Command Prompt as Administrator<br>
            • Navigate to project folder<br>
            • Run: <code>node TM-T88V-MMF-Bridge.js</code></li>
        <li><strong>Verify hardware connections:</strong><br>
            • TM-T88V printer connected via USB<br>
            • MMF cash drawer connected to printer<br>
            • Printer powered on</li>
        <li><strong>Test the bridge:</strong><br>
            • Visit: <a href="http://localhost:8080/health" target="_blank">localhost:8080/health</a><br>
            • Should show "TM-T88V + MMF" status</li>
      </ol>
      <p><em>For manual opening, use the drawer key or manual button.</em></p>
      <div style="text-align: center; margin-top: 15px;">
        <button onclick="this.parentElement.remove()" style="padding: 8px 16px; margin-right: 10px;">Done</button>
        <button onclick="window.open('http://localhost:8080/health', '_blank')" style="padding: 8px 16px;">Test Bridge</button>
      </div>
    `;
    document.body.appendChild(instruction);
  }

  /**
   * Test printer connection
   */
  async testPrinter(): Promise<{ success: boolean; message: string }> {
    try {
      const testContent = this.escpos.init() + 
                         this.escpos.alignCenter() + 
                         this.escpos.bold(true) + 
                         'PRINTER TEST' + this.escpos.newLine() + 
                         this.escpos.bold(false) + 
                         `Date: ${new Date().toLocaleString()}` + this.escpos.newLine() + 
                         this.escpos.separator('=') + 
                         'If you can read this,' + this.escpos.newLine() + 
                         'your printer is working!' + this.escpos.newLine() + 
                         this.escpos.feed(3) + 
                         this.escpos.cut();
      
      const result = await this.printRaw(testContent);
      return result.success ? 
        { success: true, message: `Test printed via ${result.method}` } :
        { success: false, message: result.error || 'Test failed' };
        
    } catch (error) {
      return { 
        success: false, 
        message: error instanceof Error ? error.message : 'Test failed' 
      };
    }
  }

  /**
   * Print raw ESC/POS content
   */
  private async printRaw(content: string): Promise<{ success: boolean; method: string; error?: string }> {
    if (await this.tryDirectPrint(content)) {
      return { success: true, method: 'direct' };
    }
    
    if (await this.trySerialPrint(content)) {
      return { success: true, method: 'serial' };
    }
    
    return { success: false, method: 'none', error: 'No connection available' };
  }
}

// Export singleton instance
export const printerService = new PrinterService();
export default PrinterService;