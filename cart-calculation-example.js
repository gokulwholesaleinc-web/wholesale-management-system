// REAL B2B CART CALCULATION EXAMPLE - ORDER #10
// Shows how the new OrderCalculationService works with actual data from live system

const realCartExample = {
  // Customer Information (Real Data)
  customer: {
    id: 'cust_mbpxj6vffmc',
    username: 'test1',
    company: 'My Company', 
    tier: 1,                    // Customer pricing tier (1-5)
    hasFlatTax: true,          // Applies Cook County flat taxes
    loyaltyPoints: 150,        // Available loyalty points
    applyFlatTax: true         // Flat tax eligibility
  },

  // Cart Items (REAL ORDER #10 - Just Created)
  cartItems: [
    {
      productId: 819,
      name: 'testtob',
      category: 'tobacco',
      isTobaccoProduct: true,
      quantity: 2,              // 2 items!
      unitPrice: 33.50,         // Tier 1 price  
      flatTaxIds: [5],          // Cook County Large Cigar 60ct
      flatTaxPerItem: 15.00     // $15.00 per item flat tax
    },
    {
      productId: 522,
      name: '1.25 Job Rolling Paper (24 booklets)',
      category: 'tobacco-accessories', 
      isTobaccoProduct: false,  // Non-tobacco = earns loyalty points
      quantity: 1,
      unitPrice: 43.55,         // Tier 1 price
      flatTaxIds: null,         // No flat tax
      flatTaxPerItem: 0
    },
    {
      productId: 27,
      name: 'Coca-Cola Bottles (20oz, 24ct)',
      category: 'beverages',
      isTobaccoProduct: false,  // Non-tobacco = earns loyalty points  
      quantity: 1,
      unitPrice: 32.00,         // Tier 1 price
      flatTaxIds: null,         // No flat tax
      flatTaxPerItem: 0
    }
  ],

  // Order Options
  orderOptions: {
    orderType: 'pickup',       // 'pickup' or 'delivery'
    deliveryFee: 0,           // $0 for pickup, $15+ for delivery
    redeemPoints: 0           // Loyalty points to redeem
  }
};

// LIVE CALCULATION RESULTS FROM ORDER #10
const actualCalculationResults = {
  // Step 1: Items Subtotal (unit price × quantity for each item)
  itemsSubtotal: 142.55,      // $67.00 + $43.55 + $32.00
  
  // Step 2: Flat Taxes (only for items with flatTaxIds and customer.hasFlatTax = true)  
  flatTaxBreakdown: [
    {
      label: 'Cook County Large Cigar 60ct', 
      amount: 30.00,          // 2 × $15.00 (testtob quantity = 2)
      appliesTo: 'testtob (qty: 2)'
    }
  ],
  flatTaxTotal: 30.00,        // $30.00 total
  
  // Step 3: Subtotal Before Delivery
  subtotalBeforeDelivery: 172.55,  // $142.55 + $30.00
  
  // Step 4: Delivery Fee  
  deliveryFee: 0,             // Pickup = $0
  
  // Step 5: Subtotal Before Redemption
  subtotalBeforeRedemption: 172.55, // $172.55 + $0
  
  // Step 6: Loyalty Points Calculation
  loyaltyEligibleSubtotal: 75.55,   // Only non-tobacco items ($43.55 + $32.00)
  pointsEarned: 1,                  // Math.floor(75.55 × 0.02) = 1 point
  
  // Step 7: Loyalty Redemption (none in this example)
  pointsRedeemed: 0,
  loyaltyRedeemValue: 0,
  
  // Step 8: Final Total
  total: 172.55               // $172.55 - $0 redemption
};

// B2B BUSINESS RULES ENFORCED:
const businessRules = {
  salesTax: 0,                // ✅ B2B = NO sales tax ever
  flatTaxLogic: 'customer.hasFlatTax && item.flatTaxIds.length > 0',
  loyaltyEarning: 'exclude tobacco products and tax lines',  
  loyaltyRedemption: 'max 50% of subtotal',
  tierPricing: 'customer.tier determines unit prices',
  centBasedMath: 'eliminates floating-point errors'
};

// ACTUAL ORDER DISPLAY (Real Order #10):
const actualOrderDisplay = {
  itemsSection: [
    { line: 'testtob (2 × $33.50)', amount: '$67.00' },
    { line: '1.25 Job Rolling Paper (24 booklets) (1 × $43.55)', amount: '$43.55' },  
    { line: 'Coca-Cola Bottles (20oz, 24ct) (1 × $32.00)', amount: '$32.00' }
  ],
  
  calculationSection: [
    { line: 'Items Subtotal:', amount: '$142.55' },
    { line: 'Cook County Large Cigar 60ct:', amount: '$30.00', color: 'text-purple-700' },
    { line: 'Subtotal (Items + Taxes):', amount: '$172.55', weight: 'font-medium' },
    { line: 'Delivery Fee:', amount: '$0.00' },
    { line: 'Total:', amount: '$172.55', weight: 'font-bold text-lg' }
  ],
  
  loyaltySection: {
    line: 'Loyalty Points Earned:',
    amount: '1 point', 
    note: '(from $75.55 non-tobacco subtotal)',
    style: 'bg-green-50 text-green-600'
  }
};

// ✅ FIXED: FLAT TAX CALCULATION NOW USES CORRECT DATABASE VALUES
console.log('🛒 CORRECTED B2B CART CALCULATION');
console.log('=====================================');
console.log('ISSUE FOUND: System was using hardcoded $15.00 instead of database $18.00');
console.log('SOLUTION: Updated OrderCalculationService to use actual flat tax values');
console.log('');
console.log('DATABASE VALUES:');
console.log('• Cook County Large Cigar 60ct: $18.00 (was hardcoded as $15.00)');
console.log('• Cook County Large Cigar 45ct: $13.50 (correct)');
console.log('');
console.log('NEW CALCULATION (Order #11 with 1 × testtob):');
console.log('• testtob (tobacco): 1 × $33.50 = $33.50');
console.log('• Cook County Large Cigar 60ct: 1 × $18.00 = $18.00'); 
console.log('• Final Total: $51.50 (instead of $48.50)');

export { realCartExample, actualCalculationResults, businessRules, actualOrderDisplay };