import { storage } from "../storage";

export interface TaxCalculationRequest {
  orderId: number;
  customerId: string;
  customerLevel: number;
  applyFlatTax: boolean;
  items: {
    id: number;
    productId: number;
    productName: string;
    basePrice: number;
    quantity: number;
    taxPercentage?: number; // Individual item tax percentage
    isTobacco?: boolean;
    flatTaxIds?: number[]; // Product-specific flat tax assignments
  }[];
  county?: string;
  locationZipCode?: string;
}

export interface TaxCalculationResult {
  orderId: number;
  customerId: string;
  totalTaxAmount: number;
  itemTaxDetails: {
    productId: number;
    productName: string;
    basePrice: number;
    quantity: number;
    itemTotalBeforeTax: number;
    percentageTaxAmount: number;
    flatTaxAmount: number;
    totalTaxAmount: number;
    finalPricePerUnit: number;
    finalTotalPrice: number;
  }[];
  flatTaxesApplied: {
    taxId: number;
    taxName: string;
    taxAmount: number;
    appliedTo: string; // 'all' or specific product types
  }[];
  percentageTaxTotal: number;
  flatTaxTotal: number;
  tobaccoSalesTracking?: {
    tobaccoItems: {
      productId: number;
      productName: string;
      quantity: number;
      totalValue: number;
      taxAmount: number;
    }[];
    totalTobaccoValue: number;
    totalTobaccoTax: number;
  };
}

export class TaxCalculationService {
  
  /**
   * Calculate comprehensive tax for an order based on customer level and tax rules
   */
  static async calculateOrderTax(request: TaxCalculationRequest): Promise<TaxCalculationResult> {
    console.log('🧮 Starting tax calculation for order:', request.orderId);
    
    const result: TaxCalculationResult = {
      orderId: request.orderId,
      customerId: request.customerId,
      totalTaxAmount: 0,
      itemTaxDetails: [],
      flatTaxesApplied: [],
      percentageTaxTotal: 0,
      flatTaxTotal: 0
    };

    // Get all available flat taxes (county-specific, general, etc.)
    const availableFlatTaxes = await storage.getFlatTaxes();
    console.log(`📋 Found ${availableFlatTaxes.length} available flat taxes`);

    // Track tobacco items separately for IL-TP1 compliance
    const tobaccoItems: any[] = [];
    let totalTobaccoValue = 0;
    let totalTobaccoTax = 0;

    // Process each item in the order
    for (const item of request.items) {
      const itemTotalBeforeTax = item.basePrice * item.quantity;
      let percentageTaxAmount = 0;
      let flatTaxAmount = 0;

      // Calculate percentage-based tax (individual item tax %)
      if (item.taxPercentage && item.taxPercentage > 0) {
        percentageTaxAmount = itemTotalBeforeTax * (item.taxPercentage / 100);
        console.log(`  📊 Item ${item.productName}: ${item.taxPercentage}% tax = $${percentageTaxAmount.toFixed(2)}`);
      }

      // Calculate flat tax application based on customer level
      if (request.applyFlatTax) {
        // Apply relevant flat taxes to this item
        const applicableFlatTaxes = this.getApplicableFlatTaxes(
          availableFlatTaxes, 
          item, 
          request.county, 
          request.locationZipCode,
          request.customerLevel
        );

        for (const flatTax of applicableFlatTaxes) {
          const taxAmountForItem = this.calculateFlatTaxForItem(flatTax, item);
          flatTaxAmount += taxAmountForItem;
          
          // Track applied flat tax
          const existingFlatTax = result.flatTaxesApplied.find(ft => ft.taxId === flatTax.id);
          if (existingFlatTax) {
            existingFlatTax.taxAmount += taxAmountForItem;
          } else {
            result.flatTaxesApplied.push({
              taxId: flatTax.id,
              taxName: flatTax.name,
              taxAmount: taxAmountForItem,
              appliedTo: flatTax.applicableProducts || 'all'
            });
          }
        }
      }

      const totalTaxAmount = percentageTaxAmount + flatTaxAmount;
      const finalPricePerUnit = item.basePrice + (totalTaxAmount / item.quantity);
      const finalTotalPrice = itemTotalBeforeTax + totalTaxAmount;

      // Add to item details
      result.itemTaxDetails.push({
        productId: item.productId,
        productName: item.productName,
        basePrice: item.basePrice,
        quantity: item.quantity,
        itemTotalBeforeTax,
        percentageTaxAmount,
        flatTaxAmount,
        totalTaxAmount,
        finalPricePerUnit,
        finalTotalPrice
      });

      // Track tobacco items for IL-TP1 compliance
      if (item.isTobacco) {
        tobaccoItems.push({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          totalValue: finalTotalPrice,
          taxAmount: totalTaxAmount
        });
        totalTobaccoValue += finalTotalPrice;
        totalTobaccoTax += totalTaxAmount;
      }

      // Add to totals
      result.percentageTaxTotal += percentageTaxAmount;
      result.flatTaxTotal += flatTaxAmount;
      result.totalTaxAmount += totalTaxAmount;
    }

    // Add tobacco sales tracking if applicable
    if (tobaccoItems.length > 0) {
      result.tobaccoSalesTracking = {
        tobaccoItems,
        totalTobaccoValue,
        totalTobaccoTax
      };
    }

    console.log(`✅ Tax calculation complete. Total tax: $${result.totalTaxAmount.toFixed(2)}`);
    console.log(`   - Percentage tax: $${result.percentageTaxTotal.toFixed(2)}`);
    console.log(`   - Flat tax: $${result.flatTaxTotal.toFixed(2)}`);
    
    // Create audit trail
    await this.createTaxCalculationAudit(request, result);

    return result;
  }

