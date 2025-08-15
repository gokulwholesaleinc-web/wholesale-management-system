// Cache Management Service
// Implements cache busting and stale data prevention as outlined in your image

export class CacheService {
  private static flatTaxCacheVersion = 1;
  private static lastUpdateTime = new Date();
  
  /**
   * 4) Nuke stale caches/fields
   * If you cache flat taxes, bust the cache on update (e.g., version or updated_at)
   */
  static bustFlatTaxCache(): void {
    this.flatTaxCacheVersion++;
    this.lastUpdateTime = new Date();
    
    console.log(`[CACHE BUST] Flat tax cache version updated to ${this.flatTaxCacheVersion} at ${this.lastUpdateTime.toISOString()}`);
    
    // Clear any existing caches
    const { OrderCalculationService } = require('./orderCalculationService');
    if (OrderCalculationService.flatTaxCache) {
      OrderCalculationService.flatTaxCache.clear();
    }
  }
  
  /**
   * Stop reading order_item.flatTaxAmount during calculation
   * A) Remove it, or B) Only populate it at finalization and ignore it for drafts
   */
  static shouldIgnoreStoredFlatTax(orderStatus: string): boolean {
    // Only trust stored values for finalized orders
    return orderStatus !== 'completed' && orderStatus !== 'finalized';
  }
  
  /**
   * Cache validation - ensure we're not using stale data
   */
  static validateCacheVersion(currentVersion?: number): boolean {
    if (!currentVersion) {
      return false; // No version = stale
    }
    
    return currentVersion >= this.flatTaxCacheVersion;
  }
  
  /**
   * Get current cache metadata
   */
  static getCacheMetadata() {
    return {
      version: this.flatTaxCacheVersion,
      lastUpdate: this.lastUpdateTime,
      isStale: false
    };
  }
}