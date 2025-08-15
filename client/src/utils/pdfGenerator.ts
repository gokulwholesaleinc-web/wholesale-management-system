import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import gokulLogo from "@assets/IMG_0846.png";

interface OrderItem {
  id: number;
  productId: number;
  quantity: number;
  price: number;
  createdAt: string | null;
  product?: {
    id: number;
    name: string;
  };
  productName?: string;
  flatTaxAmount?: number;
  totalTaxAmount?: number;
}

interface Order {
  id: number;
  userId: string;
  total: number;
  orderType: string;
  deliveryDate: string | null;
  deliveryTimeSlot: string | null;
  deliveryFee: number | null;
  deliveryNote: string | null;
  pickupTimeSlot: string | null;
  pickupNote: string | null;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
  items: OrderItem[];
  deliveryAddressData?: any;
  paymentMethod?: string;
  checkNumber?: string;
  paymentDate?: string;
  paymentNotes?: string;
  notes?: string;
  adminNote?: string;
  loyaltyPointsRedeemed?: number;
  loyaltyPointsValue?: number;
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    company: string | null;
    businessName?: string | null;
    username: string;
  };
}

export const generateOrderPDF = (order: Order, customerName?: string) => {
  // Use provided customerName or derive from order user data
  const displayCustomerName = customerName || 
    (order.user?.company || order.user?.businessName) ||
    (order.user?.firstName && order.user?.lastName ? `${order.user.firstName} ${order.user.lastName}` : '') ||
    order.user?.username ||
    'Customer';
  const doc = new jsPDF();
  
  // Compact company header with logo
  try {
    // Smaller logo image
    doc.addImage(gokulLogo, 'PNG', 20, 10, 25, 25);
    
    // Company header next to logo - more compact
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Gokul Wholesale', 50, 20);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('1141 W Bryn Mawr Ave, Itasca, IL 60143 | Phone: (630) 540-9910', 50, 28);
    
    // Add tobacco license number in top right corner
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('TP#97239', 160, 32);
    
    // Order title on same line as company info
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Order #${order.id}`, 140, 20);
    
    // Thin line separator
    doc.setLineWidth(0.3);
    doc.line(20, 38, 190, 38);
  } catch (error) {
    console.warn('Could not load logo, using text header');
    // Fallback: Compact header without logo
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Gokul Wholesale', 20, 20);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('1141 W Bryn Mawr Ave, Itasca, IL 60143 | Phone: (630) 540-9910', 20, 28);
    
    // Add tobacco license number in top right corner (fallback layout)
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('TP#97239', 160, 32);
    
    // Order title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Order #${order.id}`, 140, 20);
    
    // Thin line separator
    doc.setLineWidth(0.3);
    doc.line(20, 33, 190, 33);
  }
  
  // Compact order details - all in one line where possible
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  
  const orderDate = order.createdAt ? new Date(order.createdAt).toLocaleDateString() : 'N/A';
  
  // First row - main order info
  doc.text(`Date: ${orderDate}`, 20, 48);
  doc.text(`Type: ${order.orderType === 'delivery' ? 'Delivery' : 'Pickup'}`, 80, 48);
  doc.text(`Status: ${order.status}`, 140, 48);
  
  // Second row - customer and payment info (only if needed)
  let currentY = 48;
  if (displayCustomerName || order.paymentMethod) {
    currentY += 10;
    if (displayCustomerName) {
      doc.text(`Customer: ${displayCustomerName}`, 20, currentY);
    }
    if (order.paymentMethod) {
      const paymentMethodLabel = getPaymentMethodLabel(order.paymentMethod);
      let paymentText = `Payment: ${paymentMethodLabel}`;
      
      // Add check number for check payments
      if (order.paymentMethod === 'check' && order.checkNumber) {
        paymentText += ` #${order.checkNumber}`;
      }
      
      doc.text(paymentText, displayCustomerName ? 110 : 20, currentY);
    }
  }
  
  // Set starting position for next section
  let yPos = currentY + 8;
  
  // Helper function to format payment method labels
  function getPaymentMethodLabel(method: string): string {
    switch (method) {
      case 'check':
        return 'Check Payment';
      case 'cash':
        return 'Cash Payment';
      case 'electronic':
        return 'Electronic Payment';
      default:
        return method || 'Payment processed at delivery';
    }
  }
  
  // Compact delivery/pickup information
  if (order.orderType === 'delivery' || order.orderType === 'pickup') {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(`${order.orderType === 'delivery' ? 'Delivery' : 'Pickup'} Information:`, 20, yPos);
    doc.setFont('helvetica', 'normal');
    yPos += 8;
    
    // Compact date/time info on one line
    if (order.orderType === 'delivery' && order.deliveryDate) {
      let deliveryInfo = `${new Date(order.deliveryDate).toLocaleDateString()}`;
      if (order.deliveryTimeSlot) deliveryInfo += ` | ${order.deliveryTimeSlot}`;
      doc.text(deliveryInfo, 20, yPos);
      yPos += 8;
    }
    
    if (order.orderType === 'pickup' && order.pickupTimeSlot) {
      doc.text(`Time: ${order.pickupTimeSlot}`, 20, yPos);
      yPos += 8;
    }
    
    // Compact address handling for delivery
    if (order.orderType === 'delivery') {
      let address = null;
      try {
        if (order.deliveryAddressData) {
          if (typeof order.deliveryAddressData === 'string') {
            address = JSON.parse(order.deliveryAddressData);
          } else {
            address = order.deliveryAddressData;
          }
        }
      } catch (error) {
        if (typeof order.deliveryAddressData === 'string') {
          address = { addressLine1: order.deliveryAddressData };
        }
      }
      
      if (address && (address.name || address.addressLine1 || address.street)) {
        // Show address in compact format
        const parts = [];
        if (address.name && address.name !== address.addressLine1) parts.push(address.name);
        if (address.street || address.addressLine1) parts.push(address.street || address.addressLine1);
        if (address.city) parts.push(address.city);
        if (address.state) parts.push(address.state);
        if (address.zipCode || address.postalCode) parts.push(address.zipCode || address.postalCode);
        
        // Split address into 2 lines max
        const addressText = parts.join(', ');
        if (addressText.length > 60) {
          const midPoint = addressText.indexOf(', ', addressText.length / 2);
          if (midPoint > 0) {
            doc.text(addressText.substring(0, midPoint), 20, yPos);
            yPos += 8;
            doc.text(addressText.substring(midPoint + 2), 20, yPos);
            yPos += 8;
          } else {
            doc.text(addressText, 20, yPos);
            yPos += 8;
          }
        } else {
          doc.text(addressText, 20, yPos);
          yPos += 8;
        }
      }
    }
  }
  
  // Add small space before items table
  yPos += 5;
  
  // Items table
  const tableData = order.items.map(item => [
    item.product?.name || item.productName || 'Product',
    item.quantity.toString(),
    `$${item.price.toFixed(2)}`,
    `$${(item.quantity * item.price).toFixed(2)}`
  ]);
  
  autoTable(doc, {
    startY: yPos,
    head: [['Product', 'Quantity', 'Unit Price', 'Total']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 9,
      cellPadding: 5
    },
    columnStyles: {
      1: { halign: 'center' },
      2: { halign: 'right' },
      3: { halign: 'right' }
    }
  });
  
  // Total section
  const finalY = (doc as any).lastAutoTable.finalY + 20;
  
  const subtotal = order.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  const deliveryFee = order.deliveryFee || 0;
  const cookCountyTax = order.items.reduce((sum, item) => sum + ((item.totalTaxAmount || item.flatTaxAmount || 0)), 0);
  const loyaltyPointsRedeemed = order.loyaltyPointsRedeemed || 0;
  const loyaltyPointsValue = order.loyaltyPointsValue || 0;
  const total = order.total;
  
  doc.setFont('helvetica', 'bold');
  let summaryY = finalY;
  doc.text(`Subtotal: $${subtotal.toFixed(2)}`, 140, summaryY);
  summaryY += 7;
  
  // Show Cook County tax if applicable
  if (cookCountyTax > 0) {
    doc.text(`Cook County Large Cigar Tax: $${cookCountyTax.toFixed(2)}`, 140, summaryY);
    summaryY += 7;
  }
  
  // Only show delivery fee for delivery orders with actual delivery fees
  if (order.orderType === 'delivery' && deliveryFee > 0) {
    doc.text(`Delivery Fee: $${deliveryFee.toFixed(2)}`, 140, summaryY);
    summaryY += 7;
  }
  
  // Always show loyalty points redemption (even if 0)
  if (loyaltyPointsRedeemed >= 0) {
    doc.text(`Loyalty Points Redeemed: ${loyaltyPointsRedeemed} ($${loyaltyPointsValue.toFixed(2)})`, 140, summaryY);
    summaryY += 7;
  }
  
  doc.text(`Total: $${total.toFixed(2)}`, 140, summaryY);
  
  // Notes section  
  let notesY = summaryY + 16;
  
  if (order.notes || order.adminNote) {
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Notes:', 20, notesY);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    notesY += 10;
    
    if (order.notes) {
      doc.text(`Customer Notes: ${order.notes}`, 20, notesY);
      notesY += 10;
    }
    
    if (order.adminNote) {
      doc.text(`Admin Notes: ${order.adminNote}`, 20, notesY);
      notesY += 10;
    }
  }
  
  // IL Tobacco Tax Notice (on all invoices)
  const pageHeight = doc.internal.pageSize.height;
  const tobaccoNoticeY = pageHeight - 35;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(220, 53, 69); // Red color for the tax notice
  
  // Add border around the tobacco tax notice
  const tobaccoNoticeText = '45% IL Tobacco Tax Paid';
  const textWidth = doc.getTextWidth(tobaccoNoticeText);
  const noticeX = (doc.internal.pageSize.width - textWidth) / 2;
  
  // Draw rectangle border around the notice
  doc.setDrawColor(220, 53, 69);
  doc.setLineWidth(0.5);
  doc.rect(noticeX - 5, tobaccoNoticeY - 8, textWidth + 10, 15);
  
  // Add the tobacco tax text
  doc.text(tobaccoNoticeText, doc.internal.pageSize.width / 2, tobaccoNoticeY, { align: 'center' });
  
  // Reset colors
  doc.setTextColor(0, 0, 0);
  doc.setDrawColor(0, 0, 0);
  
  // Footer
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for your business!', 20, pageHeight - 20);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 20, pageHeight - 15);
  
  return doc;
};

export const downloadOrderPDF = (order: Order, customerName?: string) => {
  const doc = generateOrderPDF(order, customerName);
  doc.save(`Order-${order.id}-${new Date().getTime()}.pdf`);
};