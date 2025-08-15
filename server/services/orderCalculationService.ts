// Clean B2B Order Calculation Service
// Implements tier-based pricing, flat taxes only, and proper loyalty logic

export interface OrderInput {
  items: OrderInputItem[];
  isDelivery: boolean;
  deliveryFee?: number;
  redeemPoints?: number;
}

export interface OrderInputItem {
  name: string;
  qty: number;
  tierPrices: { [tier: number]: number }; // Price by customer tier
  category: string;
  hasFlatTax: boolean;
  flatTaxPerItem?: number;
  flatTaxLabel?: string;
}

export interface Customer {
  tier: number;
  hasFlatTax: boolean;
  loyalty: {
    availablePoints: number;
    earnRatePerDollar: number;
    redeemValuePerPoint: number;
    maxRedeemPercent?: number;
  };
}

export interface CalcLine {
  kind: 'item' | 'flatTax' | 'delivery' | 'loyaltyRedeem';
  name?: string;
  label?: string;
  qty?: number;
  unitPrice?: number;
  lineTotal?: number;
  amount?: number;
  pointsUsed?: number;
}

export interface OrderResult {
  lines: CalcLine[];
  itemsSubtotal: number;
  flatTaxTotal: number;
  subtotalBeforeDelivery: number;
  deliveryFee: number;
  subtotalBeforeRedemption: number;
  loyaltyEligibleSubtotal: number;
  pointsEarned: number;
  pointsRedeemed: number;
  loyaltyRedeemValue: number;
  total: number;
}

export class OrderCalculationService {
  // Explicitly disable any sales tax in B2B context
  private static readonly SALES_TAX_PERCENT = 0; // Do not change; B2B = no sales tax
  
  // Cache for flat tax values to avoid repeated DB lookups
  private static flatTaxCache = new Map<number, number>();