  /**
   * Get flat taxes applicable to a specific item based on location and product type
   */
  private static getApplicableFlatTaxes(
    allFlatTaxes: any[], 
    item: any, 
    county?: string, 
    zipCode?: string,
    customerTier?: number
  ) {
    console.log(`🔍 [FLAT TAX DEBUG] Checking applicable taxes for product ${item.productId || item.id}:`, {
      productFlatTaxIds: item.flatTaxIds || item.product?.flatTaxIds,
      availableTaxIds: allFlatTaxes.map(t => t.id),
      customerTier,
      county
    });

    return allFlatTaxes.filter(tax => {
      // Check if tax is active
      if (!tax.isActive) return false;

      // Check customer tier restrictions
      if (tax.customerTiers && customerTier) {
        const applicableTiers = Array.isArray(tax.customerTiers) 
          ? tax.customerTiers 
          : JSON.parse(tax.customerTiers || '[]');
        
        if (applicableTiers.length > 0 && !applicableTiers.includes(customerTier)) {
          return false;
        }
      }

      // Check county restrictions
      if (tax.countyRestriction && county && tax.countyRestriction !== county) {
        return false;
      }

      // Check zip code restrictions (if implemented)
      if (tax.zipCodeRestriction && zipCode && tax.zipCodeRestriction !== zipCode) {
        return false;
      }

      // PRIORITY: Check if this tax is specifically assigned to this product via flat_tax_ids
      // Check both item.flatTaxIds and item.product.flatTaxIds for cart items
      const flatTaxIds = item.flatTaxIds || item.product?.flatTaxIds;
      
      // If flatTaxIds is explicitly null, this product should have NO flat taxes
      if (flatTaxIds === null || (item.product && item.product.flatTaxIds === null)) {
        console.log(`🚫 [FLAT TAX ASSIGNMENT] Product ${item.productId || item.id} has flat_tax_ids: null - NO FLAT TAXES should apply`);
        return false;
      }
      
      if (flatTaxIds && Array.isArray(flatTaxIds)) {
        const productHasTax = flatTaxIds.includes(tax.id);
        console.log(`🎯 [FLAT TAX ASSIGNMENT] Product ${item.productId || item.id} has flat_tax_ids: [${flatTaxIds.join(', ')}], checking tax ${tax.id}: ${productHasTax ? 'MATCH' : 'NO MATCH'}`);
        
        if (productHasTax) {
          console.log(`✅ Tax "${tax.name}" DIRECTLY ASSIGNED to product ${item.productId || item.id}`);
          return true;
        } else {
          console.log(`🚫 Tax "${tax.name}" NOT assigned to product ${item.productId || item.id} (not in flatTaxIds)`);
          return false;
        }
      }

      // FALLBACK: Check product applicability (legacy method)
      if (tax.applicableProducts) {
        // If specific products are listed, check if this item matches
        const applicableProducts = Array.isArray(tax.applicableProducts) 
          ? tax.applicableProducts 
          : JSON.parse(tax.applicableProducts || '[]');
        
        console.log(`🔍 [FALLBACK] Checking legacy applicableProducts for tax "${tax.name}":`, {
          taxId: tax.id,
          applicableProducts,
          itemProductId: item.productId,
          itemIsTobacco: item.isTobacco,
          productMatches: applicableProducts.includes(item.productId.toString()),
          allMatches: applicableProducts.includes('all'),
          tobaccoMatches: item.isTobacco && applicableProducts.includes('tobacco')
        });
        
        if (applicableProducts.length > 0) {
          const matches = applicableProducts.includes(item.productId.toString()) ||
                         applicableProducts.includes('all') ||
                         (item.isTobacco && applicableProducts.includes('tobacco'));
          console.log(`📋 [FALLBACK] Tax "${tax.name}" applies to item: ${matches}`);
          return matches;
        }
      }

      // Default: apply to all items if no restrictions
      return true;
    });
  }

