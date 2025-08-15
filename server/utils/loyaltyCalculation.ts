// Drop-in loyalty calculation (cents-safe) from your image

// Cents-safe conversion utilities
const toC = (n: number): number => Math.round(n * 100);
const fromC = (c: number): number => c / 100;

/**
 * Loyalty points calculation: 2% of non-tobacco items only, excluding taxes & delivery
 * From your image: If this $33.50 is tobacco, points = 0
 * If it's non-tobacco, points = floor(33.50 * 2) = 67
 */
export function calculateLoyaltyPoints(order: any): number {
  // Build eligible subtotal from item lines only (non-tobacco)
  const eligibleC = order.lines
    .filter((l: any) => l.kind === "item" && l.category !== "tobacco")
    .reduce((s: number, l: any) => s + toC(l.lineTotal), 0);

  // 2% back with 1 point = $0.01 → 2 pts per $1
  const loyaltyPointsEarned = Math.floor(fromC(eligibleC) * 2);

  return loyaltyPointsEarned;
}

/**
 * Invariants validation before returning
 * From your image: 4. Invariants to assert before returning:
 * - subtotalBeforeDelivery == itemsSubtotal + flatTaxTotal
 * - finalTotal == subtotalBeforeDelivery + deliveryFee - loyaltyRedeemValue
 */
export function validateInvariants(breakdown: any): boolean {
  const {
    itemsSubtotal,
    flatTaxTotal,
    subtotalBeforeDelivery,
    deliveryFee,
    loyaltyRedeemValue,
    finalTotal
  } = breakdown;

  // First invariant
  const expectedSubtotalBeforeDelivery = itemsSubtotal + flatTaxTotal;
  if (Math.abs(expectedSubtotalBeforeDelivery - subtotalBeforeDelivery) >= 0.01) {
    console.error(`[INVARIANT] subtotalBeforeDelivery failed: expected=${expectedSubtotalBeforeDelivery}, actual=${subtotalBeforeDelivery}`);
    return false;
  }

  // Second invariant
  const expectedFinalTotal = subtotalBeforeDelivery + (deliveryFee || 0) - (loyaltyRedeemValue || 0);
  if (Math.abs(expectedFinalTotal - finalTotal) >= 0.01) {
    console.error(`[INVARIANT] finalTotal failed: expected=${expectedFinalTotal}, actual=${finalTotal}`);
    return false;
  }

  console.log('[INVARIANT] All checks passed');
  return true;
}