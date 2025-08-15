// Offline Manager for handling offline functionality
export class OfflineManager {
  private db: IDBDatabase | null = null;
  private isOnline = navigator.onLine;
  private syncInProgress = false;
  private syncTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.initDB();
    this.setupEventListeners();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('GokulOfflineDB', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        if (!db.objectStoreNames.contains('pendingOrders')) {
          db.createObjectStore('pendingOrders', { keyPath: 'id', autoIncrement: true });
        }
        
        if (!db.objectStoreNames.contains('pendingInventory')) {
          db.createObjectStore('pendingInventory', { keyPath: 'id', autoIncrement: true });
        }
        
        if (!db.objectStoreNames.contains('cachedData')) {
          db.createObjectStore('cachedData', { keyPath: 'key' });
        }
        
        if (!db.objectStoreNames.contains('pendingCartChanges')) {
          db.createObjectStore('pendingCartChanges', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  private setupEventListeners(): void {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingChanges();
    });
    
    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // Save order to be synced later
  async saveOrderOffline(orderData: any, authToken: string): Promise<string> {
    if (!this.db) await this.initDB();
    
    const tx = this.db!.transaction(['pendingOrders'], 'readwrite');
    const store = tx.objectStore('pendingOrders');
    
    const pendingOrder = {
      data: orderData,
      authToken,
      timestamp: Date.now(),
      type: 'create'
    };
    
    const result = await new Promise<IDBValidKey>((resolve, reject) => {
      const request = store.add(pendingOrder);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    
    // Register for background sync if available
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.ready;
        // Background sync is not universally supported, so we'll handle manual sync
      } catch (error) {
        console.log('Background sync not available, using manual sync');
      }
    }
    
    return `offline-order-${result}`;
  }

  // Save inventory changes to be synced later
  async saveInventoryChangeOffline(productId: string, changes: any, authToken: string): Promise<void> {
    if (!this.db) await this.initDB();
    
    const tx = this.db!.transaction(['pendingInventory'], 'readwrite');
    const store = tx.objectStore('pendingInventory');
    
    const pendingChange = {
      productId,
      data: changes,
      authToken,
      timestamp: Date.now(),
      type: 'update'
    };
    
    await new Promise<void>((resolve, reject) => {
      const request = store.add(pendingChange);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    

  }

  // Save cart changes offline
  async saveCartChangeOffline(cartData: any, authToken: string): Promise<void> {
    if (!this.db) await this.initDB();
    
    const tx = this.db!.transaction(['pendingCartChanges'], 'readwrite');
    const store = tx.objectStore('pendingCartChanges');
    
    const pendingChange = {
      data: cartData,
      authToken,
      timestamp: Date.now(),
      type: 'cart-update'
    };
    
    await new Promise<void>((resolve, reject) => {
      const request = store.add(pendingChange);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Cache data for offline access
  async cacheData(key: string, data: any): Promise<void> {
    if (!this.db) await this.initDB();
    
    const tx = this.db!.transaction(['cachedData'], 'readwrite');
    const store = tx.objectStore('cachedData');
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put({ key, data, timestamp: Date.now() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Get cached data
  async getCachedData(key: string): Promise<any | null> {
    if (!this.db) await this.initDB();
    
    const tx = this.db!.transaction(['cachedData'], 'readonly');
    const store = tx.objectStore('cachedData');
    
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Get pending operations count
  async getPendingOperationsCount(): Promise<{ orders: number; inventory: number; cart: number }> {
    if (!this.db) await this.initDB();
    
    const [orders, inventory, cart] = await Promise.all([
      this.getStoreCount('pendingOrders'),
      this.getStoreCount('pendingInventory'),
      this.getStoreCount('pendingCartChanges')
    ]);
    
    return { orders, inventory, cart };
  }

  private async getStoreCount(storeName: string): Promise<number> {
    const tx = this.db!.transaction([storeName], 'readonly');
    const store = tx.objectStore(storeName);
    
    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Manually trigger sync
  async syncPendingChanges(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return;
    
    this.syncInProgress = true;
    
    try {
      await Promise.all([
        this.syncPendingOrders(),
        this.syncPendingInventory(),
        this.syncPendingCartChanges()
      ]);
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncPendingOrders(): Promise<void> {
    if (!this.db) return;
    
    const tx = this.db.transaction(['pendingOrders'], 'readwrite');
    const store = tx.objectStore('pendingOrders');
    const orders = await this.getAllFromStore(store);
    
    for (const order of orders) {
      try {
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${order.authToken}`
          },
          body: JSON.stringify(order.data)
        });
        
        if (response.ok) {
          await this.deleteFromStore(store, order.id);
        }
      } catch (error) {
        console.error('Failed to sync order:', order.id, error);
      }
    }
  }

  private async syncPendingInventory(): Promise<void> {
    if (!this.db) return;
    
    const tx = this.db.transaction(['pendingInventory'], 'readwrite');
    const store = tx.objectStore('pendingInventory');
    const changes = await this.getAllFromStore(store);
    
    for (const change of changes) {
      try {
        const response = await fetch(`/api/products/${change.productId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${change.authToken}`
          },
          body: JSON.stringify(change.data)
        });
        
        if (response.ok) {
          await this.deleteFromStore(store, change.id);
        }
      } catch (error) {
        console.error('Failed to sync inventory change:', change.id, error);
      }
    }
  }

  private async syncPendingCartChanges(): Promise<void> {
    if (!this.db) return;
    
    const tx = this.db.transaction(['pendingCartChanges'], 'readwrite');
    const store = tx.objectStore('pendingCartChanges');
    const changes = await this.getAllFromStore(store);
    
    for (const change of changes) {
      try {
        const response = await fetch('/api/cart', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${change.authToken}`
          },
          body: JSON.stringify(change.data)
        });
        
        if (response.ok) {
          await this.deleteFromStore(store, change.id);
        }
      } catch (error) {
        console.error('Failed to sync cart change:', change.id, error);
      }
    }
  }

  private async getAllFromStore(store: IDBObjectStore): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private async deleteFromStore(store: IDBObjectStore, id: any): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Check if app is online
  isAppOnline(): boolean {
    return this.isOnline;
  }

  // Clear all offline data
  async clearOfflineData(): Promise<void> {
    if (!this.db) await this.initDB();
    
    const stores = ['pendingOrders', 'pendingInventory', 'pendingCartChanges', 'cachedData'];
    
    for (const storeName of stores) {
      const tx = this.db!.transaction([storeName], 'readwrite');
      const store = tx.objectStore('pendingCartChanges');
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }
}

// Global instance
export const offlineManager = new OfflineManager();