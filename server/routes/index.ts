import { type Express } from "express";
import { createServer, type Server } from "http";
import { validateAllEndpoints } from "../endpoint-registry";

/**
 * ROUTING ARCHITECTURE CONSOLIDATION
 * 
 * DECISION: Use server/routes.ts as SINGLE source of truth
 * REASON: Eliminates duplicate endpoint conflicts
 * 
 * The modular approach was causing endpoint duplicates because:
 * 1. routes.ts defined all endpoints (2000+ lines)
 * 2. Modular files redefined same endpoints
 * 3. Multiple router.use() calls created conflicts
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // Validate endpoints before registration
  console.log('🔍 Validating endpoints before registration...');
  validateAllEndpoints();
  
  // Use consolidated routes.ts as single source of truth
  const { registerRoutes: registerConsolidatedRoutes } = await import('../routes');
  const httpServer = await registerConsolidatedRoutes(app);
  
  console.log('✅ Route registration complete');
  
  return httpServer;
}