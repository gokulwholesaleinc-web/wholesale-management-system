// Legacy Invoice Generator - Backup of Original Implementation
// This is the original invoice generator that was in use before the enhanced version

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import gokulLogo from "@assets/IMG_0846.png";

interface OrderItem {
  id: number;
  productId: number;
  quantity: number;
  price: number;
  createdAt: string | null;
  product?: { id: number; name: string; sku?: string; isTobaccoProduct?: boolean };
  productName?: string;
  flatTaxAmount?: number;
  totalTaxAmount?: number;
  flatTaxName?: string;
  isTobaccoProduct?: boolean;
}

interface Order {
  id: number;
  userId: string;
  total: number;
  orderType: "delivery" | "pickup" | string;
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
  loyaltyPointsEarned?: number;
  flatTaxBreakdown?: any[];
  calculationBreakdown?: any;
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    company: string | null;
    businessName?: string | null;
    username: string;
  };
  previousBalance?: number;
  creditAccountInfo?: { previousBalance?: number };
}

const getPaymentMethodLabel = (method: string): string => {
  const labels: Record<string, string> = {
    'cash': 'Cash',
    'check': 'Check',
    'credit_card': 'Credit Card',
    'on_account': 'On Account',
    'ach': 'ACH Transfer',
    'wire': 'Wire Transfer'
  };
  return labels[method] || method;
};

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
      
      doc.text(paymentText, 120, currentY);
    }
  }
  
  // Items table
  const tableStartY = currentY + 15;
  
  const tableColumns = ['Description', 'SKU', 'Qty', 'Price', 'Total'];
  const tableRows = order.items.map(item => [
    item.product?.name || item.productName || 'Product',
    item.product?.sku || 'N/A',
    String(item.quantity),
    `$${(item.price || 0).toFixed(2)}`,
    `$${((item.price || 0) * (item.quantity || 0)).toFixed(2)}`
  ]);

  autoTable(doc, {
    startY: tableStartY,
    head: [tableColumns],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [41, 128, 185],
      textColor: 255,
      fontStyle: 'bold'
    },
    styles: {
      fontSize: 9,
      cellPadding: 3
    },
    columnStyles: {
      0: { cellWidth: 80 },
      1: { cellWidth: 30 },
      2: { cellWidth: 20, halign: 'center' },
      3: { cellWidth: 25, halign: 'right' },
      4: { cellWidth: 25, halign: 'right' }
    }
  });

  const afterTableY = (doc as any).lastAutoTable.finalY + 10;

  // Calculate totals
  const itemsSubtotal = order.items.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 0), 0);
  
  // Flat tax total from items
  const flatTaxTotal = order.items.reduce((sum, item) => {
    const taxAmount = item.totalTaxAmount || item.flatTaxAmount || 0;
    return sum + (typeof taxAmount === 'number' ? taxAmount : 0);
  }, 0);

  const deliveryFee = order.deliveryFee || 0;
  const loyaltyDiscount = order.loyaltyPointsValue || 0;
  const finalTotal = order.total || 0;

  // Totals section
  const totalsStartX = 120;
  let totalsY = afterTableY;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Items subtotal
  doc.text('Items Subtotal:', totalsStartX, totalsY);
  doc.text(`$${itemsSubtotal.toFixed(2)}`, 190, totalsY, { align: 'right' });
  totalsY += 8;

  // Flat tax (if any)
  if (flatTaxTotal > 0) {
    doc.text('Flat Taxes:', totalsStartX, totalsY);
    doc.text(`$${flatTaxTotal.toFixed(2)}`, 190, totalsY, { align: 'right' });
    totalsY += 8;
  }

  // Delivery fee (if any)
  if (deliveryFee > 0) {
    doc.text('Delivery Fee:', totalsStartX, totalsY);
    doc.text(`$${deliveryFee.toFixed(2)}`, 190, totalsY, { align: 'right' });
    totalsY += 8;
  }

  // Loyalty discount (if any)
  if (loyaltyDiscount > 0) {
    doc.text(`Loyalty Discount:`, totalsStartX, totalsY);
    doc.text(`-$${loyaltyDiscount.toFixed(2)}`, 190, totalsY, { align: 'right' });
    totalsY += 8;
  }

  // Line separator
  doc.setLineWidth(0.5);
  doc.line(totalsStartX, totalsY, 190, totalsY);
  totalsY += 8;

  // Final total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Total:', totalsStartX, totalsY);
  doc.text(`$${finalTotal.toFixed(2)}`, 190, totalsY, { align: 'right' });

  // Loyalty points earned (if any)
  if (order.loyaltyPointsEarned) {
    totalsY += 15;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(34, 139, 34);
    doc.text(`Loyalty Points Earned: ${order.loyaltyPointsEarned}`, totalsStartX, totalsY);
    doc.setTextColor(0, 0, 0);
  }

  // Notes section (if any)
  if (order.notes || order.adminNote || order.deliveryNote || order.pickupNote) {
    totalsY += 20;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('Notes:', 20, totalsY);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    
    const allNotes = [
      order.notes && `Order Notes: ${order.notes}`,
      order.adminNote && `Admin Notes: ${order.adminNote}`,
      order.deliveryNote && `Delivery Notes: ${order.deliveryNote}`,
      order.pickupNote && `Pickup Notes: ${order.pickupNote}`
    ].filter(Boolean);

    allNotes.forEach((note, index) => {
      totalsY += 8;
      doc.text(note!, 20, totalsY);
    });
  }

  // Footer with tobacco tax notice
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(255, 140, 0);
  
  // Tobacco tax compliance box
  doc.setDrawColor(255, 140, 0);
  doc.setLineWidth(1);
  doc.rect(20, pageHeight - 25, 100, 12);
  doc.text('45% IL TOBACCO TAX PAID', 70, pageHeight - 18, { align: 'center' });
  
  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for your business!', 105, pageHeight - 8, { align: 'center' });

  return doc;
};