  /**
   * Calculate flat tax amount for a specific item
   */
  private static calculateFlatTaxForItem(flatTax: any, item: any): number {
    if (flatTax.taxType === 'per_unit') {
      return flatTax.taxAmount * item.quantity;
    } else if (flatTax.taxType === 'percentage') {
      const itemTotal = item.basePrice * item.quantity;
      return itemTotal * (flatTax.taxAmount / 100);
    } else {
      // Fixed amount per order (divide among all applicable items)
      return flatTax.taxAmount;
    }
  }

  /**
   * Create IL-TP1 tobacco sales record for compliance tracking
   */
  static async createIlTp1TobaccoRecord(
    orderId: number,
    customerId: string,
    tobaccoItems: any[],
    totalTobaccoValue: number,
    totalTobaccoTax: number
  ) {
    if (tobaccoItems.length === 0) return;

    try {
      await storage.createIlTp1TobaccoSale({
        orderId,
        customerId,
        saleDate: new Date(),
        tobaccoProducts: JSON.stringify(tobaccoItems),
        totalTobaccoValue: totalTobaccoValue,
        totalTaxAmount: totalTobaccoTax,
        reportingPeriod: this.getCurrentReportingPeriod(),
        reportingStatus: 'pending'
      });
      
      console.log(`📋 Created IL-TP1 tobacco sales record for order ${orderId}`);
    } catch (error) {
      console.error('Failed to create IL-TP1 tobacco record:', error);
    }
  }

  /**
   * Create audit trail for tax calculations
   */
  private static async createTaxCalculationAudit(
    request: TaxCalculationRequest,
    result: TaxCalculationResult
  ) {
    try {
      await storage.createTaxCalculationAudit({
        orderId: request.orderId,
        customerId: request.customerId,
        customerLevel: request.customerLevel,
        applyFlatTax: request.applyFlatTax,
        calculationInput: JSON.stringify({
          items: request.items,
          county: request.county,
          locationZipCode: request.locationZipCode
        }),
        calculationResult: JSON.stringify({
          totalTaxAmount: result.totalTaxAmount,
          percentageTaxTotal: result.percentageTaxTotal,
          flatTaxTotal: result.flatTaxTotal,
          itemCount: result.itemTaxDetails.length
        }),
        percentageTaxApplied: result.percentageTaxTotal,
        flatTaxesApplied: JSON.stringify(result.flatTaxesApplied),
        totalTaxAmount: result.totalTaxAmount
      });
      
      console.log(`📋 Created tax calculation audit for order ${request.orderId}`);
    } catch (error) {
      console.error('Failed to create tax calculation audit:', error);
    }
  }

  /**
   * Get current reporting period for IL-TP1 (monthly)
   */
  private static getCurrentReportingPeriod(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    return `${year}-${month}`;
  }

