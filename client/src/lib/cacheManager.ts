// Enhanced Cache Manager for Gokul Wholesale App
// Handles cache management with localStorage fallback when Service Workers aren't available

class CacheManager {
  private isInitialized = false;
  private cacheVersion = 'v1.0.3';
  private updateCheckInterval: number | null = null;
  
  // Different cache durations for different data types
  private cacheDurations = {
    cart: 24 * 60 * 60 * 1000,  // 24 hours - cart data should persist across sessions
    products: 15 * 60 * 1000,   // 15 minutes - products don't change often
    orders: 10 * 60 * 1000,     // 10 minutes - order status updates
    user: 30 * 60 * 1000,       // 30 minutes - user data rarely changes
    categories: 60 * 60 * 1000,  // 1 hour - categories very stable
    stats: 2 * 60 * 1000,       // 2 minutes - business stats need frequent updates
    dashboard: 2 * 60 * 1000,   // 2 minutes - admin dashboard data
    analytics: 2 * 60 * 1000,   // 2 minutes - analytics data
    default: 10 * 60 * 1000     // 10 minutes - general default
  };

  constructor() {
    this.initialize();
  }

  private async initialize() {
    if (this.isInitialized) {
      return;
    }

    console.log('Initializing cache management system...');
    
    // Use localStorage-based caching for reliable performance
    this.startCacheManagement();
    this.isInitialized = true;
    
    console.log('Cache management system initialized');
  }

  private startCacheManagement() {
    // Clear old cache entries on startup
    this.clearExpiredCache();
    
    // Start periodic cache validation and auto-refresh
    this.updateCheckInterval = window.setInterval(async () => {
      this.clearExpiredCache();
      await this.autoRefreshStaleCache();
      this.validateCacheIntegrity();
    }, 2 * 60 * 1000); // Check every 2 minutes
    
    // Initial auto-refresh after page load
    setTimeout(async () => {
      await this.autoRefreshStaleCache();
    }, 10000); // Wait 10 seconds after page load
  }

  // Cache data with timestamp
  public setCache(key: string, data: any): void {
    try {
      const cacheEntry = {
        data,
        timestamp: Date.now(),
        version: this.cacheVersion
      };
      localStorage.setItem(`cache-${key}`, JSON.stringify(cacheEntry));
    } catch (error) {
      console.warn('Failed to set cache:', error);
    }
  }

  // Get appropriate cache duration based on data type
  private getCacheDuration(key: string): number {
    if (key.includes('cart')) return this.cacheDurations.cart;
    if (key.includes('products')) return this.cacheDurations.products;
    if (key.includes('orders')) return this.cacheDurations.orders;
    if (key.includes('user') || key.includes('auth')) return this.cacheDurations.user;
    if (key.includes('categories')) return this.cacheDurations.categories;
    return this.cacheDurations.default;
  }

  // Retrieve cached data if still valid
  public getCache(key: string): any | null {
    try {
      const cached = localStorage.getItem(`cache-${key}`);
      if (!cached) return null;

      const { data, timestamp, version } = JSON.parse(cached);
      const maxAge = this.getCacheDuration(key);
      
      // Check if cache is expired or version mismatch
      if (Date.now() - timestamp > maxAge || version !== this.cacheVersion) {
        localStorage.removeItem(`cache-${key}`);
        return null;
      }

      return data;
    } catch (error) {
      console.warn('Failed to get cache:', error);
      return null;
    }
  }

  // Clear specific cache entry
  public clearCache(key: string): void {
    localStorage.removeItem(`cache-${key}`);
  }

