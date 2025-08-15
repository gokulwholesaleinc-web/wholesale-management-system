import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface EndpointInfo {
  method: string;
  path: string;
  handler: string;
  module: string;
  middleware: string[];
  description: string;
  status: 'active' | 'deprecated' | 'disabled';
}

class EndpointRegistry {
  private static instance: EndpointRegistry;
  private endpoints: Map<string, EndpointInfo> = new Map();

  static getInstance(): EndpointRegistry {
    if (!EndpointRegistry.instance) {
      EndpointRegistry.instance = new EndpointRegistry();
    }
    return EndpointRegistry.instance;
  }

  register(endpoint: EndpointInfo): boolean {
    const key = `${endpoint.method} ${endpoint.path}`;
    
    // Check if endpoint already exists
    if (this.endpoints.has(key)) {
      const existing = this.endpoints.get(key);
      console.error(`🚨 DUPLICATE ENDPOINT BLOCKED:`);
      console.error(`   Method: ${endpoint.method}`);
      console.error(`   Path: ${endpoint.path}`);
      console.error(`   Existing: ${existing?.module || 'unknown'}`);
      console.error(`   Attempted: ${endpoint.module}`);
      console.error(`   Registration BLOCKED to prevent conflicts`);
      
      // Log to file for audit trail
      this.logDuplicateAttempt(key, existing, endpoint);
      return false;
    }
    
    this.endpoints.set(key, endpoint);
    console.log(`✅ Registered: ${key} from ${endpoint.module}`);
    return true;
  }

  private logDuplicateAttempt(key: string, existing: EndpointInfo | undefined, attempted: EndpointInfo): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      endpoint: key,
      existing: existing?.module || 'unknown',
      attempted: attempted.module,
      action: 'BLOCKED_DUPLICATE'
    };
    
    // Append to duplicate log file
    const logFile = 'endpoint-duplicates.log';
    fs.appendFileSync(logFile, JSON.stringify(logEntry) + '\n');
  }

  // Get sync statistics
  getSyncStats(): { total: number; active: number; deprecated: number; disabled: number; syncRate: number } {
    const total = this.endpoints.size;
    const active = Array.from(this.endpoints.values()).filter(e => e.status === 'active').length;
    const deprecated = Array.from(this.endpoints.values()).filter(e => e.status === 'deprecated').length;
    const disabled = Array.from(this.endpoints.values()).filter(e => e.status === 'disabled').length;
    
    return {
      total,
      active,
      deprecated,
      disabled,
      syncRate: total > 0 ? Math.round((active / total) * 100) : 100
    };
  }

  // Generate comprehensive endpoint report
  generateSyncReport(): string {
    const stats = this.getSyncStats();
    const duplicates = this.findDuplicates();
    
    const report = [
      '# ENDPOINT SYNCHRONIZATION REPORT',
      '=' .repeat(50),
      '',
      `📊 STATISTICS:`,
      `Total Endpoints: ${stats.total}`,
      `Active: ${stats.active}`,
      `Deprecated: ${stats.deprecated}`,
      `Disabled: ${stats.disabled}`,
      `Sync Rate: ${stats.syncRate}%`,
      '',
      `🔄 DUPLICATES: ${duplicates.length}`,
      ...duplicates.map(dup => `❌ ${dup}`),
      '',
      '📁 ENDPOINTS BY MODULE:',
      ...this.getEndpointsByModule(),
      '',
      `Generated: ${new Date().toISOString()}`
    ];
    
    return report.join('\n');
  }

  private getEndpointsByModule(): string[] {
    const moduleMap = new Map<string, number>();
    
    this.endpoints.forEach(endpoint => {
      const module = endpoint.module || 'unknown';
      moduleMap.set(module, (moduleMap.get(module) || 0) + 1);
    });
    
    return Array.from(moduleMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([module, count]) => `${module}: ${count} endpoints`);
  }

  // Method to check if endpoint exists before registration
  hasEndpoint(method: string, path: string): boolean {
    const key = `${method} ${path}`;
    return this.endpoints.has(key);
  }

  getAllEndpoints(): EndpointInfo[] {
    return Array.from(this.endpoints.values());
  }

  findDuplicates(): string[] {
    const pathCounts = new Map<string, number>();
    const duplicates: string[] = [];

    this.endpoints.forEach((endpoint, key) => {
      pathCounts.set(key, (pathCounts.get(key) || 0) + 1);
    });

    pathCounts.forEach((count, key) => {
      if (count > 1) {
        duplicates.push(`${key} (${count} times)`);
      }
    });

    return duplicates;
  }

  validateEndpoints(): { duplicates: string[]; report: string[] } {
    const duplicates = this.findDuplicates();
    const total = this.endpoints.size;

    const report = [
      `=== ENDPOINT REGISTRY REPORT ===`,
      `📊 Total Registered: ${total}`,
      `🔄 Duplicates: ${duplicates.length}`,
      ``,
      ...duplicates.map(dup => `❌ DUPLICATE: ${dup}`),
      ``
    ];

    return { duplicates, report };
  }
}

