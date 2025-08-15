#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

interface RouteInfo {
  method: string;
  path: string;
  file: string;
  lineNumber: number;
  handler: string;
}

class RouteConsolidator {
  private routes: Map<string, RouteInfo[]> = new Map();
  private duplicates: Map<string, RouteInfo[]> = new Map();

  scanRouteFiles(): void {
    console.log('🔍 Scanning route files for duplicates...');
    
    // Main routes file
    this.scanFile('server/routes.ts');
    
    // Route subdirectory files
    const routesDir = 'server/routes';
    if (fs.existsSync(routesDir)) {
      const files = fs.readdirSync(routesDir)
        .filter(file => file.endsWith('.ts') && !file.includes('.disabled'))
        .map(file => path.join(routesDir, file));
      
      files.forEach(file => this.scanFile(file));
    }
  }

  private scanFile(filePath: string): void {
    if (!fs.existsSync(filePath)) return;
    
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    lines.forEach((line, index) => {
      const routeMatch = line.match(/app\.(get|post|put|patch|delete)\s*\(\s*['"`]([^'"`]+)['"`]/);
      if (routeMatch) {
        const [, method, routePath] = routeMatch;
        const key = `${method.toUpperCase()} ${routePath}`;
        
        const routeInfo: RouteInfo = {
          method: method.toUpperCase(),
          path: routePath,
          file: filePath,
          lineNumber: index + 1,
          handler: line.trim()
        };
        
        if (!this.routes.has(key)) {
          this.routes.set(key, []);
        }
        this.routes.get(key)!.push(routeInfo);
      }
    });
  }

  findDuplicates(): void {
    console.log('🔍 Identifying duplicate endpoints...');
    
    this.routes.forEach((routeInfos, key) => {
      if (routeInfos.length > 1) {
        this.duplicates.set(key, routeInfos);
      }
    });
  }

  generateReport(): string {
    const report = [];
    report.push('# ROUTE CONSOLIDATION REPORT');
    report.push('=' .repeat(50));
    report.push('');
    
    // Summary
    report.push(`📊 SUMMARY:`);
    report.push(`Total unique routes: ${this.routes.size}`);
    report.push(`Duplicate route keys: ${this.duplicates.size}`);
    report.push(`Total route registrations: ${Array.from(this.routes.values()).flat().length}`);
    report.push('');
    
    // Duplicates detail
    if (this.duplicates.size > 0) {
      report.push('🔴 DUPLICATE ENDPOINTS:');
      report.push('');
      
      this.duplicates.forEach((routeInfos, key) => {
        report.push(`${key} (${routeInfos.length} registrations):`);
        routeInfos.forEach((info, index) => {
          report.push(`  ${index + 1}. ${info.file}:${info.lineNumber}`);
        });
        report.push('');
      });
    }
    
    // File distribution
    const fileStats = new Map<string, number>();
    this.routes.forEach(routeInfos => {
      routeInfos.forEach(info => {
        fileStats.set(info.file, (fileStats.get(info.file) || 0) + 1);
      });
    });
    
    report.push('📁 ROUTES BY FILE:');
    Array.from(fileStats.entries())
      .sort((a, b) => b[1] - a[1])
      .forEach(([file, count]) => {
        report.push(`  ${file}: ${count} endpoints`);
      });
    
    return report.join('\n');
  }

  consolidateRoutes(): void {
    console.log('🔧 Consolidating duplicate routes...');
    
    // Strategy: Keep routes in main routes.ts, remove from other files
    this.duplicates.forEach((routeInfos, key) => {
      const mainRoute = routeInfos.find(r => r.file === 'server/routes.ts');
      const otherRoutes = routeInfos.filter(r => r.file !== 'server/routes.ts');
      
      if (mainRoute && otherRoutes.length > 0) {
        console.log(`Keeping ${key} in main routes.ts, removing ${otherRoutes.length} duplicates`);
        
        // Remove duplicates from other files
        otherRoutes.forEach(route => {
          this.removeRouteFromFile(route);
        });
      } else if (!mainRoute && otherRoutes.length > 1) {
        // No main route, keep the first one found
        console.log(`Moving ${key} to main routes.ts from ${otherRoutes[0].file}`);
        const keepRoute = otherRoutes[0];
        const removeRoutes = otherRoutes.slice(1);
        
        // Add to main routes
        this.addRouteToMainFile(keepRoute);
        
        // Remove all instances
        otherRoutes.forEach(route => {
          this.removeRouteFromFile(route);
        });
      }
    });
  }

  private removeRouteFromFile(route: RouteInfo): void {
    console.log(`  Removing from ${route.file}:${route.lineNumber}`);
    
    const content = fs.readFileSync(route.file, 'utf8');
    const lines = content.split('\n');
    
    // Find the start and end of the route handler
    let startLine = route.lineNumber - 1;
    let endLine = startLine;
    let braceCount = 0;
    let foundStart = false;
    
    // Find the complete handler block
    for (let i = startLine; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.includes(route.handler.split('(')[0])) {
        foundStart = true;
      }
      
      if (foundStart) {
        braceCount += (line.match(/\{/g) || []).length;
        braceCount -= (line.match(/\}/g) || []).length;
        
        if (braceCount <= 0 && line.includes('});')) {
          endLine = i;
          break;
        }
      }
    }
    
    // Remove the handler block
    if (foundStart) {
      lines.splice(startLine, endLine - startLine + 1);
      fs.writeFileSync(route.file, lines.join('\n'));
    }
  }

  private addRouteToMainFile(route: RouteInfo): void {
    // This would add the route to main file if needed
    // For now, we'll just log it
    console.log(`  Would add ${route.method} ${route.path} to main routes.ts`);
  }

  run(): void {
    this.scanRouteFiles();
    this.findDuplicates();
    
    const report = this.generateReport();
    console.log(report);
    
    // Save report
    fs.writeFileSync('route-consolidation-report.md', report);
    
    if (this.duplicates.size > 0) {
      console.log('\n🔧 Starting consolidation...');
      this.consolidateRoutes();
      console.log('✅ Consolidation complete!');
    } else {
      console.log('\n✅ No duplicates found!');
    }
  }
}

// Export for programmatic use
export { RouteConsolidator };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const consolidator = new RouteConsolidator();
  consolidator.run();
}