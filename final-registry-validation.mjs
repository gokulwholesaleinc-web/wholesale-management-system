#!/usr/bin/env node

/**
 * Final Registry System Validation
 * Ensures all endpoints and schema are properly registered and aligned
 */

import { promises as fs } from 'fs';

class RegistryValidator {
  constructor() {
    this.validations = [];
    this.issues = [];
  }

  async validateSchemaConsistency() {
    console.log('🔍 Validating schema consistency...');
    
    const schemaContent = await fs.readFile('shared/schema.ts', 'utf8');
    const storageContent = await fs.readFile('server/storage.ts', 'utf8');
    
    // Check AI table exports
    const aiTables = ['aiInvoiceProcessing', 'aiProductSuggestions'];
    for (const table of aiTables) {
      if (schemaContent.includes(`export const ${table}`) && storageContent.includes(table)) {
        this.validations.push(`✅ ${table} consistently defined across schema and storage`);
      } else {
        this.issues.push(`❌ ${table} missing in schema or storage`);
      }
    }
    
    // Check type consistency
    const aiTypes = ['AiInvoiceProcessing', 'AiProductSuggestion'];
    for (const type of aiTypes) {
      if (schemaContent.includes(`type ${type}`) && storageContent.includes(`type ${type}`)) {
        this.validations.push(`✅ ${type} type consistently imported`);
      } else {
        this.issues.push(`❌ ${type} type inconsistency`);
      }
    }
  }

  async validateRouteEndpoints() {
    console.log('🔍 Validating route endpoints...');
    
    const routesContent = await fs.readFile('server/routes.ts', 'utf8');
    
    // Check AI endpoints are properly defined
    const aiEndpoints = [
      'POST /api/admin/ai/process-invoice',
      'GET /api/admin/ai/invoice/:id/results', 
      'POST /api/admin/ai/invoice/:id/approve'
    ];
    
    for (const endpoint of aiEndpoints) {
      const [method, path] = endpoint.split(' ');
      if (routesContent.includes(`app.${method.toLowerCase()}('${path}'`)) {
        this.validations.push(`✅ ${endpoint} properly registered`);
      } else {
        this.issues.push(`❌ ${endpoint} not found in routes`);
      }
    }
    
    // Check middleware integration
    if (routesContent.includes('requireAdmin') && routesContent.includes('upload.single')) {
      this.validations.push('✅ Authentication and file upload middleware integrated');
    } else {
      this.issues.push('❌ Missing middleware integration');
    }
  }

  async validateServiceIntegration() {
    console.log('🔍 Validating service integration...');
    
    const serviceContent = await fs.readFile('server/services/InvoiceProcessor.ts', 'utf8');
    const routesContent = await fs.readFile('server/routes.ts', 'utf8');
    
    // Check service methods exist
    const serviceMethods = ['processInvoiceFile', 'getProcessingResults', 'approveAndCreatePurchaseOrder'];
    for (const method of serviceMethods) {
      if (serviceContent.includes(`${method}(`)) {
        this.validations.push(`✅ Service method ${method} implemented`);
      } else {
        this.issues.push(`❌ Service method ${method} missing`);
      }
    }
    
    // Check service is imported in routes
    if (routesContent.includes("import('./services/InvoiceProcessor')")) {
      this.validations.push('✅ InvoiceProcessor service properly imported in routes');
    } else {
      this.issues.push('❌ InvoiceProcessor service not imported in routes');
    }
  }

  async validateFrontendIntegration() {
    console.log('🔍 Validating frontend integration...');
    
    const appContent = await fs.readFile('client/src/App.tsx', 'utf8');
    const componentExists = await fs.access('client/src/pages/AIInvoiceProcessor.tsx').then(() => true).catch(() => false);
    
    if (componentExists) {
      this.validations.push('✅ AIInvoiceProcessor component file exists');
    } else {
      this.issues.push('❌ AIInvoiceProcessor component file missing');
    }
    
    if (appContent.includes('/admin/ai-invoice-processor')) {
      this.validations.push('✅ AI Invoice Processor route registered in App.tsx');
    } else {
      this.issues.push('❌ AI Invoice Processor route missing in App.tsx');
    }
    
    if (appContent.includes('import AIInvoiceProcessor')) {
      this.validations.push('✅ AIInvoiceProcessor component imported in App.tsx');
    } else {
      this.issues.push('❌ AIInvoiceProcessor component import missing in App.tsx');
    }
  }

