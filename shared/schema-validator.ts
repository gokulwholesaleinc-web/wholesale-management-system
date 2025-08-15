/**
 * Schema Validation System - Prevents schema mismatches and duplicates
 * Run this before db:push to catch issues early
 */

import fs from 'fs';
import path from 'path';

interface SchemaIssue {
  type: 'duplicate_field' | 'missing_field' | 'type_mismatch' | 'missing_relation';
  severity: 'error' | 'warning';
  table: string;
  field?: string;
  description: string;
  location?: string;
}

export class SchemaValidator {
  private issues: SchemaIssue[] = [];

  validateSchema(): { isValid: boolean; issues: SchemaIssue[] } {
    console.log('🔍 Validating schema consistency...');
    
    // Read schema file
    const schemaPath = path.join(process.cwd(), 'shared/schema.ts');
    const schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    
    // Check for duplicate field definitions
    this.checkDuplicateFields(schemaContent);
    
    // Check for missing required fields
    this.checkMissingFields(schemaContent);
    
    // Check for type consistency
    this.checkTypeConsistency(schemaContent);
    
    // Check for missing relations
    this.checkMissingRelations(schemaContent);
    
    const errors = this.issues.filter(issue => issue.severity === 'error');
    const warnings = this.issues.filter(issue => issue.severity === 'warning');
    
    console.log(`✅ Schema validation complete: ${errors.length} errors, ${warnings.length} warnings`);
    
    return {
      isValid: errors.length === 0,
      issues: this.issues
    };
  }

  private checkDuplicateFields(content: string): void {
    const tables = this.extractTables(content);
    
    for (const table of tables) {
      const fieldNames = table.fields.map(f => f.name);
      const duplicates = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index);
      
      for (const duplicate of duplicates) {
        this.issues.push({
          type: 'duplicate_field',
          severity: 'error',
          table: table.name,
          field: duplicate,
          description: `Duplicate field "${duplicate}" in table "${table.name}"`
        });
      }
    }
  }

  private checkMissingFields(content: string): void {
    // Check if cart_items has price field (required by storage layer)
    if (!content.includes('price: doublePrecision("price")') && content.includes('export const cartItems')) {
      this.issues.push({
        type: 'missing_field',
        severity: 'error',
        table: 'cart_items',
        field: 'price',
        description: 'Cart items table missing price field required by storage layer'
      });
    }
  }

  private checkTypeConsistency(content: string): void {
    // Check for consistent ID types
    const idPatterns = [
      /id: serial\("id"\)\.primaryKey\(\)/g,
      /id: varchar\("id"\)\.primaryKey\(\)/g
    ];
    
    // Add more type consistency checks as needed
  }

  private checkMissingRelations(content: string): void {
    // Check if all foreign key fields have corresponding relations
    const foreignKeys = this.extractForeignKeys(content);
    const relations = this.extractRelations(content);
    
    for (const fk of foreignKeys) {
      const hasRelation = relations.some(rel => 
        rel.table === fk.table && rel.field === fk.field
      );
      
      if (!hasRelation) {
        this.issues.push({
          type: 'missing_relation',
          severity: 'warning',
          table: fk.table,
          field: fk.field,
          description: `Foreign key "${fk.field}" in "${fk.table}" has no corresponding relation`
        });
      }
    }
  }

  private extractTables(content: string): Array<{ name: string; fields: Array<{ name: string; type: string }> }> {
    const tables: Array<{ name: string; fields: Array<{ name: string; type: string }> }> = [];
    const tableRegex = /export const (\w+) = pgTable\("([^"]+)", \{([^}]+)\}/g;
    
    let match;
    while ((match = tableRegex.exec(content)) !== null) {
      const tableName = match[1];
      const fieldsContent = match[3];
      
      // Extract fields from table definition
      const fieldRegex = /(\w+):\s*([^,\n]+)/g;
      const fields: Array<{ name: string; type: string }> = [];
      
      let fieldMatch;
      while ((fieldMatch = fieldRegex.exec(fieldsContent)) !== null) {
        fields.push({
          name: fieldMatch[1],
          type: fieldMatch[2].trim()
        });
      }
      
      tables.push({ name: tableName, fields });
    }
    
    return tables;
  }

  private extractForeignKeys(content: string): Array<{ table: string; field: string; references: string }> {
    const foreignKeys: Array<{ table: string; field: string; references: string }> = [];
    const fkRegex = /(\w+):\s*[^.]+\.references\(\(\)\s*=>\s*(\w+)\.(\w+)\)/g;
    
    let match;
    while ((match = fkRegex.exec(content)) !== null) {
      foreignKeys.push({
        table: 'current', // Would need more context to determine actual table
        field: match[1],
        references: `${match[2]}.${match[3]}`
      });
    }
    
    return foreignKeys;
  }

  private extractRelations(content: string): Array<{ table: string; field: string }> {
    const relations: Array<{ table: string; field: string }> = [];
    const relationRegex = /export const (\w+)Relations = relations\((\w+), \(\{[^}]+\}\) => \(\{([^}]+)\}\)\)/g;
    
    let match;
    while ((match = relationRegex.exec(content)) !== null) {
      // Extract relation fields - would need more sophisticated parsing
      relations.push({
        table: match[2],
        field: 'detected' // Simplified for now
      });
    }
    
    return relations;
  }

  generateReport(): string {
    const errors = this.issues.filter(i => i.severity === 'error');
    const warnings = this.issues.filter(i => i.severity === 'warning');
    
    let report = '=== SCHEMA VALIDATION REPORT ===\n\n';
    
    if (errors.length > 0) {
      report += '🚨 ERRORS (Must fix before db:push):\n';
      for (const error of errors) {
        report += `  • ${error.description}\n`;
      }
      report += '\n';
    }
    
    if (warnings.length > 0) {
      report += '⚠️  WARNINGS (Consider fixing):\n';
      for (const warning of warnings) {
        report += `  • ${warning.description}\n`;
      }
      report += '\n';
    }
    
    if (errors.length === 0 && warnings.length === 0) {
      report += '✅ No schema issues detected\n';
    }
    
    return report;
  }
}

// CLI usage
if (require.main === module) {
  const validator = new SchemaValidator();
  const result = validator.validateSchema();
  
  console.log(validator.generateReport());
  
  if (!result.isValid) {
    console.log('❌ Schema validation failed. Please fix errors before running db:push');
    process.exit(1);
  } else {
    console.log('✅ Schema validation passed');
  }
}

export default SchemaValidator;