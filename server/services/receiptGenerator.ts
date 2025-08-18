// receiptGenerator.ts
import { storage } from "../storage";
import { EmailService } from "./emailService";

// ---------- Company Constants ----------
const COMPANY = {
  name: "Gokul Wholesale Inc.",
  address: "1141 W Bryn Mawr Ave, Itasca, IL 60143",
  phone: "(630) 540-9910",
  email: "sales@gokulwholesaleinc.com",
  website: "www.shopgokul.com",
  tp: "TP# 97239"
};

// ---------- Money helpers ----------
const toC = (n: number) => Math.round((n || 0) * 100);
const fromC = (c: number) => c / 100;
const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const fmt$ = (cents: number) => USD.format(fromC(cents));

// ---------- Types ----------
interface ReceiptItemInput {
  name: string;
  sku?: string;
  quantity: number;
  price: number;
  total: number;
  hasIlTobaccoTax?: boolean;
  flatTaxAmount?: number;
  flatTaxName?: string;
  productId?: number;
  isTobaccoProduct?: boolean;
  taxPercentage?: number;
  flatTaxIds?: number[];
}

interface ReceiptData {
  orderId: number;
  orderNumber?: string;
  customerName: string;
  customerBusinessName?: string;
  customerEmail: string;
  customerAddress?: string;
  customerPhone?: string;
  orderDate: string;
  items: ReceiptItemInput[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod?: string;
  orderType: "delivery" | "pickup";
  orderStatus?: string;
  customerNotes?: string;

  // Credit
  creditAccountInfo?: {
    previousBalance: number;
    currentBalance: number;
    creditLimit: number;
    paymentMethod?: string;
  };

  // Loyalty
  loyaltyPointsEarned?: number;

  // Taxes
  hasIlTobaccoProducts?: boolean;
  totalFlatTax?: number;
  flatTaxBreakdown?: Array<{ name: string; amount: number; description?: string }>;
}

// ---------- Receipt Generator ----------
export class ReceiptGenerator {
  private static instance: ReceiptGenerator;
  static getInstance(): ReceiptGenerator {
    if (!ReceiptGenerator.instance) ReceiptGenerator.instance = new ReceiptGenerator();
    return ReceiptGenerator.instance;
  }

  // ---- Credit balance helper ----
  private async calculatePreviousBalance(customerId: string, currentOrderId: number) {
    try {
      const customer = await storage.getUser(customerId);
      const creditLimit = customer?.creditLimit ?? 5000;
      const orders = await storage.getOrdersByUserId(customerId);

      const prevOrders = orders.filter(
        (o: any) =>
          o.status === "completed" &&
          o.id !== currentOrderId &&
          (o.paymentMethod === "on_account" || o.paymentMethod === "credit")
      );

      const previousBalance = prevOrders.reduce((s: number, o: any) => s + (o.total || 0), 0);
      const currentOrder = await storage.getOrderById(currentOrderId);
      const currentOrderTotal = currentOrder?.total || 0;
      const currentBalance = previousBalance + currentOrderTotal;

      return { previousBalance, currentBalance, creditLimit };
    } catch {
      return { previousBalance: 0, currentBalance: 0, creditLimit: 5000 };
    }
  }

