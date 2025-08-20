import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { db } from '../server/db';
import { products, categories } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Function to parse price from string
function parsePrice(priceStr: string): number {
  if (!priceStr) return 0;
  const cleanedStr = priceStr.replace(/[^\d.]/g, '');
  const parsedValue = parseFloat(cleanedStr);
  return isNaN(parsedValue) ? 0 : parsedValue;
}

// Function to select an appropriate image URL
function selectImageUrl(description: string, department: string, category: string): string {
  // Handle common products
  const desc = description?.toUpperCase() || '';
  
  // Red Bull products
  if (desc.includes('RED BULL')) {
    if (desc.includes('SUGAR FREE')) {
      return 'https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcS5U0GKRn3-wTpvDfyYwHf74wy6vbNeYzuNF6XZLqkzA5Q9I1ik2bDJj9YSkXmU3Nw3q3Ee3XXvlKaCKxLO-k5brbgV5xL7V_nCxCKSadGcnE64XzIiDrGXdQ';
    }
    return 'https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcS67mH82_8lZYj1WGkN8tmKYPfGS0_eJ4wwQlUdlp7H5Vl1QRuQcwkR3x8oPKo0dWRZBAvxmhWrJHRYcxwQw3zwkW4xZOmrRnVjdXZFmZLxC8HfGvH0V4Tv';
  }
  
  // Coke products
  if (desc.includes('COCA-COLA') || desc.includes('COKE')) {
    if (desc.includes('DIET')) {
      return 'https://m.media-amazon.com/images/I/31tTZEMdtuL._AC_UF1000,1000_QL80_.jpg';
    }
    return 'https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcSNDt03YuFmrJKaVP6XdkPmvGzdZjIY7NgFYtmUd9Uft0oaCqayzz5dR9j5rfnlbqgULG8lA3T6Zn51_XCrQKPWpN02sW6WwtXZAELzpEUGRbdh3KuB9zXk9w';
  }
  
  // Monster
  if (desc.includes('MONSTER')) {
    return 'https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcRuWdHJh6rV9Rl-JDm0OWqwH59Wt-jD6XAmDBTlLaKRX3jJhGOYIPPDu5ZcXR0f2vCDHUVT4JVT0WIAcRmOuKZkHmIEUZ46JYJP06WTEdnx';
  }
  
  // 5-Hour Energy
  if (desc.includes('5-HOUR') || desc.includes('5 HOUR')) {
    return 'https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcRCHxfdwjoqM9uu-NoWQVVVSz59ChyI7rGCX7gkYJIDho4nFf6h5qQiEkvmopTKAzgPlTSQg83fdkqdFq29fZ9WQcy6k_I22dF1jRLUz_qsoHKLUuHf7J1Dhw';
  }
  
  // Duracell Batteries
  if (desc.includes('DURACELL')) {
    if (desc.includes('AA')) {
      return 'https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcRt9a-y-Iu5FBnuHXhRvyUGqnDFDkC6xRt04kcfhIcHWzVHjkDa3YtMNGtKpxtJwpTfIspG8LxOGlSJDmORw1yXwF3UgVXVtk3MQ1bFKyPm89LnzC9WI85XyA';
    }
    if (desc.includes('AAA')) {
      return 'https://m.media-amazon.com/images/I/71UkVxvrI4L._AC_UF1000,1000_QL80_.jpg';
    }
  }
  
  // ZigZag
  if (desc.includes('ZIG ZAG') || desc.includes('ZIGZAG')) {
    return 'https://img.freepik.com/premium-photo/cigarette-rolling-papers-isolated-white-background_93675-133233.jpg';
  }
  
  // Generic images by department
  const deptUpper = department?.toUpperCase() || '';
  
  if (deptUpper.includes('FOOD') || deptUpper.includes('BEVERAGE')) {
    return 'https://cdn.shopify.com/s/files/1/0632/5263/8506/products/food-and-beverage-packaging-supplies.jpg?v=1660081582';
  }
  
  if (deptUpper.includes('ELECTRONICS')) {
    return 'https://m.media-amazon.com/images/I/61J6s7pJKML._SL1100_.jpg';
  }
  
  if (deptUpper.includes('SMOKE') || category?.toUpperCase().includes('PIPE')) {
    return 'https://img.freepik.com/premium-photo/cigarette-rolling-papers-isolated-white-background_93675-133233.jpg';
  }
  
  // Default image
  return 'https://cdn.shopify.com/s/files/1/0632/5263/8506/products/food-and-beverage-packaging-supplies.jpg?v=1660081582';
}