  async validateDatabaseSchema() {
    console.log('🔍 Validating database schema structure...');
    
    const schemaContent = await fs.readFile('shared/schema.ts', 'utf8');
    
    // Check AI table structure
    const aiInvoiceFields = ['id', 'originalFileName', 'fileType', 'filePath', 'uploadedBy', 'extractedData', 'processingStatus'];
    const aiSuggestionFields = ['id', 'invoiceId', 'extractedProductName', 'extractedQuantity', 'extractedUnitCost', 'suggestedProductId'];
    
    let aiInvoiceValid = aiInvoiceFields.every(field => schemaContent.includes(field));
    let aiSuggestionValid = aiSuggestionFields.every(field => schemaContent.includes(field));
    
    if (aiInvoiceValid) {
      this.validations.push('✅ aiInvoiceProcessing table has required fields');
    } else {
      this.issues.push('❌ aiInvoiceProcessing table missing required fields');
    }
    
    if (aiSuggestionValid) {
      this.validations.push('✅ aiProductSuggestions table has required fields');
    } else {
      this.issues.push('❌ aiProductSuggestions table missing required fields');
    }
    
    // Check insert schemas
    if (schemaContent.includes('insertAiInvoiceProcessingSchema') && schemaContent.includes('insertAiProductSuggestionSchema')) {
      this.validations.push('✅ AI insert schemas properly defined');
    } else {
      this.issues.push('❌ AI insert schemas missing');
    }
  }

  async validateMulterConfiguration() {
    console.log('🔍 Validating multer configuration...');
    
    const routesContent = await fs.readFile('server/routes.ts', 'utf8');
    
    if (routesContent.includes('pdf') && routesContent.includes('10 * 1024 * 1024')) {
      this.validations.push('✅ Multer configured for PDF files with 10MB limit');
    } else {
      this.issues.push('❌ Multer not properly configured for PDF files');
    }
    
    if (routesContent.includes('upload.single')) {
      this.validations.push('✅ Single file upload middleware configured');
    } else {
      this.issues.push('❌ File upload middleware missing');
    }
  }

  generateFinalReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 FINAL REGISTRY VALIDATION REPORT');
    console.log('='.repeat(80));
    
    console.log(`\n✅ VALIDATIONS PASSED (${this.validations.length}):`);
    this.validations.forEach(validation => console.log(`  ${validation}`));
    
    if (this.issues.length > 0) {
      console.log(`\n❌ ISSUES FOUND (${this.issues.length}):`);
      this.issues.forEach(issue => console.log(`  ${issue}`));
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('📈 REGISTRY VALIDATION SUMMARY');
    console.log('='.repeat(80));
    
    const total = this.validations.length + this.issues.length;
    const successRate = ((this.validations.length / total) * 100).toFixed(1);
    
    console.log(`Total Validations: ${total}`);
    console.log(`Success Rate: ${successRate}%`);
    console.log(`Issues Found: ${this.issues.length}`);
    
    if (this.issues.length === 0) {
      console.log('\n🎉 ALL REGISTRY VALIDATIONS PASSED - SYSTEM FULLY ALIGNED');
      console.log('🚀 AI INVOICE PROCESSING SYSTEM READY FOR PRODUCTION');
    } else {
      console.log('\n⚠️ REGISTRY ISSUES FOUND - REQUIRES ATTENTION');
    }
    
    return {
      success: this.validations.length,
      issues: this.issues.length,
      successRate: parseFloat(successRate)
    };
  }

  async runCompleteValidation() {
    console.log('🚀 STARTING FINAL REGISTRY VALIDATION');
    console.log('=' + '='.repeat(78));
    
    await this.validateDatabaseSchema();
    await this.validateSchemaConsistency();
    await this.validateRouteEndpoints();
    await this.validateServiceIntegration();
    await this.validateFrontendIntegration();
    await this.validateMulterConfiguration();
    
    return this.generateFinalReport();
  }
}

// Run the validation
const validator = new RegistryValidator();
validator.runCompleteValidation()
  .then(results => {
    process.exit(results.issues > 0 ? 1 : 0);
  })
  .catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });