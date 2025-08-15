import fs from 'fs';
import { parse } from 'csv-parse/sync';
import path from 'path';
import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq, like, or } from 'drizzle-orm';

function parsePrice(priceStr: string): number {
  if (!priceStr || priceStr === '' || priceStr === '0.0000') return 0;
  // Convert string to float
  return parseFloat(priceStr);
}

async function main() {
  try {
    console.log('Updating product prices from pricelist2.csv...');
    
    // Load the price list
    const filePath = path.join(process.cwd(), 'attached_assets', 'pricelist2.csv');
    
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      process.exit(1);
    }
    
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Parse the CSV file
    const records = parse(fileContent, {
      columns: ['department', 'category', 'lookupCode', 'description', 'price'],
      from: 2, // Skip the header
      skip_empty_lines: true,
      relax_quotes: true, // Allow quotes in fields
      relax_column_count: true, // Handle inconsistent column counts
    });
    
    console.log(`Found ${records.length} products in price list`);
    
    let updatedCount = 0;
    let skippedCount = 0;
    const updatePromises = [];
    
    // Create a price map for easier lookup
    const priceMap = new Map();
    
    // First, populate the price map
    for (const item of records) {
      if (item.description && item.price) {
        // Normalize the description by removing extra spaces and converting to uppercase
        const normalizedDescription = item.description.toUpperCase().trim();
        priceMap.set(normalizedDescription, parsePrice(item.price));
        
        // Also store by lookup code if available
        if (item.lookupCode) {
          priceMap.set(item.lookupCode, parsePrice(item.price));
        }
      }
    }
    
    // Get all products from the database
    const allProducts = await db.select().from(products);
    console.log(`Found ${allProducts.length} products in database`);
    
    // Update products in batches
    for (const product of allProducts) {
      try {
        let newPrice = null;
        
        // Try to match the product by name or SKU
        if (product.name) {
          const normalizedName = product.name.toUpperCase().trim();
          if (priceMap.has(normalizedName)) {
            newPrice = priceMap.get(normalizedName);
          }
        }
        
        // If not found by name, try by SKU
        if (newPrice === null && product.sku && priceMap.has(product.sku)) {
          newPrice = priceMap.get(product.sku);
        }
        
        // If not found by exact match, try to find a close description match
        if (newPrice === null && product.name) {
          const normalizedName = product.name.toUpperCase().trim();
          
          // Find any price list item that includes this product name
          for (const [desc, price] of priceMap.entries()) {
            if (desc.includes(normalizedName) || normalizedName.includes(desc)) {
              newPrice = price;
              break;
            }
          }
        }
        
        if (newPrice !== null && newPrice > 0) {
          // Calculate the tiered pricing
          const basePrice = Math.max(0, product.basePrice || newPrice * 0.85);
          const priceLevel1 = newPrice;
          const priceLevel2 = Math.round((priceLevel1 * 0.975) * 100) / 100;
          const priceLevel3 = Math.round((priceLevel1 * 0.95) * 100) / 100;
          const priceLevel4 = Math.round((priceLevel1 * 0.925) * 100) / 100;
          const priceLevel5 = Math.round((priceLevel1 * 0.90) * 100) / 100;
          
          // Update the product price
          await db.update(products)
            .set({
              price: priceLevel1,
              priceLevel1: priceLevel1,
              priceLevel2: priceLevel2,
              priceLevel3: priceLevel3,
              priceLevel4: priceLevel4,
              priceLevel5: priceLevel5,
              basePrice: basePrice
            })
            .where(eq(products.id, product.id));
          
          updatedCount++;
          
          if (updatedCount % 10 === 0) {
            console.log(`Updated ${updatedCount} products so far...`);
          }
        } else {
          skippedCount++;
        }
      } catch (err) {
        console.error(`Error updating product ${product.name}:`, err);
        skippedCount++;
      }
    }
    
    console.log(`Price update complete! Updated ${updatedCount} products, skipped ${skippedCount} products.`);
  } catch (error) {
    console.error('Error updating product prices:', error);
    process.exit(1);
  }
}

main();