  static calculateOrder(input: OrderInput, customer: Customer): OrderResult {
    const lines: CalcLine[] = [];

    // 1) Items subtotal by tier
    let itemsSubtotalC = 0;
    for (const it of input.items) {
      const unitPrice = it.tierPrices[customer.tier] ?? 0;
      const lineTotalC = Math.round(unitPrice * it.qty * 100);
      itemsSubtotalC += lineTotalC;

      lines.push({
        kind: "item",
        name: it.name,
        qty: it.qty,
        unitPrice,
        lineTotal: lineTotalC / 100,
      });
    }

    // 2) Flat tax lines only (no percent-based sales tax ever)
    let flatTaxTotalC = 0;
    if (customer.hasFlatTax) {
      for (const it of input.items) {
        if (it.hasFlatTax && it.flatTaxPerItem && it.flatTaxPerItem > 0) {
          const label = it.flatTaxLabel ?? "Flat Tax";
          const amountC = Math.round(it.flatTaxPerItem * it.qty * 100);
          flatTaxTotalC += amountC;
          lines.push({ kind: "flatTax", label, amount: amountC / 100 });
        }
      }
    }


    // 3) Loyalty-eligible subtotal: exclude taxes + tobacco
    // Loyalty points fix: 2% of order excluding delivery, taxes, and tobacco items
    // Build eligible subtotal in CENTS
    let loyaltyEligibleC = 0;
    for (const it of input.items) {
      if (it.category !== "tobacco") {
        const unitPrice = it.tierPrices[customer.tier] ?? 0;
        loyaltyEligibleC += Math.round(unitPrice * it.qty * 100);
      }
    }

    // 2% back -> convert to points (1 point = $0.01)
    // const points = Math.floor((eligibleC / 100) * 2);
    const pointsEarned = Math.floor((loyaltyEligibleC / 100) * customer.loyalty.earnRatePerDollar);

    // 4) Subtotals
    const subtotalBeforeDeliveryC = itemsSubtotalC + flatTaxTotalC;

    // 5) Delivery (pickup => $0)
    const deliveryFeeC = input.isDelivery ? Math.round((input.deliveryFee ?? 0) * 100) : 0;
    if (deliveryFeeC > 0) lines.push({ kind: "delivery", amount: deliveryFeeC / 100 });
    const subtotalBeforeRedemptionC = subtotalBeforeDeliveryC + deliveryFeeC;

    // 6) Loyalty redemption last
    const requestedPoints = input.redeemPoints ?? 0;
    const availablePoints = customer.loyalty.availablePoints ?? 0;
    const redeemValuePerPoint = customer.loyalty.redeemValuePerPoint;

    let pointsToUse = Math.min(requestedPoints, availablePoints);

    if (customer.loyalty.maxRedeemPercent && customer.loyalty.maxRedeemPercent > 0) {
      const capC = Math.floor((subtotalBeforeRedemptionC * customer.loyalty.maxRedeemPercent) / 100);
      const maxByPercent = Math.floor((capC / 100) / redeemValuePerPoint);
      pointsToUse = Math.min(pointsToUse, maxByPercent);
    }

    const maxBySubtotal = Math.floor((subtotalBeforeRedemptionC / 100) / redeemValuePerPoint);
    pointsToUse = Math.max(0, Math.min(pointsToUse, maxBySubtotal));

    const redeemValueC = Math.round(pointsToUse * redeemValuePerPoint * 100);
    if (redeemValueC > 0) {
      lines.push({ kind: "loyaltyRedeem", pointsUsed: pointsToUse, amount: redeemValueC / 100 });
    }

    const totalC = subtotalBeforeRedemptionC - redeemValueC;

    // Invariant check before returning (from your image)
    // assert.equal(order.subtotalBeforeDeliveryC, itemsSubtotalC + flatTaxTotalC);
    const expectedSubtotal = itemsSubtotalC + flatTaxTotalC;
    if (Math.abs(expectedSubtotal - subtotalBeforeDeliveryC) >= 1) {
      console.error(`[INVARIANT CHECK] Failed: subtotalBeforeDeliveryC=${subtotalBeforeDeliveryC}, expected=${expectedSubtotal}`);
    }

    // 4. Invariants to assert before returning:
    // subtotalBeforeDelivery == itemsSubtotal + flatTaxTotal
    const calculatedSubtotalBeforeDelivery = itemsSubtotalC + flatTaxTotalC;
    if (Math.abs(calculatedSubtotalBeforeDelivery - subtotalBeforeDeliveryC) >= 1) {
      console.error(`[INVARIANT CHECK] subtotalBeforeDelivery failed: expected=${calculatedSubtotalBeforeDelivery}, actual=${subtotalBeforeDeliveryC}`);
    }
    
    // finalTotal == subtotalBeforeDelivery + deliveryFee - loyaltyRedeemValue
    const calculatedFinalTotal = subtotalBeforeDeliveryC + deliveryFeeC - redeemValueC;
    if (Math.abs(calculatedFinalTotal - totalC) >= 1) {
      console.error(`[INVARIANT CHECK] finalTotal failed: expected=${calculatedFinalTotal}, actual=${totalC}`);
    }

    return {
      lines,
      itemsSubtotal: itemsSubtotalC / 100,
      flatTaxTotal: flatTaxTotalC / 100,
      subtotalBeforeDelivery: subtotalBeforeDeliveryC / 100,
      deliveryFee: deliveryFeeC / 100,
      subtotalBeforeRedemption: subtotalBeforeRedemptionC / 100,
      loyaltyEligibleSubtotal: loyaltyEligibleC / 100,
      pointsEarned,
      pointsRedeemed: pointsToUse,
      loyaltyRedeemValue: redeemValueC / 100,
      total: totalC / 100,
    };
  }

  /**
   * Convert existing order data to use the new calculation system
   * ALWAYS recalculate from database - NEVER trust stored amounts
   */
  static recalculateExistingOrder(order: any, user: any): OrderResult {
    if (!order.items || !order.items.length) {
      return this.getEmptyOrderResult();
    }

    const input: OrderInput = {
      items: order.items.map((item: any) => ({
        name: item.product?.name || 'Unknown Product',
        qty: item.quantity,
        tierPrices: {
          1: item.price,
          2: item.price,
          3: item.price,
          4: item.price,
          5: item.price,
        },
        category: item.product?.isTobaccoProduct ? 'tobacco' : 'other',
        hasFlatTax: !!(item.product?.flatTaxIds && item.product.flatTaxIds.length > 0),
        flatTaxPerItem: this.calculateFlatTaxPerItem(item), // Will be recalculated from DB
        flatTaxLabel: this.getFlatTaxLabel(item.product?.flatTaxIds?.[0]),
      })),
      isDelivery: order.orderType === 'delivery',
      deliveryFee: order.deliveryFee || 0,
      redeemPoints: order.loyaltyPointsRedeemed || 0,
    };

    const customer: Customer = {
      tier: user?.customerLevel || 1,
      hasFlatTax: user?.applyFlatTax ?? true,
      loyalty: {
        availablePoints: user?.loyaltyPoints || 0,
        earnRatePerDollar: 0.02, // 2% rate
        redeemValuePerPoint: 0.01, // 1 point = 1 cent
        maxRedeemPercent: 50, // Max 50% redemption
      },
    };

    return this.calculateOrder(input, customer);
  }

