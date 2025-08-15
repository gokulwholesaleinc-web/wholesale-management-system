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
const toC = (n: number) => Math.round((n || 0) * 100); // dollars -> cents
const fromC = (c: number) => c / 100;
const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const fmt$ = (cents: number) => USD.format(fromC(cents));

// ---------- Types ----------
interface ReceiptItemInput {
  name: string;
  sku?: string;              // SKU/lookup code for the product
  quantity: number;
  price: number;             // unit price (dollars)
  total: number;             // will be recomputed from cents for safety
  hasIlTobaccoTax?: boolean; // flag only if actual 45% IL OTP is applicable
  flatTaxAmount?: number;    // fallback per-unit amount (dollars) if needed
  flatTaxName?: string;
  basePrice?: number;
  unitPriceWithTax?: number;
  // (Optional) preferred flags used during enrichment:
  productName?: string;
  productId?: number;
  isTobaccoProduct?: boolean;
  taxPercentage?: number;
  flatTaxIds?: number[];     // recommended: use item.flatTaxId (singular) if business rule is only one
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
  deliveryDate?: string;
  deliveryTimeSlot?: string;
  items: ReceiptItemInput[];
  subtotal: number;         // dollars (will be recomputed to ensure integrity)
  deliveryFee: number;      // dollars
  total: number;            // dollars (final)
  paymentMethod?: string;
  checkNumber?: string;
  paymentNotes?: string;
  paymentDate?: string;
  orderType: "delivery" | "pickup";
  pickupDate?: string;
  pickupTime?: string;
  customerLevel?: number;
  orderStatus?: string;
  customerNotes?: string;

  // Loyalty
  loyaltyPointsEarned?: number;   // 2 pts/$1 on non-tobacco items only
  loyaltyPointsRedeemed?: number; // points used
  loyaltyPointsValue?: number;    // dollars discount (will be converted to cents)
  totalLoyaltyPoints?: number;

  // Taxes
  hasIlTobaccoProducts?: boolean; // contains IL OTP items (45%) — display banner ONLY if this is true
  totalFlatTax?: number;          // dollars
  flatTaxBreakdown?: Array<{ name: string; amount: number; description?: string }>;

  // Credit
  creditAccountInfo?: {
    previousBalance: number;
    currentBalance: number;
    creditLimit: number;
    paymentMethod?: string;
  };
}



export class ReceiptGenerator {
  private static instance: ReceiptGenerator;
  static getInstance(): ReceiptGenerator {
    if (!ReceiptGenerator.instance) {
      ReceiptGenerator.instance = new ReceiptGenerator();
    }
    return ReceiptGenerator.instance;
  }

  // ---------- Credit balance (single, canonical) ----------
  private async calculatePreviousBalance(customerId: string, currentOrderId: number) {
    try {
      const customer = await storage.getUser(customerId);
      const creditLimit = customer?.creditLimit ?? 5000;

      const orders = await storage.getOrdersByUserId(customerId);
      const completedCreditOrders = orders.filter(
        (o: any) =>
          o.status === "completed" &&
          o.id !== currentOrderId &&
          (o.paymentMethod === "on_account" || o.paymentMethod === "credit")
      );

      const previousBalance = completedCreditOrders.reduce((s: number, o: any) => s + (o.total || 0), 0);
      const currentOrder = await storage.getOrderById(currentOrderId);
      const currentOrderTotal = currentOrder?.total || 0;
      const currentBalance = previousBalance + currentOrderTotal;

      return { previousBalance, currentBalance, creditLimit };
    } catch (err) {
      return { previousBalance: 0, currentBalance: 0, creditLimit: 5000 };
    }
  }