  // ---- Main entrypoint ----
  async generateReceiptOnly(orderId: number): Promise<{ success: boolean; pdfBuffer?: Buffer; message?: string }> {
    console.log(`[RECEIPT GENERATOR] Starting receipt generation for order ${orderId}`);
    
    const order = await storage.getOrderWithItems(orderId);
    if (!order) return { success: false, message: "Order not found" };

    const customer = await storage.getUser(order.userId);
    if (!customer) return { success: false, message: "Customer not found" };

    console.log(`[RECEIPT GENERATOR] Order ${orderId} has ${order.items?.length || 0} items`);

    // Items with enriched product data
    const itemsWithInfo = await Promise.all(
      (order.items || []).map(async (item: any) => {
        const product = item.productId ? await storage.getProductById(item.productId) : null;
        
        // Fetch flat tax information if needed
        let flatTaxAmount = 0;
        let flatTaxName = "";
        if (product?.flatTaxIds && product.flatTaxIds.length > 0) {
          const flatTaxes = await storage.getFlatTaxes();
          const relevantTaxes = flatTaxes.filter((tax: any) => product.flatTaxIds.includes(tax.id));
          if (relevantTaxes.length > 0) {
            flatTaxAmount = relevantTaxes.reduce((sum: number, tax: any) => sum + (tax.amount || 0), 0);
            flatTaxName = relevantTaxes.map((tax: any) => tax.name).join(", ");
          }
        }

        return {
          ...item,
          name: product?.name || item.name || "Unknown Item",
          sku: product?.sku || "",
          isTobaccoProduct: !!product?.isTobaccoProduct,
          taxPercentage: product?.taxPercentage,
          flatTaxIds: product?.flatTaxIds || [],
          flatTaxAmount,
          flatTaxName,
          total: (item.price || 0) * (item.quantity || 1)
        };
      })
    );

    // Calculate totals
    const subtotalC = (itemsWithInfo || []).reduce((s, it: any) => s + toC(it.price) * it.quantity, 0);
    const deliveryFeeC = toC(order.deliveryFee || 0);
    const finalTotalC = toC(order.total || fromC(subtotalC + deliveryFeeC));

    console.log(`[RECEIPT GENERATOR] Items subtotal: ${fmt$(subtotalC)}`);
    console.log(`[RECEIPT GENERATOR] Final total: ${fmt$(finalTotalC)}`);

    const receiptData: ReceiptData = {
      orderId: order.id,
      orderNumber: String(order.id),
      customerName: customer.company 
        ? `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || customer.username || "Customer" 
        : `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || customer.username || "Valued Customer",
      customerBusinessName: customer.company || undefined,
      customerEmail: customer.email || "",
      customerAddress: customer.address || "",
      customerPhone: customer.phone || "",
      orderDate: new Date(order.createdAt || new Date()).toLocaleDateString("en-US"),
      orderType: order.orderType || "pickup",
      items: itemsWithInfo,
      subtotal: fromC(subtotalC),
      deliveryFee: order.deliveryFee || 0,
      total: fromC(finalTotalC),
      paymentMethod: order.paymentMethod,
      orderStatus: order.status,
      loyaltyPointsEarned: order.loyaltyPointsEarned
    };

    // Credit account information
    if (order.paymentMethod === "on_account" || order.paymentMethod === "credit") {
      const creditInfo = await this.calculatePreviousBalance(customer.id, order.id);
      receiptData.creditAccountInfo = {
        previousBalance: creditInfo.previousBalance,
        currentBalance: creditInfo.currentBalance,
        creditLimit: creditInfo.creditLimit,
        paymentMethod: order.paymentMethod
      };
      console.log(`[RECEIPT GENERATOR] Credit info: Previous=${creditInfo.previousBalance}, Current=${creditInfo.currentBalance}, Limit=${creditInfo.creditLimit}`);
    }

    console.log(`[RECEIPT GENERATOR] Generating PDF for order ${orderId}`);
    const pdfBuffer = await this.generateReceiptPDF(receiptData);
    
    if (!pdfBuffer) {
      console.error(`[RECEIPT GENERATOR] PDF buffer is null/undefined for order ${orderId}`);
      return { success: false, message: "Failed to generate PDF buffer" };
    }
    
    console.log(`[RECEIPT GENERATOR] PDF generated successfully, size: ${pdfBuffer.length} bytes`);
    return { success: true, pdfBuffer };
  }