// Scan actual route files for endpoints
function scanRouteFiles(): EndpointInfo[] {
  const routeFiles = [
    path.join(__dirname, 'routes.ts'),
    path.join(__dirname, 'routes/auth.ts'),
    path.join(__dirname, 'routes/cart.ts'),
    path.join(__dirname, 'routes/notifications.ts')
  ];

  const foundEndpoints: EndpointInfo[] = [];
  const endpointPattern = /app\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/g;

  routeFiles.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        let match;
        
        while ((match = endpointPattern.exec(content)) !== null) {
          const method = match[1].toUpperCase();
          const endpointPath = match[2];
          
          foundEndpoints.push({
            method,
            path: endpointPath,
            handler: 'scanned-from-file',
            module: path.basename(filePath),
            middleware: ['unknown'],
            description: `Scanned from ${filePath}`,
            status: 'active'
          });
        }
      } catch (error) {
        console.error(`Error scanning ${filePath}:`, error);
      }
    }
  });

  return foundEndpoints;
}

// Live sync function to update registry with actual routes
export function syncWithActualRoutes(): { scanned: number; duplicates: string[]; report: string[] } {
  const scannedEndpoints = scanRouteFiles();
  const duplicates: string[] = [];
  const endpointCounts = new Map<string, number>();
  
  // Count occurrences of each endpoint
  scannedEndpoints.forEach(endpoint => {
    const key = `${endpoint.method} ${endpoint.path}`;
    endpointCounts.set(key, (endpointCounts.get(key) || 0) + 1);
  });
  
  // Find duplicates
  endpointCounts.forEach((count, key) => {
    if (count > 1) {
      duplicates.push(`${key} (${count} times)`);
    }
  });
  
  // Clear registry and add scanned endpoints
  const registryInstance = EndpointRegistry.getInstance();
  (registryInstance as any).endpoints.clear();
  
  scannedEndpoints.forEach(endpoint => {
    registryInstance.register(endpoint);
  });
  
  const report = [
    `=== LIVE ROUTE SCAN REPORT ===`,
    `📁 Files Scanned: routes.ts, auth.ts, cart.ts, notifications.ts`,
    `🔍 Endpoints Found: ${scannedEndpoints.length}`,
    `🔄 Duplicates Found: ${duplicates.length}`,
    ``,
    ...duplicates.map(dup => `❌ DUPLICATE: ${dup}`),
    ``
  ];
  
  return { scanned: scannedEndpoints.length, duplicates, report };
}

// Enhanced validation function
export function validateAllEndpoints(): void {
  console.log('🔍 Scanning actual route files for endpoints...');
  const syncResult = syncWithActualRoutes();
  
  console.log(syncResult.report.join('\n'));
  
  const registry = EndpointRegistry.getInstance();
  const registryReport = registry.validateEndpoints();
  console.log(registryReport.report.join('\n'));
  
  if (syncResult.duplicates.length > 0) {
    console.log('\n🚨 ACTION REQUIRED:');
    console.log('- Remove duplicate endpoints from route files');
    console.log('- Consolidate routing logic to prevent conflicts');
  } else {
    console.log('\n✅ NO DUPLICATES FOUND - ROUTING IS CLEAN');
  }
}

// Real-time sync monitoring for API endpoint
export function getLiveSyncStatus() {
  const syncResult = syncWithActualRoutes();
  const registry = EndpointRegistry.getInstance();
  const stats = registry.getSyncStats();
  
  return {
    timestamp: new Date().toISOString(),
    syncRate: stats.syncRate,
    totalEndpoints: stats.total,
    activeEndpoints: stats.active,
    duplicates: syncResult.duplicates.length,
    status: stats.syncRate === 100 && syncResult.duplicates.length === 0 ? 'HEALTHY' : 'ISSUES_DETECTED',
    details: {
      moduleDistribution: registry.getAllEndpoints().reduce((acc, endpoint) => {
        const module = endpoint.module || 'unknown';
        acc[module] = (acc[module] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      duplicateList: syncResult.duplicates
    }
  };
}

export const registry = EndpointRegistry.getInstance();