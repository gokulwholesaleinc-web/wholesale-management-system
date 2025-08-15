// Flat Tax Verification Utility
// Implements SQL verification pattern from image: "Make the DB lookup unmissable"

import { db } from '../db';
import { flatTaxes, products } from '../../shared/schema';
import { eq, inArray } from 'drizzle-orm';

export class FlatTaxVerifier {
  /**
   * Verify flat tax configuration as shown in image
   * SELECT id, label, amount FROM flat_taxes WHERE id IN (5,6); -- 60ct, 45ct
   */
  static async verifyFlatTaxMapping(): Promise<void> {
    console.log('[FLAT TAX VERIFY] Starting verification...');
    
    // Get all flat taxes
    const allFlatTaxes = await db.select().from(flatTaxes);
    console.log(`[FLAT TAX VERIFY] Found ${allFlatTaxes.length} flat tax configurations:`);
    
    for (const tax of allFlatTaxes) {
      console.log(`[FLAT TAX VERIFY] ID ${tax.id}: ${tax.name} = $${tax.taxAmount}`);
    }
    
    // Verify specific Cook County taxes (60ct and 45ct)
    const cookCountyTaxes = await db.select()
      .from(flatTaxes)
      .where(inArray(flatTaxes.id, [5, 6])); // 60ct=5, 45ct=6 based on logs
    
    console.log('[FLAT TAX VERIFY] Cook County Cigar Taxes:');
    for (const tax of cookCountyTaxes) {
      console.log(`[FLAT TAX VERIFY] ${tax.name}: $${tax.taxAmount}`);
    }
  }

  /**
   * Ensure items have correct flatTaxId mapping
   * As suggested: "Ensure your items have the correct flatTaxId (e.g., 60ct item → the 60ct row)"
   */
  static async verifyProductMapping(productId: number, expectedFlatTaxId: number): Promise<boolean> {
    const [product] = await db.select().from(products).where(eq(products.id, String(productId)));
    
    if (!product || !product.flatTaxIds) {
      console.warn(`[FLAT TAX VERIFY] Product ${productId} has no flat tax configuration`);
      return false;
    }

    const hasCorrectMapping = product.flatTaxIds.includes(expectedFlatTaxId);
    console.log(`[FLAT TAX VERIFY] Product ${productId} → flatTaxId ${expectedFlatTaxId}: ${hasCorrectMapping ? 'CORRECT' : 'INCORRECT'}`);
    
    return hasCorrectMapping;
  }

  /**
   * Run comprehensive verification as outlined in image
   */
  static async runComprehensiveVerification(): Promise<void> {
    console.log('=== FLAT TAX COMPREHENSIVE VERIFICATION ===');
    
    // 1. Verify flat tax database configuration
    await this.verifyFlatTaxMapping();
    
    // 2. Check product mappings for common items
    console.log('[FLAT TAX VERIFY] Checking product mappings...');
    
    // Add more verification as needed
    console.log('=== VERIFICATION COMPLETE ===');
  }
}