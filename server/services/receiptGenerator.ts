// receiptGenerator.ts
import { storage } from "../storage";
import { emailService } from "./emailService";

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

  // ---------- Helper: normalize ANY delivery/customer address into one line ----------
  private getFullCustomerAddress(order: any, customer: any): string {
    const lower = (v: any) => (typeof v === "string" ? v.toLowerCase() : v);
    const isDelivery = lower(order?.orderType) === "delivery" || lower(order?.orderType) === "deliver";

    // Try to read delivery address (object or JSON string or plain formatted string)
    const parseDelivery = () => {
      let d = order?.deliveryAddressData ?? order?.deliveryAddress ?? null;
      if (!d) return null;
      if (typeof d === "string") {
        const trimmed = d.trim();
        if (!trimmed) return null;
        try {
          // If it's JSON, parse it; otherwise treat as already-formatted
          return JSON.parse(trimmed);
        } catch {
          return trimmed; // already a formatted address
        }
      }
      return d; // object
    };

    // Pull a value by trying multiple possible keys and case-insensitive matches
    const pick = (obj: any, keys: string[]) => {
      if (!obj || typeof obj !== "object") return "";
      for (const k of keys) {
        if (obj[k] != null && String(obj[k]).trim() !== "") return String(obj[k]).trim();
        const alt = Object.keys(obj).find((x) => x.toLowerCase() === k.toLowerCase());
        if (alt && obj[alt] != null && String(obj[alt]).trim() !== "") return String(obj[alt]).trim();
      }
      return "";
    };

    // 1) DELIVERY address first (if delivery)
    if (isDelivery) {
      const raw = parseDelivery();
      if (raw) {
        if (typeof raw === "string") return raw; // already formatted
        // object: support many shapes
        const line1 = pick(raw, ["addressLine1", "line1", "street", "street1", "address1"]);
        const line2 = pick(raw, ["addressLine2", "line2", "apt", "suite", "unit", "address2"]);
        const city  = pick(raw, ["city", "locality", "town"]);
        const state = pick(raw, ["state", "region", "province", "stateCode", "state_code"]);
        const zip   = pick(raw, ["postalCode", "postal_code", "zip", "zipcode"]);
        const formatted = pick(raw, ["formatted", "formattedAddress", "fullAddress"]);

        const left  = [line1, line2].filter(Boolean).join(" ").trim();
        const right = [[city, state].filter(Boolean).join(", "), zip].filter(Boolean).join(" ").trim();
        const combined = [left, right].filter(Boolean).join(", ").trim();
        const finalAddr = (formatted || combined || "").trim();
        if (finalAddr) return finalAddr;
      }
    }

    // 2) Fallback: customer default address
    const c = customer || {};
    const cLine1 = c.addressLine1 || c.line1 || c.street || c.address1 || c.address || "";
    const cLine2 = c.addressLine2 || c.line2 || c.apt || c.suite || c.address2 || "";
    const cCity  = c.city || c.locality || "";
    const cState = c.state || c.region || c.province || c.stateCode || "";
    const cZip   = c.postalCode || c.postal_code || c.zip || c.zipcode || "";

    const left  = [cLine1, cLine2].filter((x: string) => x && x.trim()).join(" ").trim();
    const right = [[cCity, cState].filter(Boolean).join(", "), cZip].filter(Boolean).join(" ").trim();
    return [left, right].filter(Boolean).join(", ").trim();
  }

  // ---------- Credit balance (robust & canonical) ----------
  /**
   * Computes the *outstanding* previous balance by summing only amounts still due on prior
   * on-account/credit orders (excludes current order, ignores cancelled/voided).
   * It looks for common paid fields: amountPaid / paidAmount / paymentsTotal.
   */
  private async calculatePreviousBalance(customerId: string, currentOrderId: number) {
    try {
      console.log(`💳 [CREDIT DEBUG] Calculating previous balance for customer ${customerId}, excluding order ${currentOrderId}`);
      
      const customer = await storage.getUser(customerId);
      const creditLimit = typeof customer?.creditLimit === 'number' ? customer.creditLimit : 5000;

      const orders = await storage.getOrdersByUserId(customerId);
      console.log(`💳 [CREDIT DEBUG] Found ${orders.length} total orders for customer`);

      let previousBalance = 0;

      for (const o of orders) {
        if (!o) continue;
        if (o.id === currentOrderId) continue;

        const pm = (o.paymentMethod || '').toLowerCase();
        const status = (o.status || '').toLowerCase();

        // Only account/credit orders count toward prior balance
        if (pm !== 'on_account' && pm !== 'credit') continue;

        // Ignore cancelled/voided orders
        if (['cancelled', 'canceled', 'void', 'voided'].includes(status)) {
          console.log(`💳 [CREDIT DEBUG] Skipping ${status} order ${o.id}`);
          continue;
        }

        const total = Number(o.total || 0);
        const paid = Number(o.amountPaid ?? o.paidAmount ?? o.paymentsTotal ?? 0);

        const due = Math.max(0, total - paid);

        // If order is explicitly marked paid with no due, skip it
        if (due === 0) {
          console.log(`💳 [CREDIT DEBUG] Order ${o.id} fully paid (${total} total, ${paid} paid)`);
          continue;
        }

        console.log(`💳 [CREDIT DEBUG] Order ${o.id} has outstanding balance: $${due.toFixed(2)} (total: $${total.toFixed(2)}, paid: $${paid.toFixed(2)})`);
        previousBalance += due;
      }

      // Current order total to produce "currentBalance" for display
      const currentOrder = await storage.getOrderById(currentOrderId);
      const currentOrderTotal = Number(currentOrder?.total || 0);
      const currentBalance = previousBalance + currentOrderTotal;

      console.log(`💳 [CREDIT DEBUG] Final calculation - Previous: $${previousBalance.toFixed(2)}, Current Order: $${currentOrderTotal.toFixed(2)}, New Balance: $${currentBalance.toFixed(2)}`);

      return { previousBalance, currentBalance, creditLimit };
    } catch (err) {
      console.error(`💳 [CREDIT DEBUG] Error calculating previous balance:`, err);
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
        customerAddress: this.getFullCustomerAddress(order, customer),
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

      // Credit info - always show (even if $0.00)
      // Use the same total that the PDF shows:
      const creditInfo = await this.calculatePreviousBalance(customer.id, order.id);
      const previousBalance = Number(creditInfo.previousBalance || 0);
      const currentBalance = previousBalance + fromC(finalTotalC);
      
      receiptData.creditAccountInfo = {
        previousBalance,
        currentBalance,
        creditLimit: creditInfo.creditLimit,
        paymentMethod: order.paymentMethod,
      };
      
      console.log(`🔍 [CREDIT DEBUG] Customer credit info: Previous: ${fmt$(toC(creditInfo.previousBalance))}, Current: ${fmt$(toC(creditInfo.currentBalance))}, Limit: ${fmt$(toC(creditInfo.creditLimit))}`);

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

  // ---------- Helper Methods ----------
  // If not enough space, add a page and redraw the header; return the new Y start.
  private ensureRoom(
    doc: any,
    y: number,
    needed: number,
    pageHeight: number,
    receiptData: ReceiptData,
    fs: any,
    path: any,
    pageWidth: number
  ): number {
    if (y + needed > pageHeight - 30) {
      doc.addPage();
      // Redraw header on new page and continue below it
      const newY = this.drawCommonHeader(doc, receiptData, fs, path, pageWidth, pageHeight);
      return newY;
    }
    return y;
  }

  // Draws the full page header (company block + order info + customer panel).
  // Returns the next Y position to continue writing.
  private drawCommonHeader(
    doc: any,
    receiptData: ReceiptData,
    fs: any,
    path: any,
    pageWidth: number,
    pageHeight: number
  ): number {
    const professionalNavy = [52, 73, 94] as const;
    const subtleGray = [248, 249, 250] as const;
    const lightGray = [236, 240, 241] as const;
    const textDark = [33, 37, 41] as const;

    // Background strip
    doc.setFillColor(...subtleGray);
    doc.rect(0, 0, pageWidth, 45, "F");
    doc.setDrawColor(...professionalNavy);
    doc.setLineWidth(0.5);
    doc.line(0, 45, pageWidth, 45);

    // Logo
    try {
      const logoPath = path.join(process.cwd(), "public", "gokul-logo.png");
      if (fs.existsSync(logoPath)) {
        const logoData = fs.readFileSync(logoPath);
        const logoBase64 = `data:image/png;base64,${logoData.toString("base64")}`;
        doc.setFillColor(255, 255, 255);
        doc.circle(25, 20, 12, "F");
        doc.addImage(logoBase64, "PNG", 15, 10, 20, 20);
      }
    } catch {}

    // Company text
    doc.setTextColor(...professionalNavy);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(COMPANY.name, 50, 22);

    doc.setTextColor(...textDark);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(COMPANY.address, 50, 30);
    doc.text(`${COMPANY.phone} | ${COMPANY.email}`, 50, 36);
    doc.text(COMPANY.tp, 50, 42);

    // Order info
    doc.setTextColor(...professionalNavy);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`Order #${receiptData.orderNumber}`, pageWidth - 20, 22, { align: "right" });
    doc.setTextColor(...textDark);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(`Date: ${receiptData.orderDate}`, pageWidth - 20, 32, { align: "right" });

    // ---- Customer info card (now includes business, name, address) ----
    let y = 55;
    const leftX = 15;
    const rightX = pageWidth / 2;
    const lineGap = 5;
    const wrapWidth = (pageWidth / 2) - 25;

    // Prepare left-side lines
    const linesLeft: string[] = [];
    const biz = (receiptData.customerBusinessName || "").trim();
    const person = (receiptData.customerName || "").trim();
    const addr = (receiptData.customerAddress || "").trim();

    if (biz) linesLeft.push(biz);
    if (person) linesLeft.push(person);
    if (addr) {
      const addrLines = doc.splitTextToSize(addr, wrapWidth);
      linesLeft.push(...addrLines.slice(0, 3)); // up to 3 lines
    }

    // Compute dynamic height
    const leftBlockHeight = linesLeft.length > 0 ? (lineGap * linesLeft.length) : 0;
    const minCardHeight = 22;
    const cardHeight = Math.max(minCardHeight, 10 + leftBlockHeight); // base + lines
    doc.setFillColor(...lightGray);
    doc.rect(10, y, pageWidth - 20, cardHeight, "F");

    // Title
    doc.setTextColor(...textDark);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Customer Information", leftX, y + 7);

    // Left stack (business → name → address)
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    let ly = y + 14;
    for (const ln of linesLeft) {
      doc.text(ln, leftX, ly);
      ly += lineGap;
    }

    // Right column (email / phone), aligned with the first text row
    const rightY = y + 14;
    if (receiptData.customerEmail) doc.text(`Email: ${receiptData.customerEmail}`, rightX, rightY);
    if (receiptData.customerPhone) doc.text(`Phone: ${receiptData.customerPhone}`, rightX, rightY + lineGap);

    // Next content Y
    return y + cardHeight + 8;
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

      // Use the common header helper
      let currentY = this.drawCommonHeader(doc, receiptData, fs, path, pageWidth, pageHeight);

      // --- Compact mode if short order (<=10 items) ---
      const compact = (receiptData.items?.length || 0) <= 10;

      // Global sizes (compact first)
      const fsBody = compact ? 9 : 10;        // default body font
      const fsSmall = compact ? 8.5 : 9.5;    // small labels
      const fsTotal = compact ? 11 : 12;      // "Total (This Order)"
      const rowH = compact ? 7 : 8;           // item row height
      const afterTableGap = compact ? 6 : 10; // gap after table
      const thinGap = compact ? 3 : 5;        // tiny gap
      const panelRowH = compact ? 7 : 8;      // account panel rows
      const panelHdrH = compact ? 9 : 10;     // account panel header height
      const loyaltyH = compact ? 12 : 16;     // loyalty banner height

      // Order details
      if (receiptData.orderType === "pickup") {
        doc.setFontSize(fsBody);
        doc.text(`Order Type: ${receiptData.orderType.toUpperCase()}`, 15, currentY);
        currentY += rowH + 2;
      }

      // We already drew business/name/address inside the header card
      // Move straight to the items table:
      currentY += 4; // small breathing room before the table

      // Items table header - Professional styling
      doc.setFillColor(...professionalNavy);
      doc.rect(10, currentY, pageWidth - 20, 12, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(fsSmall);
      doc.setFont('helvetica', 'bold');
      doc.text("Item Description", 15, currentY + 8);
      doc.text("SKU", 105, currentY + 8);
      doc.text("Qty", pageWidth - 70, currentY + 8);
      doc.text("Unit Price", pageWidth - 50, currentY + 8);
      doc.text("Total", pageWidth - 20, currentY + 8, { align: "right" });

      currentY += 15;

      // Items with ensureRoom for page breaks
      doc.setTextColor(...textDark);
      doc.setFontSize(fsSmall);
      
      const maxNameWidth = 82;
      
      for (const item of receiptData.items) {
        currentY = this.ensureRoom(doc, currentY, rowH, pageHeight, receiptData, fs, path, pageWidth);
        
        const itemName = doc.splitTextToSize(item.name, maxNameWidth)[0] || item.name;
        doc.text(itemName, 15, currentY);
        
        const truncatedSku = (item.sku || "N/A").substring(0, 15);
        doc.text(truncatedSku, 105, currentY);
        
        doc.text(String(item.quantity), pageWidth - 70, currentY);
        doc.text(USD.format(item.price), pageWidth - 50, currentY);
        doc.text(USD.format(item.total), pageWidth - 20, currentY, { align: "right" });
        
        currentY += rowH;
      }

      currentY += afterTableGap;

      // Totals section (compact sizes)
      doc.setDrawColor(...lightGray);
      doc.line(pageWidth - 120, currentY, pageWidth - 15, currentY);
      currentY += thinGap;

      doc.setFontSize(fsBody);
      doc.text("Items Subtotal:", pageWidth - 90, currentY);
      doc.text(USD.format(receiptData.subtotal), pageWidth - 20, currentY, { align: "right" });
      currentY += compact ? 5 : 6;

      // Flat tax breakdown
      if (receiptData.flatTaxBreakdown && receiptData.flatTaxBreakdown.length > 0) {
        for (const tax of receiptData.flatTaxBreakdown) {
          const shortTaxName = tax.name
            .replace("Cook County Large Cigar", "Cook Co. Lg Cigar")
            .replace("Large", "Lg")
            .substring(0, 30);
          doc.text(`${shortTaxName}:`, pageWidth - 90, currentY);
          doc.text(USD.format(tax.amount), pageWidth - 20, currentY, { align: "right" });
          currentY += compact ? 5 : 6;
        }
      }

      if (receiptData.deliveryFee > 0) {
        doc.text("Delivery Fee:", pageWidth - 90, currentY);
        doc.text(USD.format(receiptData.deliveryFee), pageWidth - 20, currentY, { align: "right" });
        currentY += compact ? 5 : 6;
      }

      if (receiptData.loyaltyPointsValue && receiptData.loyaltyPointsValue > 0) {
        doc.text("Loyalty Discount:", pageWidth - 90, currentY);
        doc.text(`-${USD.format(receiptData.loyaltyPointsValue)}`, pageWidth - 20, currentY, { align: "right" });
        currentY += compact ? 5 : 6;
      }

      // Totals (smaller)
      doc.setDrawColor(...lightGray);
      doc.line(pageWidth - 120, currentY, pageWidth - 15, currentY);
      currentY += thinGap;

      doc.setFontSize(fsTotal);
      doc.setTextColor(...textDark);
      doc.setFont('helvetica', 'bold');
      doc.text("Total (This Order):", pageWidth - 90, currentY);
      doc.text(USD.format(receiptData.total), pageWidth - 20, currentY, { align: "right" });

      currentY += compact ? 7 : 8;

      // ---- Account Summary (compact) ----
      const panelX = 10;
      const panelW = pageWidth - 20;
      const panelRows = 3;
      const panelH = panelHdrH + panelRows * panelRowH;

      currentY = this.ensureRoom(doc, currentY, panelH + thinGap, pageHeight, receiptData, fs, path, pageWidth);

      doc.setFillColor(245, 246, 248);
      doc.setDrawColor(220, 224, 230);
      doc.rect(panelX, currentY, panelW, panelH, "F");
      doc.rect(panelX, currentY, panelW, panelH);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(compact ? 10.5 : 11);
      doc.setTextColor(52, 73, 94);
      doc.text("Account Summary", panelX + 5, currentY + (panelHdrH - 2));

      const valX = panelX + panelW - 5;
      let ry = currentY + panelHdrH - 1;

      const KV = (label: string, value: string, bold = false) => {
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setTextColor(33, 37, 41);
        doc.setFontSize(fsSmall);
        ry += panelRowH;
        doc.text(label, panelX + 5, ry);
        doc.text(value, valX, ry, { align: "right" });
      };

      const prev = Number(receiptData.creditAccountInfo?.previousBalance || 0);
      const thisOrder = Number(receiptData.total || 0);
      const amountDue = prev + thisOrder;

      KV("Previous Balance", USD.format(prev));
      KV("This Order", USD.format(thisOrder));
      KV("Amount Due (Prev + This)", USD.format(amountDue), true);

      currentY += panelH + (compact ? 4 : 8);

    // Remove duplicate yellow tobacco tax banner - keeping only the orange compliance message at bottom

    // Payment method
    if (receiptData.paymentMethod && receiptData.orderStatus === "completed") {
      doc.setTextColor(...textDark);
      doc.setFontSize(11);
      doc.text(`Payment Method: ${receiptData.paymentMethod.replace(/_/g, ' ').toUpperCase()}`, 15, currentY);
      currentY += 15;
    }

    // (Optional) remove bottom "Credit Account Summary" box to reduce clutter
    // If you want to keep it, delete the next line and keep your old block.
    // currentY = currentY; // no-op, just indicates we're not adding another credit box here.

      // ---------- Loyalty Points Earned (compact, clean) ----------
      currentY = this.ensureRoom(doc, currentY, loyaltyH, pageHeight, receiptData, fs, path, pageWidth);

      if (typeof receiptData.loyaltyPointsEarned === "number") {
        const pts = Math.max(0, Math.floor(Number(receiptData.loyaltyPointsEarned) || 0));
        doc.setFillColor(240, 248, 240);
        doc.rect(15, currentY, pageWidth - 30, compact ? 9 : 10, "F");
        doc.setTextColor(39, 174, 96);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(compact ? 9 : 10);
        doc.text(`Loyalty Points Earned: ${pts} points`, 20, currentY + (compact ? 6.5 : 7.5));
        currentY += loyaltyH;
        doc.setTextColor(33, 37, 41);
        doc.setFont("helvetica", "normal");
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
      const { emailService } = await import('./emailService');
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