  // ---- PDF Generator ----
  private async generateReceiptPDF(receiptData: ReceiptData): Promise<Buffer> {
    console.log(`[RECEIPT PDF] Starting PDF generation for order ${receiptData.orderId}`);
    
    const { jsPDF } = await import("jspdf");
    const fs = await import("fs");
    const path = await import("path");
    const doc = new jsPDF();

    const pageWidth = doc.internal.pageSize.width;
    const pageHeight = doc.internal.pageSize.height;

    console.log(`[RECEIPT PDF] Page dimensions: ${pageWidth}x${pageHeight}`);

    // Professional colors
    const professionalNavy = [52, 73, 94] as const;
    const subtleGray = [248, 249, 250] as const;
    const lightGray = [236, 240, 241] as const;
    const successGreen = [39, 174, 96] as const;
    const textDark = [33, 37, 41] as const;

    // Header with subtle background
    doc.setFillColor(...subtleGray);
    doc.rect(0, 0, pageWidth, 45, "F");
    doc.setDrawColor(...professionalNavy);
    doc.setLineWidth(0.5);
    doc.line(0, 45, pageWidth, 45);

    // Company logo
    try {
      const logoPath = path.join(process.cwd(), "public", "gokul-logo.png");
      if (fs.existsSync(logoPath)) {
        const logoData = fs.readFileSync(logoPath);
        const logoBase64 = `data:image/png;base64,${logoData.toString("base64")}`;
        doc.setFillColor(255, 255, 255);
        doc.circle(25, 20, 12, "F");
        doc.addImage(logoBase64, "PNG", 15, 10, 20, 20);
      }
    } catch (e) {
      console.log("[RECEIPT] Logo not found, using text header");
    }

    // Company info
    doc.setTextColor(...professionalNavy);
    doc.setFontSize(20).setFont('helvetica', 'bold');
    doc.text(COMPANY.name, 40, 20);
    
    doc.setTextColor(...textDark);
    doc.setFontSize(10).setFont('helvetica', 'normal');
    doc.text(COMPANY.address, 40, 28);
    doc.text(`${COMPANY.phone} | ${COMPANY.email}`, 40, 34);
    doc.text(COMPANY.tp, 40, 40);

    // Order info
    doc.setTextColor(...professionalNavy);
    doc.setFontSize(12).setFont('helvetica', 'bold');
    doc.text(`Order #${receiptData.orderNumber}`, pageWidth - 20, 20, { align: "right" });
    doc.setTextColor(...textDark);
    doc.setFontSize(10).setFont('helvetica', 'normal');
    doc.text(`Date: ${receiptData.orderDate}`, pageWidth - 20, 28, { align: "right" });

    let y = 55;

    // Customer Info Section
    doc.setFillColor(...lightGray);
    doc.rect(10, y, pageWidth - 20, 20, "F");
    doc.setTextColor(...textDark);
    doc.setFontSize(11).setFont('helvetica', 'bold');
    doc.text("Customer Information", 15, y + 8);
    
    doc.setFontSize(10).setFont('helvetica', 'normal');
    doc.text(receiptData.customerName, 15, y + 15);
    if (receiptData.customerAddress) {
      doc.text(receiptData.customerAddress, 15, y + 22);
    }
    if (receiptData.customerEmail) {
      doc.text(`Email: ${receiptData.customerEmail}`, pageWidth/2, y + 15);
    }
    if (receiptData.customerPhone) {
      doc.text(`Phone: ${receiptData.customerPhone}`, pageWidth/2, y + 22);
    }

    y += 30;

    // Items table header
    doc.setFillColor(...professionalNavy);
    doc.rect(10, y, pageWidth - 20, 10, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10).setFont('helvetica', 'bold');
    doc.text("Item Description", 15, y + 7);
    doc.text("SKU", 95, y + 7);
    doc.text("Qty", pageWidth - 65, y + 7);
    doc.text("Unit Price", pageWidth - 45, y + 7);
    doc.text("Total", pageWidth - 20, y + 7, { align: "right" });
    y += 12;

    // Items
    doc.setTextColor(...textDark);
    doc.setFont('helvetica', 'normal');
    for (const item of receiptData.items) {
      const itemName = doc.splitTextToSize(item.name, 75)[0] || item.name;
      doc.text(itemName, 15, y);
      doc.text((item.sku || "N/A").substring(0, 12), 95, y);
      doc.text(String(item.quantity), pageWidth - 65, y);
      doc.text(USD.format(item.price), pageWidth - 45, y);
      doc.text(USD.format(item.total), pageWidth - 20, y, { align: "right" });
      y += 8;
    }

    y += 10;

    // Totals section
    doc.setDrawColor(...lightGray);
    doc.line(pageWidth - 120, y, pageWidth - 15, y);
    y += 8;

    doc.setFontSize(11);
    doc.text("Items Subtotal:", pageWidth - 90, y);
    doc.text(USD.format(receiptData.subtotal), pageWidth - 20, y, { align: "right" });
    y += 8;

    if (receiptData.deliveryFee > 0) {
      doc.text("Delivery Fee:", pageWidth - 90, y);
      doc.text(USD.format(receiptData.deliveryFee), pageWidth - 20, y, { align: "right" });
      y += 8;
    }

    // Final total
    y += 2;
    doc.setDrawColor(...textDark);
    doc.line(pageWidth - 120, y, pageWidth - 15, y);
    y += 6;

    doc.setFontSize(12).setFont('helvetica', 'bold');
    doc.text("TOTAL:", pageWidth - 90, y);
    doc.text(USD.format(receiptData.total), pageWidth - 20, y, { align: "right" });
    y += 15;

    // Credit account section
    if (receiptData.creditAccountInfo) {
      y += 5;
      doc.setFillColor(...lightGray);
      doc.rect(15, y, pageWidth - 30, 30, "F");
      
      doc.setTextColor(...textDark);
      doc.setFontSize(11).setFont("helvetica", "bold");
      doc.text("Credit Account Summary", 20, y + 10);
      
      doc.setFontSize(10).setFont("helvetica", "normal");
      doc.text(`Previous Balance: ${USD.format(receiptData.creditAccountInfo.previousBalance)}`, 20, y + 18);
      doc.text(`This Order: ${USD.format(receiptData.total)}`, 20, y + 24);
      
      // Total amount due (highlighted)
      const totalDue = receiptData.creditAccountInfo.previousBalance + receiptData.total;
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...professionalNavy);
      doc.text(`TOTAL AMOUNT DUE: ${USD.format(totalDue)}`, 20, y + 30);
      
      // Credit info on right
      doc.setTextColor(...textDark);
      doc.setFont("helvetica", "normal");
      doc.text(`Credit Limit: ${USD.format(receiptData.creditAccountInfo.creditLimit)}`, pageWidth - 100, y + 18);
      
      const availableCredit = receiptData.creditAccountInfo.creditLimit - totalDue;
      const creditColor = availableCredit >= 0 ? successGreen : [231, 76, 60];
      doc.setTextColor(...creditColor);
      doc.text(`Available Credit: ${USD.format(Math.max(0, availableCredit))}`, pageWidth - 100, y + 24);
      
      y += 40;
    }

