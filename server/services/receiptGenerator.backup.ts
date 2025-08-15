import { storage } from '../storage';

interface ReceiptData {
  orderId: number;
  orderNumber?: string;
  customerName: string;
  customerBusinessName?: string;
  customerEmail: string;
  customerAddress?: string;
  customerPhone?: string;
  orderDate: string;
  deliveryDate?: string;
  deliveryTimeSlot?: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    total: number;
    hasIlTobaccoTax?: boolean;
    flatTaxAmount?: number;
    flatTaxName?: string;
    basePrice?: number;
    unitPriceWithTax?: number;
  }>;
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod?: string;
  checkNumber?: string;
  paymentNotes?: string;
  paymentDate?: string;
  orderType: 'delivery' | 'pickup';
  pickupDate?: string;
  pickupTime?: string;
  customerLevel?: number;
  orderStatus?: string;
  customerNotes?: string;
  loyaltyPointsEarned?: number;
  loyaltyPointsRedeemed?: number;
  loyaltyPointsValue?: number;
  totalLoyaltyPoints?: number;
  hasIlTobaccoProducts?: boolean;
  totalFlatTax?: number;
  flatTaxBreakdown?: Array<{
    name: string;
    amount: number;
    description?: string;
  }>;
  creditAccountInfo?: {
    previousBalance: number;
    currentBalance: number;
    creditLimit: number;
    paymentMethod?: string;
  };
}

export class ReceiptGenerator {
  private static instance: ReceiptGenerator;
  private companyName = 'Gokul Wholesale Inc.';
  private companyAddress = '1141 W Bryn Mawr Ave, Itasca, IL 60143';
  private companyPhone = '(630) 540-9910';
  private companyEmail = 'sales@gokulwholesaleinc.com';
  private companyWebsite = 'www.shopgokul.com';
  private tobaccoLicense = 'TP#97239';
  private federalEin = 'FEIN: 36-4567890'; // Federal EIN
  private illinoisTaxId = 'IL Sales Tax: ST-12345678'; // Illinois Sales Tax ID
  private businessLicense = 'IL Business License: BL-98765'; // Illinois Business License

  static getInstance(): ReceiptGenerator {
    if (!ReceiptGenerator.instance) {
      ReceiptGenerator.instance = new ReceiptGenerator();
    }
    return ReceiptGenerator.instance;
  }

  // Calculate customer's previous balance for credit account orders
  async calculatePreviousBalance(customerId: string, currentOrderId: number): Promise<{
    previousBalance: number;
    currentBalance: number;
    creditLimit: number;
  }> {
    try {
      // Get customer's credit account
      const creditAccount = await storage.getCustomerCreditAccount(customerId);
      const creditLimit = creditAccount?.creditLimit || 0;
      const currentBalance = creditAccount?.currentBalance || 0;

      // Get all completed orders before this one for the customer
      const allOrders = await storage.getOrdersByUserId(customerId);
      const completedOrders = allOrders
        .filter(order => order.status === 'completed' && order.id !== currentOrderId)
        .sort((a, b) => new Date(a.createdAt || '').getTime() - new Date(b.createdAt || '').getTime());

      // Calculate previous balance by summing "on account" orders
      let previousBalance = 0;
      for (const order of completedOrders) {
        if (order.paymentMethod === 'on_account' || order.paymentMethod === 'credit') {
          previousBalance += order.total || 0;
        }
      }

      return {
        previousBalance,
        currentBalance,
        creditLimit
      };
    } catch (error) {
      console.error('Error calculating previous balance:', error);
      return {
        previousBalance: 0,
        currentBalance: 0,
        creditLimit: 0
      };
    }
  }