  /**
   * Calculate tax-inclusive prices for products display
   * This ensures customers see final prices including taxes
   */
  static async calculateDisplayPrices(
    products: any[], 
    customerId: string, 
    customerLevel: number,
    applyFlatTax: boolean,
    county?: string
  ) {
    const user = await storage.getUser(customerId);
    if (!user) return products;

    const flatTaxes = await storage.getFlatTaxes();
    
    return products.map(product => {
      let displayPrice = product.price;
      let flatTaxAmount = 0;
      
      // Apply individual tax percentage if set (45% IL Tobacco Exercise Tax)
      if (product.taxPercentage && product.taxPercentage > 0) {
        displayPrice += displayPrice * (product.taxPercentage / 100);
      }

      // Apply flat taxes if enabled for customer
      if (applyFlatTax) {
        console.log(`🧮 [DISPLAY PRICES] Checking flat taxes for product ${product.id} (${product.name}):`, {
          productId: product.id,
          productName: product.name,
          productFlatTaxIds: product.flatTaxIds,
          isTobacco: product.isTobacco,
          applyFlatTax,
          customerLevel,
          county,
          availableFlatTaxes: flatTaxes.map(t => ({ id: t.id, name: t.name, amount: t.taxAmount, isActive: t.isActive }))
        });
        
        const applicableFlatTaxes = this.getApplicableFlatTaxes(
          flatTaxes,
          { 
            productId: product.id, 
            isTobacco: product.isTobacco,
            flatTaxIds: product.flatTaxIds // Include flat tax IDs for proper assignment
          },
          county,
          undefined,
          customerLevel
        );
        
        console.log(`📋 [DISPLAY PRICES] Found ${applicableFlatTaxes.length} applicable flat taxes for product ${product.id}:`, applicableFlatTaxes.map(t => ({ id: t.id, name: t.name, amount: t.taxAmount, taxType: t.taxType })));

        for (const flatTax of applicableFlatTaxes) {
          if (flatTax.taxType === 'per_unit') {
            flatTaxAmount += flatTax.taxAmount;
            displayPrice += flatTax.taxAmount;
          } else if (flatTax.taxType === 'percentage') {
            const flatPercentageAmount = displayPrice * (flatTax.taxAmount / 100);
            flatTaxAmount += flatPercentageAmount;
            displayPrice += flatPercentageAmount;
          }
        }
      }

      return {
        ...product,
        displayPrice: Math.round(displayPrice * 100) / 100,
        originalPrice: product.price,
        hasTaxIncluded: displayPrice !== product.price,
        flatTaxAmount: Math.round(flatTaxAmount * 100) / 100,
        hasIlTobaccoTax: product.isTobacco && product.taxPercentage > 0
      };
    });
  }

  /**
   * Calculate final order pricing with all taxes included
   * Example: Item A $50 + $18 flat tax = $68 total price
   */
  static async calculateOrderPricing(
    items: any[],
    customerId: string,
    customerLevel: number,
    applyFlatTax: boolean,
    county?: string
  ) {
    const enhancedProducts = await this.calculateDisplayPrices(
      items.map(item => item.product || item),
      customerId,
      customerLevel,
      applyFlatTax,
      county
    );

    return items.map((item, index) => {
      const enhancedProduct = enhancedProducts[index];
      const quantity = item.quantity || 1;
      const totalPrice = enhancedProduct.displayPrice * quantity;
      const totalFlatTax = enhancedProduct.flatTaxAmount * quantity;

      return {
        ...item,
        basePrice: enhancedProduct.originalPrice,
        unitPriceWithTax: enhancedProduct.displayPrice,
        totalPrice: Math.round(totalPrice * 100) / 100,
        totalFlatTax: Math.round(totalFlatTax * 100) / 100,
        hasIlTobaccoTax: enhancedProduct.hasIlTobaccoTax,
        taxBreakdown: {
          basePrice: enhancedProduct.originalPrice * quantity,
          percentageTax: enhancedProduct.hasIlTobaccoTax ? 
            (enhancedProduct.displayPrice - enhancedProduct.originalPrice - enhancedProduct.flatTaxAmount) * quantity : 0,
          flatTax: totalFlatTax,
          finalTotal: totalPrice
        }
      };
    });
  }

  /**
   * Check if order contains tobacco products for invoice message
   */
  static hasIlTobaccoProducts(items: any[]): boolean {
    return items.some(item => 
      (item.product?.isTobacco || item.isTobacco) && 
      (item.product?.taxPercentage > 0 || item.taxPercentage > 0)
    );
  }
}