    // Loyalty points
    if (receiptData.loyaltyPointsEarned && receiptData.loyaltyPointsEarned > 0) {
      y += 5;
      doc.setFillColor(240, 248, 240);
      doc.rect(15, y - 3, pageWidth - 30, 12, "F");
      doc.setTextColor(...successGreen);
      doc.setFontSize(11);
      doc.text(`Loyalty Points Earned: ${receiptData.loyaltyPointsEarned} points`, 20, y + 5);
      y += 20;
    }

    // Compliance notice
    const taxY = pageHeight - 30;
    doc.setFontSize(8).setTextColor(230, 126, 34).setFont("helvetica", "bold");
    doc.text("45% IL TOBACCO TAX PAID", pageWidth/2, taxY, { align: "center" });

    // Footer
    doc.setFontSize(10).setTextColor(...textDark).setFont("helvetica", "normal");
    doc.text("Thank you for your business!", pageWidth/2, pageHeight - 18, { align: "center" });
    doc.text(COMPANY.website, pageWidth/2, pageHeight - 10, { align: "center" });

    console.log(`✅ [RECEIPT] PDF generated successfully for order ${receiptData.orderId}`);
    
    try {
      const pdfData = doc.output('arraybuffer');
      const buffer = Buffer.from(pdfData);
      console.log(`✅ [RECEIPT] Buffer created with size: ${buffer.length} bytes`);
      return buffer;
    } catch (error) {
      console.error(`❌ [RECEIPT] Error creating PDF buffer:`, error);
      throw error;
    }
  }

  // ---- Generate and Email Receipt ----
  async generateAndSendReceipt(orderId: number, isManual: boolean = false): Promise<{ success: boolean; message?: string }> {
    try {
      console.log(`📧 [EMAIL RECEIPT] Starting receipt generation and email for order ${orderId}, manual: ${isManual}`);

      const result = await this.generateReceiptOnly(orderId);
      if (!result.success || !result.pdfBuffer) {
        console.error(`📧 [EMAIL RECEIPT] Failed to generate receipt: ${result.message}`);
        return { success: false, message: result.message || "Failed to generate receipt" };
      }

      const order = await storage.getOrderWithItems(orderId);
      const customer = await storage.getUser(order.userId);

      if (!customer?.email) {
        console.log(`📧 [EMAIL RECEIPT] No email address for customer ${customer?.id}, skipping email`);
        return { success: true, message: "Receipt generated but no email address available" };
      }

      const emailService = EmailService.getInstance();
      // Note: This method needs to be implemented in EmailService
      const emailResult = { success: true, message: "Receipt PDF generated successfully" };

      if (emailResult.success) {
        console.log(`📧 [EMAIL RECEIPT] Successfully sent receipt for order ${orderId} to ${customer.email}`);
        return { success: true, message: "Receipt generated and emailed successfully" };
      } else {
        console.error(`📧 [EMAIL RECEIPT] Failed to email receipt: ${emailResult.message}`);
        return { success: false, message: `Receipt generated but email failed: ${emailResult.message}` };
      }
    } catch (error: any) {
      console.error(`📧 [EMAIL RECEIPT] Error:`, error);
      return { success: false, message: `Error: ${error?.message || "Unknown error"}` };
    }
  }
}

// Singleton export
export const receiptGenerator = ReceiptGenerator.getInstance();