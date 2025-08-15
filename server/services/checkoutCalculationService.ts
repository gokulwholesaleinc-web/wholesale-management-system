// Checkout-Time Calculation Service 
// Implements true "single source of truth" with database lookups
// NEVER trusts stored amounts - always recalculates from database

import { db } from '../db';
import { flatTaxes } from '../../..../../../shared/schema';
import { eq } from 'drizzle-orm';

export interface CheckoutItem {
  productId: number;
  quantity: number;
  price: number;
  product?: {
    name: string;
    flatTaxIds?: number[];
    isTobaccoProduct?: boolean;
  };
}

export interface CheckoutResult {
  itemsSubtotal: number;
  flatTaxLines: Array<{ label: string; amount: number }>;
  flatTaxTotal: number;
  total: number;
  calculationSnapshot?: {
    timestamp: Date;
    orderFinalized: boolean;
    flatTaxValues: Array<{ id: number; amount: number }>;
  };
}

export class CheckoutCalculationService {
  /**
   * Recalculate at checkout-time - don't trust stored amounts
   * This implements the exact pattern from your image
   */
  static async calculateCheckoutTotals(
    items: CheckoutItem[],
    customer: { hasFlatTax: boolean; customerLevel: number }
  ): Promise<CheckoutResult> {
    
    // Following exact pattern from image: const flatTaxLines = [];
    const flatTaxLines: Array<{ label: string; amount: number }> = [];
    let flatTaxTotalC = 0;
    let itemsSubtotalC = 0;

    // 1) Calculate items subtotal
    for (const item of items) {
      itemsSubtotalC += Math.round(item.price * item.quantity * 100);
    }

    // 2) Recalculate flat taxes from database (exact pattern from image)
    // for (const line of order.items) {
    for (const line of items) {
      if (customer.hasFlatTax && line.product?.flatTaxIds && line.product.flatTaxIds.length > 0) {
        const flatTaxId = line.product.flatTaxIds[0];
        
        // const { label, amount } = getFlatTaxOrThrow(db, line.flatTaxId);
        const { label, amount } = await this.getFlatTaxOrThrow(flatTaxId);
        // const amtC = Math.round(amount * 100) * line.quantity;
        const amtC = Math.round(amount * line.quantity * 100);
        
        // flatTaxLines.push({ label, amount: amtC / 100 });
        flatTaxLines.push({ label, amount: amtC / 100 });
        // flatTaxTotalC += amtC;
        flatTaxTotalC += amtC;
      }
    }

    const totalC = itemsSubtotalC + flatTaxTotalC;

    return {
      itemsSubtotal: itemsSubtotalC / 100,
      flatTaxLines,
      flatTaxTotal: flatTaxTotalC / 100,
      total: totalC / 100,
    };
  }

  /**
   * Database lookup that ensures values are current
   * Makes the DB lookup unmissable as shown in your image
   * Implements getFlatTaxOrThrow(db, flatTaxId) pattern
   */
  private static async getFlatTaxOrThrow(flatTaxId: number): Promise<{ label: string; amount: number }> {
    // Direct SQL verification to make DB lookup unmissable
    const [flatTax] = await db.select().from(flatTaxes).where(eq(flatTaxes.id, flatTaxId));
    
    if (!flatTax) {
      throw new Error(`Flat tax ID ${flatTaxId} not found in database`);
    }

    console.log(`[CHECKOUT RECALC] Retrieved ${flatTax.name}: $${flatTax.taxAmount}`);
    
    return {
      label: flatTax.name,
      amount: flatTax.taxAmount, // Direct from database - never cached/stored
    };
  }

  /**
   * Verification method as suggested in image: "Make the DB lookup unmissable"
   * In SQL, verify: SELECT id, label, amount FROM flat_taxes WHERE id IN (5,6);
   */
  static async verifyFlatTaxConfiguration(): Promise<void> {
    const allFlatTaxes = await db.select().from(flatTaxes);
    console.log(`[DB VERIFICATION] Found ${allFlatTaxes.length} flat tax configurations:`);
    
    for (const tax of allFlatTaxes) {
      console.log(`[DB VERIFICATION] ID ${tax.id}: ${tax.name} = $${tax.taxAmount}`);
    }
  }

  /**
   * Verify flat tax configuration for checkout
   * As suggested in your image - ensure correct flatTaxId mapping
   */
  static async verifyFlatTaxMapping(productId: number, expectedFlatTaxId: number): Promise<boolean> {
    try {
      const { products } = await import('../../..../../../shared/schema');
      const [product] = await db.select().from(products).where(eq(products.id, productId));
      
      if (!product || !product.flatTaxIds) {
        return false;
      }

      return product.flatTaxIds.includes(expectedFlatTaxId);
    } catch (error) {
      console.error(`[FLAT TAX VERIFY] Error checking product ${productId}:`, error);
      return false;
    }
  }
}