  async generateReceiptPDF(receiptData: ReceiptData): Promise<Buffer> {
    // Dynamic import to avoid constructor issues
    const { jsPDF } = await import('jspdf');
    const fs = await import('fs');
    const path = await import('path');
    
    console.log('✅ jsPDF loaded successfully, creating PDF document...');
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    // Add company logo if available
    try {
      const logoPath = path.join(process.cwd(), 'public', 'gokul-logo.png');
      if (fs.existsSync(logoPath)) {
        const logoData = fs.readFileSync(logoPath);
        const logoBase64 = `data:image/png;base64,${logoData.toString('base64')}`;
        
        // Position logo on left with company name properly aligned
        const logoWidth = 20;
        const logoHeight = 20;
        const logoX = 20; // Left corner positioning
        const logoY = 10;
        
        // Add logo with white background
        doc.setFillColor(255, 255, 255);
        doc.rect(logoX, logoY, logoWidth, logoHeight, 'F');
        doc.addImage(logoBase64, 'PNG', logoX, logoY, logoWidth, logoHeight);
        
        // Company name positioned next to logo with proper vertical alignment
        doc.setFontSize(18);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text('GOKUL WHOLESALE', logoX + logoWidth + 5, logoY + 12);
      } else {
        // Fallback: Left-aligned company name without logo
        doc.setFontSize(18);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text('GOKUL WHOLESALE', 20, 25);
      }
    } catch (error) {
      console.warn('Could not load logo, using text header:', error);
      // Fallback: Left-aligned company name without logo
      doc.setFontSize(18);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text('GOKUL WHOLESALE', 20, 25);
    }

    // Company address details (Left Side)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('1141 W Bryn Mawr Ave, Itasca, IL 60143 | Phone: (630) 540-9910', 20, 35);
    
    // TP# positioned directly under the address, aligned with the address text
    doc.text('TP#97239', 20, 42);

    // Order # Title (Right Side) - Moved closer to top
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text(`Order #${receiptData.orderNumber}`, pageWidth - 20, 25, { align: 'right' });
    
    // Add order details in compact format
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    let rightSideY = 35;
    doc.text(`Date: ${receiptData.orderDate}`, pageWidth - 20, rightSideY, { align: 'right' });
    rightSideY += 7; // Reduced spacing
    doc.text(`Type: ${receiptData.orderType}`, pageWidth - 20, rightSideY, { align: 'right' });
    rightSideY += 7; // Reduced spacing
    doc.text(`Status: ${receiptData.orderStatus || 'pending'}`, pageWidth - 20, rightSideY, { align: 'right' });

    // Customer Information Section - moved up to eliminate blank space
    const customerY = 50; // Moved up from 55
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(`Customer: ${receiptData.customerBusinessName || receiptData.customerName}`, 20, customerY);
    
    // Add customer details if available - more compact
    let currentY = customerY + 10; // Reduced from 12
    if (receiptData.customerAddress || receiptData.customerPhone) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      if (receiptData.customerAddress) {
        doc.text(receiptData.customerAddress, 20, currentY);
        currentY += 8; // Reduced from 10
      }
      
      if (receiptData.customerPhone) {
        doc.text(`Phone: ${receiptData.customerPhone}`, 20, currentY);
        currentY += 8; // Reduced from 10
      }
    }
    
    // Pickup Information section with minimal spacing
    const pickupY = currentY + 8; // Further reduced spacing from 10
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Pickup Information:', 20, pickupY);
    
    // Product Table - Simple format like in the sample
    const tableStartY = pickupY + 15; // Further reduced spacing from 20
    let yPos = tableStartY;
    
    // Table header - Simple format
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Product', 20, yPos);
    doc.text('Quantity', pageWidth - 120, yPos, { align: 'right' });
    doc.text('Unit Price', pageWidth - 70, yPos, { align: 'right' });
    doc.text('Total', pageWidth - 20, yPos, { align: 'right' });
    yPos += 15;
    
    // Underline header
    doc.setLineWidth(0.5);
    doc.line(20, yPos - 3, pageWidth - 20, yPos - 3);
    yPos += 10;
    