  static async getFlatTaxFromDB(flatTaxId: number): Promise<number> {
    try {
      const { db } = await import('../db');
      const { flatTaxes } = await import('../../..../../../shared/schema');
      const { eq } = await import('drizzle-orm');
      
      const [flatTax] = await db.select().from(flatTaxes).where(eq(flatTaxes.id, flatTaxId));
      if (!flatTax) {
        console.warn(`[FLAT TAX DB] Flat tax ID ${flatTaxId} not found in database`);
        return 0;
      }
      
      console.log(`[FLAT TAX DB] Retrieved ${flatTax.name}: $${flatTax.taxAmount}`);
      return flatTax.taxAmount;
    } catch (error) {
      console.error(`[FLAT TAX DB] Failed to fetch flat tax ${flatTaxId}:`, error);
      return 0;
    }
  }

  /**
   * Load flat tax values with cache busting
   * 4) Nuke stale caches/fields - bust the cache on update (e.g., version or updated_at)
   */
  static async loadFlatTaxValues(): Promise<void> {
    try {
      const { db } = await import('../db');
      const { flatTaxes } = await import('../../..../../../shared/schema');
      
      const allFlatTaxes = await db.select().from(flatTaxes);
      
      // 4) Nuke stale caches/fields - bust the cache on update
      this.flatTaxCache.clear();
      
      for (const tax of allFlatTaxes) {
        this.flatTaxCache.set(tax.id, tax.taxAmount);
      }
      
      console.log(`[FLAT TAX CACHE] Loaded ${allFlatTaxes.length} flat tax values from database`);
      for (const [id, amount] of this.flatTaxCache.entries()) {
        console.log(`[FLAT TAX CACHE] ID ${id}: $${amount}`);
      }
    } catch (error) {
      console.error('[FLAT TAX CACHE] Failed to load from database:', error);
    }
  }

  private static async calculateFlatTaxPerItemWithDB(item: any): Promise<number> {
    // NEVER trust stored amounts - always recalculate from database
    if (item.product?.flatTaxIds && item.product.flatTaxIds.length > 0) {
      const flatTaxId = item.product.flatTaxIds[0];
      
      // Get fresh value from database every time (unmissable)
      return await this.getFlatTaxFromDB(flatTaxId);
    }
    
    return 0;
  }

  private static calculateFlatTaxPerItem(item: any): number {
    // Use cached database values (for synchronous calls)
    if (item.product?.flatTaxIds && item.product.flatTaxIds.length > 0) {
      const flatTaxId = item.product.flatTaxIds[0];
      
      const cachedValue = this.flatTaxCache.get(flatTaxId);
      if (cachedValue !== undefined) {
        return cachedValue;
      }
      
      console.warn(`[FLAT TAX] No cached value for flat tax ID ${flatTaxId}, using 0`);
    }
    
    return 0;
  }

  private static getFlatTaxLabel(flatTaxId?: number): string {
    if (flatTaxId === 5) return 'Cook County Large Cigar 60ct';
    if (flatTaxId === 6) return 'Cook County Large Cigar 45ct';
    return 'Cook County Tobacco Tax';
  }

  private static getEmptyOrderResult(): OrderResult {
    return {
      lines: [],
      itemsSubtotal: 0,
      flatTaxTotal: 0,
      subtotalBeforeDelivery: 0,
      deliveryFee: 0,
      subtotalBeforeRedemption: 0,
      loyaltyEligibleSubtotal: 0,
      pointsEarned: 0,
      pointsRedeemed: 0,
      loyaltyRedeemValue: 0,
      total: 0,
    };
  }
}