  // ---------- Public: generate receipt for order id ----------
  async generateReceiptOnly(orderId: number): Promise<{ success: boolean; message?: string; pdfBuffer?: Buffer }> {
    try {
      console.log(`[RECEIPT GENERATOR] Starting receipt generation for order ${orderId}`);
      
      // Load order + items
      const order = await storage.getOrderWithItems(orderId);
      if (!order) {
        console.log(`[RECEIPT GENERATOR] Order ${orderId} not found`);
        return { success: false, message: "Order not found" };
      }

      const customer = await storage.getUser(order.userId);
      if (!customer) {
        console.log(`[RECEIPT GENERATOR] Customer not found for order ${orderId}`);
        return { success: false, message: "Customer not found" };
      }

      console.log(`[RECEIPT GENERATOR] Order ${orderId} has ${order.items?.length || 0} items`);

      // Enrich items with product meta (isTobaccoProduct, tax ids, etc.)
      const itemsWithProductInfo = await Promise.all(
        (order.items || []).map(async (item: any) => {
          const base: any = { ...item };
          let productData: any = null;
          if (item.productId) {
            try {
              productData = await storage.getProductById(item.productId);
              console.log(`[RECEIPT GENERATOR] Product ${item.productId}: ${productData?.name || 'Unknown'}`);
            } catch {}
          }
          const productName = productData?.name || item.productName || item.name || `Product #${item.productId}`;
          return {
            ...item,
            productName,
            name: productName,
            sku: productData?.sku || "",
            isTobaccoProduct: !!productData?.isTobaccoProduct,
            taxPercentage: productData?.taxPercentage || 0,
            flatTaxIds: productData?.flatTaxIds || item.flatTaxIds || [],
            hasIlTobaccoTax: !!(productData?.isTobaccoProduct && productData?.taxPercentage === 45),
            // keep item.flatTaxAmount as *display-only* fallback; DB will be SoT for rate
          };
        })
      );

      // ---- Cents-safe totals ----
      const itemsSubtotalC = (order.items || []).reduce(
        (s: number, it: any) => s + toC(it.price || 0) * (it.quantity || 1),
        0
      );

      console.log(`[RECEIPT GENERATOR] Items subtotal: ${fmt$(itemsSubtotalC)}`);

      // Build flat tax breakdown from DB (source of truth)
      const flatTaxMap = new Map<string, { name: string; amountC: number; items: string[] }>();
      for (const it of itemsWithProductInfo) {
        const qty = it.quantity || 1;
        const ids = Array.isArray(it.flatTaxIds) ? it.flatTaxIds : [];
        console.log(`[RECEIPT GENERATOR] Item ${it.productName} has flat tax IDs: ${JSON.stringify(ids)}`);
        
        for (const flatTaxId of ids) {
          const ft = await storage.getFlatTax(flatTaxId); // { id, name, tax_amount } in dollars
          if (!ft) {
            console.log(`[RECEIPT GENERATOR] Flat tax ${flatTaxId} not found`);
            continue;
          }
          console.log(`[RECEIPT GENERATOR] Found flat tax: ${ft.name} = ${ft.taxAmount}`);
          const perUnitC = toC(ft.taxAmount);
          const lineTaxC = perUnitC * qty;
          const key = `${ft.name}|${perUnitC}`;
          const entry = flatTaxMap.get(key) ?? { name: ft.name, amountC: 0, items: [] };
          entry.amountC += lineTaxC;
          entry.items.push(`${it.productName} (${qty} × ${fmt$(perUnitC)})`);
          flatTaxMap.set(key, entry);
        }
      }
      
      const flatTaxBreakdown = Array.from(flatTaxMap.values()).map((x) => ({
        name: x.name,
        amount: fromC(x.amountC),
        description: x.items.join(", "),
      }));
      const totalFlatTaxC = Array.from(flatTaxMap.values()).reduce((s, x) => s + x.amountC, 0);

      console.log(`[RECEIPT GENERATOR] Total flat tax: ${fmt$(totalFlatTaxC)}`);

      const deliveryFeeC = toC(order.deliveryFee || 0);
      const loyaltyDiscountC = toC(order.loyaltyPointsValue || 0);

      // Loyalty earn: 2 pts/$1 on non-tobacco items only (exclude taxes & delivery)
      const loyaltyEligibleC = itemsWithProductInfo.reduce((s: number, it: any) => {
        if (it.isTobaccoProduct) return s;
        return s + toC(it.price || 0) * (it.quantity || 1);
      }, 0);
      const loyaltyPointsEarned = Math.floor(fromC(loyaltyEligibleC) * 2);

      console.log(`[RECEIPT GENERATOR] Loyalty eligible amount: ${fmt$(loyaltyEligibleC)}, points earned: ${loyaltyPointsEarned}`);

      // Final total (prefer stored snapshot for finalized orders; otherwise recompute)
      const recomputedFinalC = itemsSubtotalC + totalFlatTaxC + deliveryFeeC - loyaltyDiscountC;
      const isFinalized =
        typeof order.status === "string" &&
        ["completed", "delivered", "paid"].includes(order.status.toLowerCase());
      const finalTotalC = isFinalized ? toC(order.total || 0) || recomputedFinalC : recomputedFinalC;

      console.log(`[RECEIPT GENERATOR] Final total: ${fmt$(finalTotalC)}, is finalized: ${isFinalized}`);

      // Invariants (soft check)
      const subtotalBeforeDeliveryC = itemsSubtotalC + totalFlatTaxC;
      const invariantOk = finalTotalC === subtotalBeforeDeliveryC + deliveryFeeC - loyaltyDiscountC;

      console.log(`[RECEIPT GENERATOR] Invariant check: ${invariantOk}`);

      // Receipt data snapshot
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
        items: itemsWithProductInfo.map((it: any) => ({
          name: it.productName || "Unknown Item",
          sku: it.sku || "",
          quantity: it.quantity || 1,
          price: it.price || 0,
          total: (it.price || 0) * (it.quantity || 1), // display only; we show cents-safe numbers in PDF
          hasIlTobaccoTax: !!it.hasIlTobaccoTax,
          flatTaxAmount: it.flatTaxAmount || 0,
          flatTaxName: it.flatTaxName || "",
        })),
        subtotal: fromC(itemsSubtotalC),
        deliveryFee: fromC(deliveryFeeC),
        total: fromC(finalTotalC),
        paymentMethod: order.paymentMethod || "cash",
        orderStatus: order.status || "completed",
        customerNotes: order.notes || "",
        loyaltyPointsRedeemed: order.loyaltyPointsRedeemed || 0,
        loyaltyPointsValue: fromC(loyaltyDiscountC),
        totalFlatTax: fromC(totalFlatTaxC),
        flatTaxBreakdown,
        // Banner should reflect actual OTP, not county flat taxes:
        hasIlTobaccoProducts: itemsWithProductInfo.some((it: any) => !!it.hasIlTobaccoTax),
        loyaltyPointsEarned,
      };

      // Credit info
      if (order.paymentMethod === "on_account" || order.paymentMethod === "credit") {
        const creditInfo = await this.calculatePreviousBalance(customer.id, order.id);
        receiptData.creditAccountInfo = {
          previousBalance: creditInfo.previousBalance,
          currentBalance: creditInfo.currentBalance,
          creditLimit: creditInfo.creditLimit,
          paymentMethod: order.paymentMethod,
        };
      }

      console.log(`[RECEIPT GENERATOR] Generating PDF for order ${orderId}`);
      console.log(`🔥 [CUSTOMER DATA] Name: "${receiptData.customerName}", Business: "${receiptData.customerBusinessName}", Address: "${receiptData.customerAddress}", Email: "${receiptData.customerEmail}"`);

      // Generate PDF
      const pdfBuffer = await this.generateReceiptPDF(receiptData, { invariantOk, subtotalBeforeDeliveryC, finalTotalC, deliveryFeeC, loyaltyDiscountC });
      
      if (!pdfBuffer) {
        console.error(`[RECEIPT GENERATOR] PDF buffer is null/undefined for order ${orderId}`);
        return { success: false, message: "Failed to generate PDF buffer" };
      }
      
      console.log(`[RECEIPT GENERATOR] PDF generated successfully, size: ${pdfBuffer.length} bytes`);
      
      return { success: true, pdfBuffer };
    } catch (error: any) {
      console.error(`[RECEIPT GENERATOR] Error:`, error);
      return { success: false, message: `Error generating receipt: ${error?.message || "Unknown error"}` };
    }
  }

  // ---------- PDF generator (switchable designs) ----------
  private async generateReceiptPDF(
    receiptData: ReceiptData,
    diag?: { invariantOk: boolean; subtotalBeforeDeliveryC: number; finalTotalC: number; deliveryFeeC: number; loyaltyDiscountC: number }
  ): Promise<Buffer> {
    try {
      console.log(`[RECEIPT PDF] Starting PDF generation for order ${receiptData.orderId}`);
      
      const { jsPDF } = await import("jspdf");
      console.log(`[RECEIPT PDF] jsPDF import completed`);
      
      const fs = await import("fs");
      const path = await import("path");
      console.log(`[RECEIPT PDF] All imports successful`);

      const doc = new jsPDF();
      console.log(`[RECEIPT PDF] jsPDF document created successfully`);
      
      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;
      console.log(`[RECEIPT PDF] Page dimensions: ${pageWidth}x${pageHeight}`);

      // Generate premium professional invoice
      console.log(`[RECEIPT PDF] Creating professional invoice layout...`);
      return await this.generatePremiumInvoice(doc, receiptData, fs, path, pageWidth, pageHeight);
    } catch (error) {
      console.error(`[RECEIPT PDF] Error in generateReceiptPDF:`, error);
      throw error;
    }
  }

  // ---------- Pagination helper ----------
  private ensureRoom(doc: any, y: number, needed: number, pageHeight: number, newPageTop = 20) {
    if (y + needed > pageHeight - 30) {
      doc.addPage();
      return newPageTop;
    }
    return y;
  }

  // ---------- Premium PDF ----------
  private async generatePremiumInvoice(
    doc: any,
    receiptData: ReceiptData,
    fs: any,
    path: any,
    pageWidth: number,
    pageHeight: number
  ): Promise<Buffer> {
    try {
      console.log(`🔥 [PREMIUM INVOICE V2] UPDATED VERSION - Starting premium invoice generation for order ${receiptData.orderId}`);
      console.log(`🔥 [BUSINESS INFO] Using: ${COMPANY.name}, ${COMPANY.address}, ${COMPANY.phone}, ${COMPANY.tp}`);
      console.log(`🔥 [CUSTOMER DATA] Name: "${receiptData.customerName}", Business: "${receiptData.customerBusinessName}", Address: "${receiptData.customerAddress}"`);
      
      // Brand colors - More professional palette
      const professionalNavy = [52, 73, 94] as const;
      const subtleGray = [248, 249, 250] as const;
      const darkGray = [44, 62, 80] as const;
      const lightGray = [236, 240, 241] as const;
      const successGreen = [39, 174, 96] as const;
      const alertOrange = [230, 126, 34] as const;
      const textDark = [33, 37, 41] as const;

    // Clean professional header with subtle background
    doc.setFillColor(...subtleGray);
    doc.rect(0, 0, pageWidth, 45, "F");
    doc.setDrawColor(...professionalNavy);
    doc.setLineWidth(0.5);
    doc.line(0, 45, pageWidth, 45);

    // Company logo and info
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

    // Company name and details - Professional dark text
    doc.setTextColor(...professionalNavy);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(COMPANY.name, 50, 22);
    
    doc.setTextColor(...textDark);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(COMPANY.address, 50, 30);
    doc.text(`${COMPANY.phone} | ${COMPANY.email}`, 50, 36);
    doc.text(COMPANY.tp, 50, 42);
    console.log(`🔥 [HEADER DEBUG] Phone: "${COMPANY.phone}", Email: "${COMPANY.email}", TP: "${COMPANY.tp}"`);

    // Order info - Professional styling
    doc.setTextColor(...professionalNavy);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`Order #${receiptData.orderNumber}`, pageWidth - 20, 22, { align: "right" });
    doc.setTextColor(...textDark);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Date: ${receiptData.orderDate}`, pageWidth - 20, 32, { align: "right" });

    let currentY = 55;

    // Customer information section
    doc.setFillColor(...lightGray);
    doc.rect(10, currentY, pageWidth - 20, 25, "F");
    
    doc.setTextColor(...textDark);
    doc.setFontSize(14);
    doc.text("Customer Information", 15, currentY + 8);
    
    doc.setFontSize(11);
    console.log(`🔥 [CUSTOMER DEBUG] Name: "${receiptData.customerName}", Business: "${receiptData.customerBusinessName}", Address: "${receiptData.customerAddress}"`);
    
    // Display customer name (or business name if different)
    doc.text(`${receiptData.customerName}`, 15, currentY + 16);
    
    // Show address if available, otherwise show business name only if it's different from customer name
    if (receiptData.customerAddress && receiptData.customerAddress.trim() !== '') {
      doc.text(`${receiptData.customerAddress}`, 15, currentY + 22);
    } else if (receiptData.customerBusinessName && receiptData.customerBusinessName !== receiptData.customerName) {
      doc.text(`${receiptData.customerBusinessName}`, 15, currentY + 22);
    }
    
    if (receiptData.customerEmail) {
      doc.text(`Email: ${receiptData.customerEmail}`, pageWidth/2, currentY + 16);
    }
    if (receiptData.customerPhone) {
      doc.text(`Phone: ${receiptData.customerPhone}`, pageWidth/2, currentY + 22);
    }

    currentY += 35;

    // Order details
    if (receiptData.orderType === "pickup") {
      doc.setFontSize(10);
      doc.text(`Order Type: ${receiptData.orderType.toUpperCase()}`, 15, currentY);
      currentY += 10;
    }

    // Items table header - Professional styling
    doc.setFillColor(...professionalNavy);
    doc.rect(10, currentY, pageWidth - 20, 12, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text("Item Description", 15, currentY + 8);
    doc.text("SKU", 105, currentY + 8);  // MOVED LEFT - closer to Item Description
    doc.text("Qty", pageWidth - 70, currentY + 8);  // Keep same spacing
    doc.text("Unit Price", pageWidth - 50, currentY + 8);  // Keep same spacing
    doc.text("Total", pageWidth - 20, currentY + 8);

    currentY += 15;

    // Items - FIXED column alignment to prevent SKU overlap
    doc.setTextColor(...textDark);
    doc.setFontSize(10);
    
    for (const item of receiptData.items) {
      currentY = this.ensureRoom(doc, currentY, 10, pageHeight);
      
      // Truncate long item names to prevent overlap with SKU column - adjusted width
      const maxNameWidth = 85; // REDUCED width to leave proper space for SKU column
      const itemName = doc.splitTextToSize(item.name, maxNameWidth)[0] || item.name;
      doc.text(itemName, 15, currentY);
      
      // SKU column moved left to prevent overlap
      const truncatedSku = (item.sku || "N/A").substring(0, 15); // Allow slightly longer SKUs
      doc.text(truncatedSku, 105, currentY);  // MOVED LEFT to match header
      
      doc.text(String(item.quantity), pageWidth - 70, currentY);
      doc.text(USD.format(item.price), pageWidth - 50, currentY);
      doc.text(USD.format(item.total), pageWidth - 20, currentY, { align: "right" });
      
      currentY += 10; // Keep spacing between items
    }

    currentY += 5;

    // Totals section
    doc.setDrawColor(...lightGray);
    doc.line(pageWidth - 120, currentY, pageWidth - 15, currentY);
    currentY += 10;

    doc.setFontSize(11);
    doc.text("Items Subtotal:", pageWidth - 90, currentY);
    doc.text(USD.format(receiptData.subtotal), pageWidth - 20, currentY, { align: "right" });
    currentY += 8;

    // Flat tax breakdown - fix text alignment and prevent overlap
    if (receiptData.flatTaxBreakdown && receiptData.flatTaxBreakdown.length > 0) {
      for (const tax of receiptData.flatTaxBreakdown) {
        // Shorten long tax descriptions and ensure proper alignment
        const shortTaxName = tax.name
          .replace("Cook County Large Cigar", "Cook Co. Lg Cigar")
          .replace("Large", "Lg")
          .substring(0, 30); // Shorter limit to prevent wrapping
        doc.text(`${shortTaxName}:`, pageWidth - 90, currentY); // More space for label
        doc.text(USD.format(tax.amount), pageWidth - 20, currentY, { align: "right" });
        currentY += 8;
      }
    }

    if (receiptData.deliveryFee > 0) {
      doc.text("Delivery Fee:", pageWidth - 90, currentY);
      doc.text(USD.format(receiptData.deliveryFee), pageWidth - 20, currentY, { align: "right" });
      currentY += 8;
    }

    if (receiptData.loyaltyPointsValue && receiptData.loyaltyPointsValue > 0) {
      doc.text("Loyalty Discount:", pageWidth - 90, currentY);
      doc.text(`-${USD.format(receiptData.loyaltyPointsValue)}`, pageWidth - 20, currentY, { align: "right" });
      currentY += 8;
    }

    // Final total - Smaller and directly under taxes
    currentY += 2;
    doc.setDrawColor(...textDark);
    doc.line(pageWidth - 120, currentY, pageWidth - 15, currentY);
    currentY += 6;

    doc.setFontSize(12);
    doc.setTextColor(...textDark);
    doc.setFont('helvetica', 'bold');
    doc.text("TOTAL:", pageWidth - 90, currentY);
    doc.text(USD.format(receiptData.total), pageWidth - 20, currentY, { align: "right" });
    
    currentY += 15;

    // Remove duplicate yellow tobacco tax banner - keeping only the orange compliance message at bottom

    // Payment method
    if (receiptData.paymentMethod && receiptData.orderStatus === "completed") {
      doc.setTextColor(...textDark);
      doc.setFontSize(11);
      doc.text(`Payment Method: ${receiptData.paymentMethod.replace(/_/g, ' ').toUpperCase()}`, 15, currentY);
      currentY += 15;
    }

    // Credit account info
    if (receiptData.creditAccountInfo) {
      doc.setFillColor(...lightGray);
      doc.rect(15, currentY, pageWidth - 30, 25, "F");
      doc.setTextColor(...textDark);
      doc.setFontSize(11);
      doc.text("Credit Account Summary", 20, currentY + 8);
      doc.setFontSize(10);
      doc.text(`Previous Balance: ${USD.format(receiptData.creditAccountInfo.previousBalance)}`, 20, currentY + 16);
      doc.text(`Current Balance: ${USD.format(receiptData.creditAccountInfo.currentBalance)}`, 20, currentY + 22);
      doc.text(`Credit Limit: ${USD.format(receiptData.creditAccountInfo.creditLimit)}`, pageWidth - 100, currentY + 16);
      currentY += 35;
    }

    // Loyalty points - improved spacing and visibility
    if (receiptData.loyaltyPointsEarned && receiptData.loyaltyPointsEarned > 0) {
      currentY += 5; // Add extra space before loyalty points
      doc.setFillColor(240, 248, 240); // Light green background
      doc.rect(15, currentY - 3, pageWidth - 30, 12, "F");
      doc.setTextColor(...successGreen);
      doc.setFontSize(11);
      doc.text(`Loyalty Points Earned: ${receiptData.loyaltyPointsEarned} points`, 20, currentY + 5);
      currentY += 20; // Extra space after loyalty points
    }

    // Mandatory IL Tobacco Tax Compliance Message - Small box in bottom left corner
    const taxBoxY = pageHeight - 40;
    const taxBoxWidth = 80;
    const taxBoxHeight = 10;
    
    doc.setDrawColor(...alertOrange);
    doc.setLineWidth(1);
    doc.rect(15, taxBoxY, taxBoxWidth, taxBoxHeight);
    doc.setTextColor(...alertOrange);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("45% IL TOBACCO TAX PAID", 55, taxBoxY + 6, { align: "center" });

    // Footer
    currentY = pageHeight - 25;
    doc.setTextColor(...textDark);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Thank you for your business!", pageWidth/2, currentY, { align: "center" });
    doc.text(COMPANY.website, pageWidth/2, currentY + 8, { align: "center" });

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
    } catch (error) {
      console.error(`❌ [PREMIUM INVOICE] Error in generatePremiumInvoice:`, error);
      throw error;
    }
  }

  // ---------- Generate and Email Receipt ----------
  async generateAndSendReceipt(orderId: number, isManual: boolean = false): Promise<{ success: boolean; message?: string }> {
    try {
      console.log(`📧 [EMAIL RECEIPT] Starting receipt generation and email for order ${orderId}, manual: ${isManual}`);
      
      // Generate PDF receipt
      const pdfResult = await this.generateReceiptOnly(orderId);
      if (!pdfResult.success || !pdfResult.pdfBuffer) {
        console.error(`📧 [EMAIL RECEIPT] PDF generation failed: ${pdfResult.message}`);
        return { success: false, message: `Failed to generate PDF: ${pdfResult.message}` };
      }

      // Get order and customer information for email
      const order = await storage.getOrderWithItems(orderId);
      if (!order) {
        return { success: false, message: "Order not found" };
      }

      const customer = await storage.getUser(order.userId);
      if (!customer) {
        return { success: false, message: "Customer not found" };
      }

      console.log(`📧 [EMAIL RECEIPT] Customer email: ${customer.email}`);
      
      if (!customer.email) {
        return { success: false, message: "Customer email not found" };
      }

      // Generate cache-busting filename with timestamp
      const timestamp = Date.now();
      const filename = `invoice-${order.id}-${timestamp}.pdf`;
      
      // Use EmailService to send email with PDF attachment
      const emailService = EmailService.getInstance();
      const emailData = {
        to: customer.email,
        customerName: customer.firstName || customer.username,
        orderNumber: order.id.toString(),
        orderTotal: order.total,
        language: customer.preferredLanguage || 'en'
      };
      
      const emailResult = await emailService.sendEmailWithAttachment(
        emailData,
        'receipt',
        pdfResult.pdfBuffer,
        filename
      );

      console.log(`📧 [EMAIL RECEIPT] Email result: ${emailResult}`);

      if (emailResult === true) {
        console.log(`✅ [EMAIL RECEIPT] Successfully sent receipt for order ${orderId} to ${customer.email}`);
        return { 
          success: true, 
          message: `Receipt sent successfully to ${customer.email}` 
        };
      } else {
        console.error(`❌ [EMAIL RECEIPT] Failed to send email: ${emailResult}`);
        return { 
          success: false, 
          message: `Failed to send email: Email service returned false` 
        };
      }

    } catch (error: any) {
      console.error(`❌ [EMAIL RECEIPT] Error in generateAndSendReceipt:`, error);
      return { 
        success: false, 
        message: `Error sending receipt: ${error?.message || "Unknown error"}` 
      };
    }
  }
}

// Create and export the singleton instance
export const receiptGenerator = ReceiptGenerator.getInstance();