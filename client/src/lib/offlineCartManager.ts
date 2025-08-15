// Enhanced offline cart manager with automatic sync
export class OfflineCartManager {
  private dbName = 'GokulOfflineCart';
  private version = 1;
  private db: IDBDatabase | null = null;
  private syncInProgress = false;

  constructor() {
    this.initDB();
    this.setupSyncListeners();
  }

  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Cart items store
        if (!db.objectStoreNames.contains('cartItems')) {
          const cartStore = db.createObjectStore('cartItems', { keyPath: 'productId' });
          cartStore.createIndex('timestamp', 'lastModified', { unique: false });
        }
        
        // Cart metadata store
        if (!db.objectStoreNames.contains('cartMeta')) {
          db.createObjectStore('cartMeta', { keyPath: 'key' });
        }
        
        // Pending cart operations
        if (!db.objectStoreNames.contains('pendingCartOps')) {
          db.createObjectStore('pendingCartOps', { keyPath: 'id', autoIncrement: true });
        }
      };
    });
  }

  private setupSyncListeners(): void {
    window.addEventListener('online', () => {
      this.syncCartWithServer();
    });
  }

  // Save cart item offline
  async saveCartItem(productId: string, quantity: number, options: any = {}): Promise<void> {
    if (!this.db) await this.initDB();
    
    const cartItem = {
      productId,
      quantity,
      lastModified: Date.now(),
      ...options
    };
    
    const tx = this.db!.transaction(['cartItems'], 'readwrite');
    const store = tx.objectStore('cartItems');
    
    await new Promise<void>((resolve, reject) => {
      const request = store.put(cartItem);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    // Queue for sync if online
    if (navigator.onLine) {
      this.queueCartOperation('update', { productId, quantity, options });
    }
  }

  // Remove cart item offline
  async removeCartItem(productId: string): Promise<void> {
    if (!this.db) await this.initDB();
    
    const tx = this.db!.transaction(['cartItems'], 'readwrite');
    const store = tx.objectStore('cartItems');
    
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(productId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    // Queue for sync if online
    if (navigator.onLine) {
      this.queueCartOperation('remove', { productId });
    }
  }

  // Get all cart items
  async getCartItems(): Promise<any[]> {
    if (!this.db) await this.initDB();
    
    const tx = this.db!.transaction(['cartItems'], 'readonly');
    const store = tx.objectStore('cartItems');
    
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // Clear cart
  async clearCart(): Promise<void> {
    if (!this.db) await this.initDB();
    
    const tx = this.db!.transaction(['cartItems'], 'readwrite');
    const store = tx.objectStore('cartItems');
    
    await new Promise<void>((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    // Queue for sync if online
    if (navigator.onLine) {
      this.queueCartOperation('clear', {});
    }
  }

  // Queue cart operation for sync
  private async queueCartOperation(operation: string, data: any): Promise<void> {
    if (!this.db) await this.initDB();
    
    const authToken = 
      sessionStorage.getItem('authToken') || 
      sessionStorage.getItem('gokul_auth_token') ||
      JSON.parse(sessionStorage.getItem('gokul_auth_data') || '{}')?.token;
    
    const pendingOp = {
      operation,
      data,
      authToken,
      timestamp: Date.now()
    };
    
    const tx = this.db!.transaction(['pendingCartOps'], 'readwrite');
    const store = tx.objectStore('pendingCartOps');
    
    await new Promise<void>((resolve, reject) => {
      const request = store.add(pendingOp);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    // Try immediate sync if online
    if (navigator.onLine && !this.syncInProgress) {
      this.syncCartWithServer();
    }
  }

  // Sync cart with server
  async syncCartWithServer(): Promise<void> {
    if (this.syncInProgress || !navigator.onLine) return;
    
    this.syncInProgress = true;
    
    try {
      if (!this.db) await this.initDB();
      
      // Get pending operations
      const tx = this.db!.transaction(['pendingCartOps'], 'readwrite');
      const store = tx.objectStore('pendingCartOps');
      const pendingOps = await this.getAllFromStore(store);
      
      // Process each operation
      for (const op of pendingOps) {
        try {
          await this.syncSingleOperation(op);
          // Remove successful operation
          await this.deleteFromStore(store, op.id);
        } catch (error) {
          console.error('Failed to sync cart operation:', op.id, error);
        }
      }
      
      // Sync current cart state with server
      await this.syncCurrentCartState();
      
    } catch (error) {
      console.error('Cart sync failed:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncSingleOperation(operation: any): Promise<void> {
    const { operation: op, data, authToken } = operation;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    switch (op) {
      case 'update':
        await fetch('/api/cart/add', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            productId: data.productId,
            quantity: data.quantity,
            ...data.options
          })
        });
        break;
        
      case 'remove':
        await fetch(`/api/cart/remove/${data.productId}`, {
          method: 'DELETE',
          headers
        });
        break;
        
      case 'clear':
        await fetch('/api/cart/clear', {
          method: 'DELETE',
          headers
        });
        break;
    }
  }

  private async syncCurrentCartState(): Promise<void> {
    const cartItems = await this.getCartItems();
    
    if (cartItems.length === 0) return;
    
    const authToken = 
      sessionStorage.getItem('authToken') || 
      sessionStorage.getItem('gokul_auth_token') ||
      JSON.parse(sessionStorage.getItem('gokul_auth_data') || '{}')?.token;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (authToken) {
      headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    // Sync entire cart state
    await fetch('/api/cart/sync', {
      method: 'POST',
      headers,
      body: JSON.stringify({ items: cartItems })
    });
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

  // Get cart summary
  async getCartSummary(): Promise<{ itemCount: number; totalValue: number }> {
    const items = await this.getCartItems();
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    const totalValue = items.reduce((sum, item) => sum + (item.quantity * (item.price || 0)), 0);
    
    return { itemCount, totalValue };
  }

  // Check if cart has items
  async hasItems(): Promise<boolean> {
    const items = await this.getCartItems();
    return items.length > 0;
  }
}

// Global instance
export const offlineCartManager = new OfflineCartManager();