// Function to ensure a category exists
async function ensureCategoryExists(departmentName: string, categoryName: string): Promise<number> {
  // Map department names to our standardized categories
  const categoryMap: Record<string, number> = {
    'FOOD & BEVERAGE': 19,
    'MEDS/DAILY CARE': 20,
    'PLASTIC/PAPER GOODS': 21,
    'LIQUOR SUPPLIES': 22,
    'AUTOMOTIVE': 23,
    'ELECTRONICS & ACCESSORIES': 31,
    'CONES, PAPERS & HEMP': 34,
    'SMOKE SUPPLIES': 34, // Map smoke supplies to papers & hemp
    'MISC': 38,
    'Uncategorized': 53
  };
  
  // Try to use department name first
  if (departmentName && categoryMap[departmentName.toUpperCase()]) {
    return categoryMap[departmentName.toUpperCase()];
  }
  
  // Then try category name
  if (categoryName && categoryMap[categoryName.toUpperCase()]) {
    return categoryMap[categoryName.toUpperCase()];
  }
  
  // Handle smoking accessories
  if (
    (departmentName && departmentName.toUpperCase().includes('SMOKE')) ||
    (categoryName && (
      categoryName.toUpperCase().includes('PAPER') ||
      categoryName.toUpperCase().includes('CONE') ||
      categoryName.toUpperCase().includes('HEMP')
    ))
  ) {
    return 34; // CONES, PAPERS & HEMP
  }
  
  // Default to MISC
  return 38;
}

// Main function
async function main() {
  try {
    console.log('Starting additional product import (skipping tobacco products)...');
    
    // Get the list of existing products to avoid duplicates
    const existingProducts = await db.select().from(products);
    const existingSkus = new Set(existingProducts.map(p => p.sku));
    
    console.log(`Found ${existingSkus.size} existing products in database`);
    
    // Read CSV file
    const csvPath = path.join('..', 'attached_assets', 'itemlist2.csv');
    let csvContent = fs.readFileSync(csvPath, 'utf8');
    
    // Remove BOM if present
    if (csvContent.charCodeAt(0) === 0xFEFF) {
      csvContent = csvContent.substring(1);
    }
    
    console.log('Parsing CSV file...');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    
    console.log(`Found ${records.length} records in CSV`);
    
    // Get current index from existing products to continue import
    const startIndex = Math.min(records.length, existingSkus.size + 50);
    
    console.log(`Starting from index ${startIndex} in CSV file`);
    
    // Create counters
    let imported = 0;
    let skipped = 0;
    let skippedTobacco = 0;
    let target = 50; // Import 50 more products
    
    for (let i = startIndex; i < records.length && imported < target; i++) {
      const record = records[i];
      try {
        // Skip summary rows or empty data
        if (!record['Item Lookup Code'] || record['Item Lookup Code'] === 'Grand Summaries') {
          skipped++;
          continue;
        }
        
        // Skip already existing products
        if (existingSkus.has(record['Item Lookup Code'])) {
          console.log(`Skipping existing product: ${record.Description}`);
          skipped++;
          continue;
        }
        
        // Skip tobacco items but keep accessories
        if (record.Department && 
            record.Department.toUpperCase().includes('TOBACCO') && 
            !record.Description.toUpperCase().match(/(ZIGZAG|CONE|PAPER|FILTER|HEMP|RAW)/)) {
          console.log(`Skipping tobacco item: ${record.Description}`);
          skippedTobacco++;
          continue;
        }
        
        // Calculate price
        const cost = parsePrice(record.Cost);
        const price = Math.max(cost * 1.4, 0.99);
        
        if (price <= 0) {
          console.log(`Skipping product with invalid price: ${record.Description}`);
          skipped++;
          continue;
        }
        
        // Get category
        const categoryId = await ensureCategoryExists(record.Department, record.Category);
        
        // Get image URL
        const imageUrl = selectImageUrl(record.Description, record.Department, record.Category);
        
        // Create product
        await db.insert(products).values({
          name: record.Description,
          description: `${record.Description} - ${record.Department || 'General Product'}`,
          sku: record['Item Lookup Code'],
          basePrice: cost,
          price: price,
          price1: price,
          price2: Math.round(price * 0.97 * 100) / 100,
          price3: Math.round(price * 0.95 * 100) / 100,
          price4: Math.round(price * 0.92 * 100) / 100,
          price5: Math.round(price * 0.90 * 100) / 100,
          imageUrl: imageUrl,
          stock: Math.floor(Math.random() * 50) + 10, // Random stock between 10-60
          categoryId: categoryId,
        });
        
        imported++;
        console.log(`Imported: ${record.Description}`);
      } catch (error) {
        console.error(`Error importing ${record?.Description || 'unknown product'}:`, error);
        skipped++;
      }
      
      // Log progress every 10 items
      if (imported % 10 === 0 && imported > 0) {
        console.log(`Progress: ${imported}/${target} imported, ${skipped} skipped, ${skippedTobacco} tobacco skipped`);
      }
    }
    
    console.log('Import summary:');
    console.log(`Total products imported: ${imported}`);
    console.log(`Total products skipped: ${skipped}`);
    console.log(`Tobacco products skipped: ${skippedTobacco}`);
    
  } catch (error) {
    console.error('Error during import:', error);
    process.exit(1);
  }
}

main().then(() => {
  console.log('Import completed successfully.');
  process.exit(0);
}).catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});