  // Clear all cache entries
  public clearAllCache(): void {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('cache-')) {
        localStorage.removeItem(key);
      }
    });
    console.log('All cache cleared');
  }

  // Detect potential browser cache issues with API endpoints
  public detectBrowserCacheIssues(): boolean {
    const currentVersion = this.cacheVersion;
    const storedVersion = localStorage.getItem('app-version');
    
    if (!storedVersion || storedVersion !== currentVersion) {
      console.warn('App version mismatch detected - browser cache may need clearing');
      localStorage.setItem('app-version', currentVersion);
      return true;
    }
    
    return false;
  }

  // Show browser cache notification if needed
  public showCacheNotificationIfNeeded(): void {
    if (this.detectBrowserCacheIssues()) {
      console.log('Browser cache notification: App version updated, consider clearing cache if experiencing issues');
    }
  }

  // Clear expired cache entries but protect authentication data
  private clearExpiredCache(): void {
    const keys = Object.keys(localStorage);
    let removedCount = 0;
    
    // Authentication keys that should never be cleared by cache manager
    const authKeys = ['authToken', 'gokul_auth_data', 'userData', 'rememberMe'];

    keys.forEach(key => {
      // Skip authentication and user data - never clear these
      if (authKeys.some(authKey => key.includes(authKey))) {
        return;
      }
      
      if (key.startsWith('cache-')) {
        try {
          const cached = localStorage.getItem(key);
          if (cached) {
            const { timestamp, version } = JSON.parse(cached);
            const cacheKey = key.replace('cache-', '');
            const maxAge = this.getCacheDuration(cacheKey);
            
            if (Date.now() - timestamp > maxAge || version !== this.cacheVersion) {
              localStorage.removeItem(key);
              removedCount++;
            }
          }
        } catch (error) {
          // Remove corrupted cache entries
          localStorage.removeItem(key);
          removedCount++;
        }
      }
    });

    if (removedCount > 0) {
      console.log(`Cleared ${removedCount} expired cache entries (protected auth data)`);
    }
  }

  // Validate cache integrity for critical endpoints
  private async validateCacheIntegrity(): Promise<void> {
    // Skip validation during initial load to avoid server errors
    if (document.readyState !== 'complete') {
      return;
    }

    // Check for version changes in localStorage
    const lastKnownVersion = localStorage.getItem('app_data_version');
    const currentVersion = new Date().toDateString(); // Daily version check
    
    if (lastKnownVersion !== currentVersion) {
      console.log('Data version changed, clearing all cache for fresh data');
      this.clearAllCache();
      localStorage.setItem('app_data_version', currentVersion);
    }
  }

  // Force refresh specific cache
  public async refreshCache(key: string): Promise<any> {
    this.clearCache(key);
    
    try {
      const response = await fetch(key, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        this.setCache(key, data);
        this.broadcastCacheUpdate(key);
        return data;
      }
    } catch (error) {
      console.warn(`Failed to refresh cache for ${key}:`, error);
    }
    
    return null;
  }

  // Broadcast cache updates to other components
  private broadcastCacheUpdate(key: string): void {
    window.dispatchEvent(new CustomEvent('cacheUpdated', { 
      detail: { key, timestamp: Date.now() } 
    }));
  }

  // Automatically refresh stale cache for all users
  private async autoRefreshStaleCache(): Promise<void> {
    const criticalEndpoints = [
      '/api/admin-stats-data',
      '/api/products', 
      '/api/cart',
      '/api/orders',
      '/api/categories'
    ];

    for (const endpoint of criticalEndpoints) {
      const cached = this.getCache(endpoint);
      if (cached) {
        const duration = this.getCacheDuration(endpoint);
        const cacheAge = Date.now() - cached.timestamp;
        
        // If cache is more than 75% of its expiry time, refresh it
        if (cacheAge > duration * 0.75) {
          try {
            await this.refreshCache(endpoint);
            console.log(`Auto-refreshed cache for ${endpoint}`);
          } catch (error) {
            // Silently handle refresh errors to avoid disrupting user experience
            console.debug(`Auto-refresh failed for ${endpoint}:`, error);
          }
        }
      }
    }
  }

  // Force invalidate cache when data changes
  public invalidateRelatedCache(dataType: string): void {
    const cacheInvalidationMap: { [key: string]: string[] } = {
      'products': ['/api/products', '/api/admin-stats-data'],
      'orders': ['/api/orders', '/api/admin-stats-data', '/api/cart'],
      'users': ['/api/users', '/api/admin-stats-data'],
      'categories': ['/api/categories', '/api/products'],
      'cart': ['/api/cart'],
      'stats': ['/api/admin-stats-data']
    };

    const cachesToInvalidate = cacheInvalidationMap[dataType] || [];
    cachesToInvalidate.forEach(cacheKey => {
      this.clearCache(cacheKey);
      console.log(`Invalidated cache for ${cacheKey} due to ${dataType} change`);
    });
  }

  // Clear admin-specific cache data
  public clearAdminCache(): void {
    const adminKeys = [
      '/api/business-stats',
      '/api/dashboard-stats', 
      '/api/analytics',
      '/api/admin/stats',
      '/api/orders',
      '/api/users'
    ];
    
    adminKeys.forEach(key => {
      this.clearCache(key);
    });
    
    console.log('Admin cache cleared');
  }

  // Show update notification to user
  private showUpdatePrompt(): void {
    // Create a simple notification
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #4CAF50;
      color: white;
      padding: 15px;
      border-radius: 5px;
      z-index: 10000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      font-family: Arial, sans-serif;
    `;
    notification.innerHTML = `
      <div>App updated! <button onclick="location.reload()" style="margin-left: 10px; padding: 5px 10px; background: white; color: #4CAF50; border: none; border-radius: 3px; cursor: pointer;">Refresh</button></div>
    `;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 10000);
  }

  // Cleanup
  public destroy(): void {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
    }
  }
}

// Create global instance
const cacheManager = new CacheManager();

// Make it available globally for debugging
(window as any).cacheManager = cacheManager;

export default cacheManager;