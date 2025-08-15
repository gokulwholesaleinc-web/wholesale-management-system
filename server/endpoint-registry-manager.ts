import { Express } from 'express';

interface EndpointDefinition {
  method: string;
  path: string;
  handler: Function;
  middleware?: Function[];
  source: string; // Which file registered this endpoint
}

class EndpointRegistry {
  private endpoints: Map<string, EndpointDefinition> = new Map();
  private app: Express | null = null;

  setApp(app: Express) {
    this.app = app;
  }

  private getKey(method: string, path: string): string {
    return `${method.toUpperCase()} ${path}`;
  }

  register(method: string, path: string, handler: Function, middleware: Function[] = [], source: string = 'unknown') {
    const key = this.getKey(method, path);
    
    if (this.endpoints.has(key)) {
      const existing = this.endpoints.get(key)!;
      console.warn(`⚠️  DUPLICATE ENDPOINT DETECTED: ${key}`);
      console.warn(`   Existing: ${existing.source}`);
      console.warn(`   New: ${source}`);
      console.warn(`   Skipping duplicate registration`);
      return false;
    }

    this.endpoints.set(key, {
      method: method.toUpperCase(),
      path,
      handler,
      middleware,
      source
    });

    // Register with Express if app is available
    if (this.app) {
      const methodLower = method.toLowerCase() as keyof Express;
      if (typeof this.app[methodLower] === 'function') {
        if (middleware.length > 0) {
          (this.app[methodLower] as any)(path, ...middleware, handler);
        } else {
          (this.app[methodLower] as any)(path, handler);
        }
      }
    }

    console.log(`✅ Registered: ${key} (${source})`);
    return true;
  }

  // Convenience methods
  get(path: string, handler: Function, middleware: Function[] = [], source: string = 'unknown') {
    return this.register('GET', path, handler, middleware, source);
  }

  post(path: string, handler: Function, middleware: Function[] = [], source: string = 'unknown') {
    return this.register('POST', path, handler, middleware, source);
  }

  put(path: string, handler: Function, middleware: Function[] = [], source: string = 'unknown') {
    return this.register('PUT', path, handler, middleware, source);
  }

  patch(path: string, handler: Function, middleware: Function[] = [], source: string = 'unknown') {
    return this.register('PATCH', path, handler, middleware, source);
  }

  delete(path: string, handler: Function, middleware: Function[] = [], source: string = 'unknown') {
    return this.register('DELETE', path, handler, middleware, source);
  }

  // Check if endpoint exists
  exists(method: string, path: string): boolean {
    return this.endpoints.has(this.getKey(method, path));
  }

  // Get all registered endpoints
  getAll(): EndpointDefinition[] {
    return Array.from(this.endpoints.values());
  }

  // Get summary
  getSummary() {
    const bySource = new Map<string, number>();
    this.endpoints.forEach(endpoint => {
      bySource.set(endpoint.source, (bySource.get(endpoint.source) || 0) + 1);
    });

    return {
      total: this.endpoints.size,
      bySource: Object.fromEntries(bySource),
      endpoints: this.getAll().map(e => `${e.method} ${e.path}`)
    };
  }

  // Clear all endpoints (for testing)
  clear() {
    this.endpoints.clear();
  }
}

// Export singleton instance
export const endpointRegistry = new EndpointRegistry();

// Helper function to wrap Express app with registry
export function createRegistryWrapper(app: Express, source: string = 'main') {
  endpointRegistry.setApp(app);
  
  return {
    get: (path: string, ...handlers: Function[]) => {
      const middleware = handlers.slice(0, -1);
      const handler = handlers[handlers.length - 1];
      return endpointRegistry.get(path, handler, middleware, source);
    },
    
    post: (path: string, ...handlers: Function[]) => {
      const middleware = handlers.slice(0, -1);
      const handler = handlers[handlers.length - 1];
      return endpointRegistry.post(path, handler, middleware, source);
    },
    
    put: (path: string, ...handlers: Function[]) => {
      const middleware = handlers.slice(0, -1);
      const handler = handlers[handlers.length - 1];
      return endpointRegistry.put(path, handler, middleware, source);
    },
    
    patch: (path: string, ...handlers: Function[]) => {
      const middleware = handlers.slice(0, -1);
      const handler = handlers[handlers.length - 1];
      return endpointRegistry.patch(path, handler, middleware, source);
    },
    
    delete: (path: string, ...handlers: Function[]) => {
      const middleware = handlers.slice(0, -1);
      const handler = handlers[handlers.length - 1];
      return endpointRegistry.delete(path, handler, middleware, source);
    },
    
    // Pass through other Express methods
    use: app.use.bind(app),
    listen: app.listen.bind(app),
    // Add other methods as needed
  };
}