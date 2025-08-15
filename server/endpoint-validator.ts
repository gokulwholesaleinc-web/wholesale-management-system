// Enhanced Express App Wrapper with Duplicate Prevention
import type { Express } from 'express';
import { EndpointRegistry } from './endpoint-registry';

// Wrapper function to add duplicate prevention to Express app
export function createProtectedApp(app: Express): Express {
  const registry = EndpointRegistry.getInstance();
  
  const originalMethods = {
    get: app.get.bind(app),
    post: app.post.bind(app),
    put: app.put.bind(app),
    patch: app.patch.bind(app),
    delete: app.delete.bind(app),
    all: app.all.bind(app)
  };

  // Override Express methods with duplicate prevention
  const createProtectedMethod = (method: string, originalFn: any) => {
    return function(path: string, ...handlers: any[]) {
      // Check if endpoint already exists
      if (registry.hasEndpoint(method, path)) {
        console.warn(`⚠️  Skipping duplicate ${method} ${path}`);
        return app;
      }
      
      // Register the endpoint and call original method
      const success = registry.register({
        method: method.toUpperCase(),
        path,
        handler: 'route handler',
        module: 'routes.ts',
        middleware: [],
        description: `${method} endpoint for ${path}`,
        status: 'active'
      });
      
      if (success) {
        return originalFn(path, ...handlers);
      } else {
        console.warn(`⚠️  Registration blocked for ${method} ${path}`);
        return app;
      }
    };
  };

  app.get = createProtectedMethod('GET', originalMethods.get);
  app.post = createProtectedMethod('POST', originalMethods.post);
  app.put = createProtectedMethod('PUT', originalMethods.put);
  app.patch = createProtectedMethod('PATCH', originalMethods.patch);
  app.delete = createProtectedMethod('DELETE', originalMethods.delete);
  app.all = createProtectedMethod('ALL', originalMethods.all);

  return app;
}