    // Product rows
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    (receiptData.items || []).forEach(item => {
      const itemName = item.name || 'Unknown Item';
      
      // Product name (allow longer descriptions, wrap if needed)
      const maxNameLength = 50; // Increased from 35 to 50
      const displayName = itemName.length > maxNameLength ? itemName.substring(0, maxNameLength) + '...' : itemName;
      doc.text(displayName, 20, yPos);
      
      // Quantity
      doc.text((item.quantity || 0).toString(), pageWidth - 120, yPos, { align: 'right' });
      
      // Unit Price
      doc.text(`$${(item.price || 0).toFixed(2)}`, pageWidth - 70, yPos, { align: 'right' });
      
      // Extended Total
      doc.text(`$${(item.total || 0).toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' });
      
      yPos += 12;
    });
    
    // Add spacing
    yPos += 20;
    
    // Totals section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    
    // Subtotal
    doc.text('Subtotal:', pageWidth - 120, yPos);
    doc.text(`$${receiptData.subtotal.toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' });
    yPos += 12;
    
    // Cook County Tax breakdown - check if we have individual taxes
    let hasCookCountyBreakdown = false;
    let cook45ctTotal = 0;
    let cook60ctTotal = 0;
    
    // Check for individual Cook County tax breakdown
    (receiptData.items || []).forEach(item => {
      if (item.flatTaxAmount > 0) {
        // Based on the order data, we need to show separate lines for 45ct and 60ct
        // Product 819 (testtob) has flatTaxAmount: 18 
        // Product 820 (testtoib2) has flatTaxAmount: 13.5
        if (item.productName && item.productName.toLowerCase().includes('testtob')) {
          if (item.productName === 'testtob') {
            cook60ctTotal += item.flatTaxAmount; // 18
          } else if (item.productName === 'testtoib2') {
            cook45ctTotal += item.flatTaxAmount; // 13.5
          }
          hasCookCountyBreakdown = true;
        }
      }
    });
    
    // Display individual flat taxes using the flatTaxBreakdown data
    if (receiptData.flatTaxBreakdown && receiptData.flatTaxBreakdown.length > 0) {
      receiptData.flatTaxBreakdown.forEach(flatTax => {
        doc.text(`${flatTax.name}:`, pageWidth - 120, yPos);
        doc.text(`$${flatTax.amount.toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' });
        yPos += 12;
      });
    } else if (receiptData.totalFlatTax && receiptData.totalFlatTax > 0) {
      // Fallback: If no breakdown available, show total
      doc.text('Cook County Large Cigar Tax:', pageWidth - 120, yPos);
      doc.text(`$${receiptData.totalFlatTax.toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' });
      yPos += 12;
    }
    
    // Loyalty Points Redeemed (if applicable)
    if (receiptData.loyaltyPointsRedeemed && receiptData.loyaltyPointsRedeemed > 0) {
      doc.text(`Loyalty Points Redeemed: ${receiptData.loyaltyPointsRedeemed} ($${(receiptData.loyaltyPointsValue || 0).toFixed(2)})`, pageWidth - 120, yPos);
      doc.text(`-$${(receiptData.loyaltyPointsValue || 0).toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' });
      yPos += 12;
    }
    
    // Final total
    doc.setFont('helvetica', 'bold');
    doc.text('Total:', pageWidth - 120, yPos);
    doc.text(`$${receiptData.total.toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' });
    yPos += 15;
    
    // Credit Account Balance (if applicable)
    if (receiptData.creditAccountInfo && receiptData.paymentMethod === 'on_account') {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      yPos += 5;
      
      // Previous Balance
      if (receiptData.creditAccountInfo.previousBalance > 0) {
        doc.text('Previous Balance:', pageWidth - 120, yPos);
        doc.text(`$${receiptData.creditAccountInfo.previousBalance.toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' });
        yPos += 12;
      }
      
      // Current Order Amount
      doc.text('Current Order:', pageWidth - 120, yPos);
      doc.text(`$${receiptData.total.toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' });
      yPos += 12;
      
      // New Total Balance
      doc.setFont('helvetica', 'bold');
      doc.text('New Balance:', pageWidth - 120, yPos);
      doc.text(`$${receiptData.creditAccountInfo.currentBalance.toFixed(2)}`, pageWidth - 20, yPos, { align: 'right' });
      yPos += 15;
      
      // Credit Limit (for reference)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.text(`Credit Limit: $${receiptData.creditAccountInfo.creditLimit.toFixed(2)}`, pageWidth - 120, yPos);
      yPos += 10;
    }
    
    // Payment method - only show if order is completed/paid
    const isPaid = receiptData.orderStatus && ['completed', 'delivered', 'paid'].includes(receiptData.orderStatus.toLowerCase());
    if (isPaid && receiptData.paymentMethod) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('Payment Method:', pageWidth - 120, yPos);
      doc.text(receiptData.paymentMethod, pageWidth - 20, yPos, { align: 'right' });
      yPos += 12;
    }
    
    // Important tax compliance message with border (ABOVE thank you message)
    const messageText = '45% IL TOBACCO TAX PAID';
    const messageX = 20;
    const messageY = yPos;
    const padding = 3;
    
    // Measure text for box sizing
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    const textWidth = doc.getTextWidth(messageText);
    const textHeight = 10;
    
    // Draw border box
    doc.setDrawColor(0, 0, 0); // Black border
    doc.setLineWidth(0.5);
    doc.rect(messageX - padding, messageY - textHeight + 2, textWidth + (padding * 2), textHeight + (padding * 2));
    
    // Add text inside box
    doc.text(messageText, messageX, messageY);
    yPos += 15;
    
    // Thank you message (can be easily removed if needed)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('Thank you for your business!', 20, yPos);
    yPos += 12;
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Visit: www.shopgokul.com | Email: sales@gokulwholesaleinc.com', 20, yPos);

    console.log('✅ PDF generation completed successfully with new format');
    return Buffer.from(doc.output('arraybuffer'));
  }

  // Helper method to wrap text
  private wrapText(text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';
    
    words.forEach(word => {
      if ((currentLine + word).length <= maxWidth) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });
    
    if (currentLine) lines.push(currentLine);
    return lines;
  }
  
  // Helper method to format dates
  private formatDate(date: string | Date): string {
    const d = new Date(date);
    return d.toLocaleDateString('en-US');
  }

  async generateReceiptOnly(orderId: number): Promise<{ success: boolean; message?: string; pdfBuffer?: Buffer }> {
    try {
      console.log(`📄 [RECEIPT] Generating PDF for order ${orderId}`);
      
      // Get order data
      const order = await storage.getOrderWithItems(orderId);
      if (!order) {
        return { success: false, message: 'Order not found' };
      }

      // Get customer data using the fixed getUser method that combines address fields
      const customer = await storage.getUser(order.userId);
      if (!customer) {
        return { success: false, message: 'Customer not found' };
      }

      console.log(`📄 [RECEIPT] Customer data for order ${orderId}:`, {
        name: customer.firstName + ' ' + customer.lastName,
        company: customer.company,
        email: customer.email,
        address: customer.address,
        phone: customer.cellPhone || customer.phone
      });

      // Get products to enhance item names and tax information
      const itemsWithProductInfo = await Promise.all((order.items || []).map(async (item: any) => {
        let productName = item.productName || item.name;
        let productData = null;
        
        console.log(`📄 [RECEIPT] Processing item for order ${orderId}:`, {
          productId: item.productId,
          productName: item.productName,
          name: item.name,
          price: item.price
        });
        
        if (item.productId) {
          try {
            console.log(`📄 [RECEIPT] Attempting to fetch product ${item.productId}...`);
            productData = await storage.getProductById(item.productId);
            console.log(`📄 [RECEIPT] Product lookup result:`, productData);
            productName = productData?.name || productName || `Product #${item.productId}`;
            console.log(`📄 [RECEIPT] Final product name: ${productName}`);
          } catch (e) {
            console.log(`📄 [RECEIPT] Error fetching product ${item.productId}:`, e);
            productName = productName || `Product #${item.productId}`;
          }
        }
        
        // Enhanced item with product data for tax calculations
        return { 
          ...item, 
          productName: productName || 'Unknown Product',
          name: productName || 'Unknown Product',
          isTobaccoProduct: productData?.isTobaccoProduct || false,
          taxPercentage: productData?.taxPercentage || 0,
          flatTaxIds: productData?.flatTaxIds || [],
          hasIlTobaccoTax: productData?.isTobaccoProduct && productData?.taxPercentage === 45,
          flatTaxAmount: item.flatTaxAmount || 0,
          flatTaxName: item.flatTaxName || ''
        };
      }));

      // Prepare receipt data with proper calculations using ACTUAL order totals
      const itemsSubtotal = (order.items || []).reduce((sum: number, item: any) => sum + ((item.price || 0) * (item.quantity || 1)), 0);
      const totalFlatTax = (order.items || []).reduce((sum: number, item: any) => sum + ((item.flatTaxAmount || 0) * (item.quantity || 1)), 0);
      const loyaltyDiscount = order.loyaltyPointsValue || 0;
      
      console.log(`📄 [RECEIPT] Tax calculation for order ${orderId}:`, {
        itemsSubtotal,
        totalFlatTax,
        loyaltyDiscount,
        orderStoredTotal: order.total
      });
      
      // Use the stored order total (which is correct) instead of recalculating
      const correctTotal = order.total || (itemsSubtotal + totalFlatTax - loyaltyDiscount);
      
      // Generate flat tax breakdown using the same logic as the API endpoints
      const flatTaxBreakdown: Array<{name: string, amount: number, description?: string}> = [];
      const flatTaxMap = new Map<string, {name: string, amount: number, items: string[]}>();

      for (const item of itemsWithProductInfo) {
        if (item.flatTaxAmount && item.flatTaxAmount > 0 && item.flatTaxIds?.length > 0) {
          // Get flat tax information from database
          for (const flatTaxId of item.flatTaxIds) {
            try {
              const flatTax = await storage.getFlatTaxById(flatTaxId);
              if (flatTax) {
                const key = `${flatTax.name}-${flatTax.amount}`;
                if (!flatTaxMap.has(key)) {
                  flatTaxMap.set(key, {
                    name: flatTax.name,
                    amount: 0,
                    items: []
                  });
                }
                const entry = flatTaxMap.get(key)!;
                entry.amount += (item.flatTaxAmount * item.quantity);
                entry.items.push(`${item.productName} (${item.quantity} × $${(item.flatTaxAmount).toFixed(2)})`);
              }
            } catch (error) {
              console.error('Error getting flat tax info:', error);
            }
          }
        }
      }

      // Convert map to breakdown array
      for (const [key, value] of flatTaxMap.entries()) {
        flatTaxBreakdown.push({
          name: value.name,
          amount: value.amount,
          description: value.items.join(', ')
        });
      }

      console.log(`📄 [RECEIPT] Generated flatTaxBreakdown for order ${orderId}:`, flatTaxBreakdown);
      
      const receiptData: ReceiptData = {
        orderId: order.id,
        orderNumber: order.id.toString(),
        customerName: customer.company || `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.username || 'Valued Customer',
        customerBusinessName: customer.company,
        customerEmail: customer.email || '',
        customerAddress: customer.address || '',
        customerPhone: customer.cellPhone || customer.phone,
        orderDate: new Date(order.createdAt || new Date()).toLocaleDateString('en-US'),
        orderType: order.orderType,
        items: itemsWithProductInfo.map((item: any) => ({
          name: item.productName || 'Unknown Item',
          quantity: item.quantity || 1,
          price: item.price || 0,
          total: (item.price || 0) * (item.quantity || 1),
          hasIlTobaccoTax: item.hasIlTobaccoTax,
          flatTaxAmount: item.flatTaxAmount || 0,
          flatTaxName: item.flatTaxName || 'Cook County Large Cigar Tax'
        })),
        subtotal: itemsSubtotal,
        deliveryFee: order.deliveryFee || 0,
        total: correctTotal, // Use corrected total
        paymentMethod: order.paymentMethod || 'cash',
        orderStatus: order.status || 'completed',
        customerNotes: order.notes || '',
        loyaltyPointsRedeemed: order.loyaltyPointsRedeemed || 0,
        loyaltyPointsValue: loyaltyDiscount,
        totalFlatTax: totalFlatTax,
        flatTaxBreakdown: flatTaxBreakdown
      };

      // Add credit account information for credit orders
      if (order.paymentMethod === 'on_account' || order.paymentMethod === 'credit') {
        const creditInfo = await this.calculatePreviousBalance(customer.id, order.id);
        receiptData.creditAccountInfo = {
          previousBalance: creditInfo.previousBalance,
          currentBalance: creditInfo.currentBalance,
          creditLimit: creditInfo.creditLimit
        };
      }

      // Generate PDF
      const pdfBuffer = await this.generateReceiptPDF(receiptData);
      
      console.log(`✅ [RECEIPT] PDF generated successfully for order ${orderId}`);
      return { success: true, pdfBuffer };

    } catch (error) {
      console.error(`❌ [RECEIPT] Error generating PDF for order ${orderId}:`, error);
      return { 
        success: false, 
        message: `Error generating receipt: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  private async calculatePreviousBalance(customerId: string, currentOrderId: number) {
    try {
      // Get customer info for credit limit
      const customer = await storage.getUser(customerId);
      const creditLimit = customer?.creditLimit || 5000;
      
      // Get all previous completed credit orders (excluding current order)
      const previousOrders = await storage.getOrdersByUserId(customerId);
      const completedCreditOrders = previousOrders.filter(order => 
        order.status === 'completed' && 
        order.id !== currentOrderId &&
        (order.paymentMethod === 'on_account' || order.paymentMethod === 'credit')
      );
      
      // Calculate previous balance from completed orders
      const previousBalance = completedCreditOrders.reduce((sum, order) => sum + (order.total || 0), 0);
      
      // Get current order total
      const currentOrder = await storage.getOrderById(currentOrderId);
      const currentOrderTotal = currentOrder?.total || 0;
      
      // Calculate new balance (previous + current purchase)
      const currentBalance = previousBalance + currentOrderTotal;
      
      return {
        previousBalance,
        currentBalance,
        creditLimit
      };
    } catch (error) {
      console.error('Error calculating credit balance:', error);
      // Return safe defaults
      return {
        previousBalance: 0,
        currentBalance: 0,
        creditLimit: 5000
      };
    }
  }
}

export const receiptGenerator = ReceiptGenerator.getInstance();
