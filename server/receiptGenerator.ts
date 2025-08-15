// receiptGenerator.ts
import { storage } from "./storage";

// ---------- Company Constants ----------
const COMPANY = {
  name: "Gokul Wholesale Inc",
  address: "1234 Main Street, Chicago, IL 60642",
  phone: "(224) 260-1982",
  email: "sales@gokulwholesaleinc.com",
  website: "www.gokulwholesaleinc.com",
  tp: "TP# 12345"
};

// ---------- Money helpers ----------
const toC = (n: number) => Math.round((n || 0) * 100); // dollars -> cents
const fromC = (c: number) => c / 100;
const USD = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });
const fmt$ = (cents: number) => USD.format(fromC(cents));

// ---------- Types ----------
interface ReceiptItemInput {
  name: string;
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

// ---------- Company constants ----------
const COMPANY = {
  name: "Gokul Wholesale Inc.",
  address: "1141 W Bryn Mawr Ave, Itasca, IL 60143",
  phone: "(630) 540-9910",
  email: "sales@gokulwholesaleinc.com",
  website: "www.shopgokul.com",
  tp: "TP#97239",
  feinLabel: "FEIN",
};

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
        customerName:
          customer.company ||
          `${customer.firstName || ""} ${customer.lastName || ""}`.trim() ||
          customer.username ||
          "Valued Customer",
        customerBusinessName: customer.company || undefined,
        customerEmail: customer.email || "",
        customerAddress: customer.address || "",
        customerPhone: customer.phone || "",
        orderDate: new Date(order.createdAt || new Date()).toLocaleDateString("en-US"),
        orderType: order.orderType || "pickup",
        items: itemsWithProductInfo.map((it: any) => ({
          name: it.productName || "Unknown Item",
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

      // Simple test - create a basic PDF without complex logic
      doc.text("Test PDF for Order #" + receiptData.orderId, 20, 20);
      doc.text("Customer: " + receiptData.customerName, 20, 30);
      doc.text("Total: $" + receiptData.total.toFixed(2), 20, 40);
      
      console.log(`[RECEIPT PDF] Basic content added, now generating buffer...`);
      
      try {
        const pdfData = doc.output('arraybuffer');
        const buffer = Buffer.from(pdfData);
        console.log(`[RECEIPT PDF] Test buffer created successfully with size: ${buffer.length} bytes`);
        return buffer;
      } catch (bufferError) {
        console.error(`[RECEIPT PDF] Error creating test buffer:`, bufferError);
        throw bufferError;
      }
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
      console.log(`[PREMIUM INVOICE] Starting premium invoice generation for order ${receiptData.orderId}`);
      
      // Brand colors
      const brandBlue = [41, 128, 185] as const;
    const accentBlue = [52, 152, 219] as const;
    const darkGray = [44, 62, 80] as const;
    const lightGray = [236, 240, 241] as const;
    const successGreen = [39, 174, 96] as const;
    const alertOrange = [230, 126, 34] as const;
    const textDark = [33, 37, 41] as const;

    // Header with brand background
    doc.setFillColor(...brandBlue);
    doc.rect(0, 0, pageWidth, 45, "F");
    doc.setFillColor(...accentBlue);
    doc.rect(0, 0, pageWidth, 35, "F");

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

    // Company name and details
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text(COMPANY.name, 50, 20);
    
    doc.setFontSize(10);
    doc.text(COMPANY.address, 50, 28);
    doc.text(`${COMPANY.phone} | ${COMPANY.email}`, 50, 35);

    // Invoice title and order info
    doc.setTextColor(...textDark);
    doc.setFontSize(24);
    doc.text("WHOLESALE INVOICE", pageWidth - 20, 20, { align: "right" });
    
    doc.setFontSize(12);
    doc.text(`Order #${receiptData.orderNumber}`, pageWidth - 20, 30, { align: "right" });
    doc.text(`Date: ${receiptData.orderDate}`, pageWidth - 20, 38, { align: "right" });

    let currentY = 55;

    // Customer information section
    doc.setFillColor(...lightGray);
    doc.rect(10, currentY, pageWidth - 20, 25, "F");
    
    doc.setTextColor(...textDark);
    doc.setFontSize(14);
    doc.text("Customer Information", 15, currentY + 8);
    
    doc.setFontSize(11);
    doc.text(`${receiptData.customerName}`, 15, currentY + 16);
    if (receiptData.customerBusinessName) {
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

    // Items table header
    doc.setFillColor(...brandBlue);
    doc.rect(10, currentY, pageWidth - 20, 12, "F");
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(11);
    doc.text("Item Description", 15, currentY + 8);
    doc.text("Qty", pageWidth - 80, currentY + 8);
    doc.text("Unit Price", pageWidth - 60, currentY + 8);
    doc.text("Total", pageWidth - 30, currentY + 8);

    currentY += 15;

    // Items
    doc.setTextColor(...textDark);
    doc.setFontSize(10);
    
    for (const item of receiptData.items) {
      currentY = this.ensureRoom(doc, currentY, 8, pageHeight);
      
      doc.text(item.name, 15, currentY);
      doc.text(String(item.quantity), pageWidth - 80, currentY);
      doc.text(USD.format(item.price), pageWidth - 60, currentY);
      doc.text(USD.format(item.total), pageWidth - 30, currentY);
      
      currentY += 8;
    }

    currentY += 5;

    // Totals section
    doc.setDrawColor(...lightGray);
    doc.line(pageWidth - 120, currentY, pageWidth - 15, currentY);
    currentY += 10;

    doc.setFontSize(11);
    doc.text("Items Subtotal:", pageWidth - 80, currentY);
    doc.text(USD.format(receiptData.subtotal), pageWidth - 30, currentY, { align: "right" });
    currentY += 8;

    // Flat tax breakdown
    if (receiptData.flatTaxBreakdown && receiptData.flatTaxBreakdown.length > 0) {
      for (const tax of receiptData.flatTaxBreakdown) {
        doc.text(`${tax.name}:`, pageWidth - 80, currentY);
        doc.text(USD.format(tax.amount), pageWidth - 30, currentY, { align: "right" });
        currentY += 8;
      }
    }

    if (receiptData.deliveryFee > 0) {
      doc.text("Delivery Fee:", pageWidth - 80, currentY);
      doc.text(USD.format(receiptData.deliveryFee), pageWidth - 30, currentY, { align: "right" });
      currentY += 8;
    }

    if (receiptData.loyaltyPointsValue && receiptData.loyaltyPointsValue > 0) {
      doc.text("Loyalty Discount:", pageWidth - 80, currentY);
      doc.text(`-${USD.format(receiptData.loyaltyPointsValue)}`, pageWidth - 30, currentY, { align: "right" });
      currentY += 8;
    }

    // Final total
    currentY += 5;
    doc.setDrawColor(...textDark);
    doc.line(pageWidth - 120, currentY, pageWidth - 15, currentY);
    currentY += 10;

    doc.setFontSize(14);
    doc.setTextColor(...brandBlue);
    doc.text("TOTAL:", pageWidth - 80, currentY);
    doc.text(USD.format(receiptData.total), pageWidth - 30, currentY, { align: "right" });
    
    currentY += 20;

    // IL Tobacco tax banner (only if actual tobacco products with 45% tax)
    if (receiptData.hasIlTobaccoProducts) {
      doc.setFillColor(255, 255, 0);
      doc.setDrawColor(0, 0, 0);
      doc.rect(15, currentY, pageWidth - 30, 15, "FD");
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.text("✓ 45% IL TOBACCO TAX PAID", pageWidth/2, currentY + 10, { align: "center" });
      currentY += 25;
    }

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

    // Loyalty points
    if (receiptData.loyaltyPointsEarned && receiptData.loyaltyPointsEarned > 0) {
      doc.setTextColor(...successGreen);
      doc.setFontSize(11);
      doc.text(`Loyalty Points Earned: ${receiptData.loyaltyPointsEarned} points`, 15, currentY);
      currentY += 15;
    }

    // Footer
    currentY = pageHeight - 40;
    doc.setTextColor(...textDark);
    doc.setFontSize(10);
    doc.text("Thank you for your business!", pageWidth/2, currentY, { align: "center" });
    doc.text(`${COMPANY.website} | ${COMPANY.tp}`, pageWidth/2, currentY + 8, { align: "center" });

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
}