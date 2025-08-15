import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { db } from '../server/db';
import { products, categories, type InsertProduct } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Interface for the itemlist items
interface ItemListEntry {
  'Item Lookup Code': string;
  Department: string;
  Category: string;
  Description: string;
  'Quantity Sold': string;
  Sales: string;
  'Last Sold': string;
  Cost: string;
  'Cost Sold': string;
  'Non Sale Movement': string;
  'Last Received': string;
}

// Interface for the pricelist items
interface PriceListItem {
  Department: string;
  Category: string;
  'Item Lookup Code': string;
  Description: string;
  Price: string;
}

// Function to parse price/cost from string
function parsePrice(priceStr: string): number {
  if (!priceStr) return 0;
  const cleanedStr = priceStr.replace(/[^\d.]/g, '');
  const parsedValue = parseFloat(cleanedStr);
  return isNaN(parsedValue) ? 0 : parsedValue;
}

// Function to select an appropriate image URL
function selectImageUrl(description: string, department: string, category: string): string {
  // Handle common products - this ensures we have high-quality images where possible
  description = description.toUpperCase();
  
  // Red Bull products
  if (description.includes('RED BULL')) {
    if (description.includes('SUGAR FREE')) {
      return 'https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcS5U0GKRn3-wTpvDfyYwHf74wy6vbNeYzuNF6XZLqkzA5Q9I1ik2bDJj9YSkXmU3Nw3q3Ee3XXvlKaCKxLO-k5brbgV5xL7V_nCxCKSadGcnE64XzIiDrGXdQ';
    }
    if (description.includes('8.4')) {
      return 'https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcS67mH82_8lZYj1WGkN8tmKYPfGS0_eJ4wwQlUdlp7H5Vl1QRuQcwkR3x8oPKo0dWRZBAvxmhWrJHRYcxwQw3zwkW4xZOmrRnVjdXZFmZLxC8HfGvH0V4Tv';
    }
    return 'https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcS67mH82_8lZYj1WGkN8tmKYPfGS0_eJ4wwQlUdlp7H5Vl1QRuQcwkR3x8oPKo0dWRZBAvxmhWrJHRYcxwQw3zwkW4xZOmrRnVjdXZFmZLxC8HfGvH0V4Tv';
  }
  
  // Coke products
  if (description.includes('COCA-COLA') || description.includes('COKE')) {
    if (description.includes('DIET')) {
      return 'https://m.media-amazon.com/images/I/31tTZEMdtuL._AC_UF1000,1000_QL80_.jpg';
    }
    return 'https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcSNDt03YuFmrJKaVP6XdkPmvGzdZjIY7NgFYtmUd9Uft0oaCqayzz5dR9j5rfnlbqgULG8lA3T6Zn51_XCrQKPWpN02sW6WwtXZAELzpEUGRbdh3KuB9zXk9w';
  }
  
  // Sprite
  if (description.includes('SPRITE')) {
    return 'https://encrypted-tbn0.gstatic.com/shopping?q=tbn:ANd9GcQ9yFRnirxVDiL8HaQ_CU7dJibijgnTxPqNJLUg_XCLhV-ZRTj-e4K41TLJ5Z1H7IaE-QLsMY4eAc9sEDgMtCfN_tEsRVzAn5vPM7ZVXs9q';
  }
  
  // 5-Hour Energy
  if (description.includes('5-HOUR') || description.includes('5 HOUR') || description.includes('5HOUR')) {
    return 'https://encrypted-tbn2.gstatic.com/shopping?q=tbn:ANd9GcRCHxfdwjoqM9uu-NoWQVVVSz59ChyI7rGCX7gkYJIDho4nFf6h5qQiEkvmopTKAzgPlTSQg83fdkqdFq29fZ9WQcy6k_I22dF1jRLUz_qsoHKLUuHf7J1Dhw';
  }
  
  // Monster Energy
  if (description.includes('MONSTER')) {
    if (description.includes('ZERO')) {
      return 'https://encrypted-tbn3.gstatic.com/shopping?q=tbn:ANd9GcQ2vYp8QLqQ0KCBgAXuMXxwt4HYKJ04LCLdtXcjFPQxGWk_qVXbWpWgIL8szcXKwfpuJ0GZBrj5a4kPt5yTlUE9XrwrT9L-4xTUL8rVdaK4Rw6DFKKSvg9h';
    }
    return 'https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcRuWdHJh6rV9Rl-JDm0OWqwH59Wt-jD6XAmDBTlLaKRX3jJhGOYIPPDu5ZcXR0f2vCDHUVT4JVT0WIAcRmOuKZkHmIEUZ46JYJP06WTEdnx';
  }
  
  // Duracell Batteries
  if (description.includes('DURACELL')) {
    if (description.includes('AA')) {
      return 'https://encrypted-tbn1.gstatic.com/shopping?q=tbn:ANd9GcRt9a-y-Iu5FBnuHXhRvyUGqnDFDkC6xRt04kcfhIcHWzVHjkDa3YtMNGtKpxtJwpTfIspG8LxOGlSJDmORw1yXwF3UgVXVtk3MQ1bFKyPm89LnzC9WI85XyA';
    }
    if (description.includes('AAA')) {
      return 'https://m.media-amazon.com/images/I/71UkVxvrI4L._AC_UF1000,1000_QL80_.jpg';
    }
    return 'https://m.media-amazon.com/images/I/71N3zs5TbDL._SL1500_.jpg';
  }
  
  // Default image based on department
  if (department) {
    const deptUpper = department.toUpperCase();
    
    if (deptUpper.includes('FOOD') || deptUpper.includes('BEVERAGE')) {
      return 'https://cdn.shopify.com/s/files/1/0632/5263/8506/products/food-and-beverage-packaging-supplies.jpg?v=1660081582';
    }
    
    if (deptUpper.includes('ELECTRONICS')) {
      return 'https://m.media-amazon.com/images/I/61J6s7pJKML._SL1100_.jpg';
    }
    
    if (deptUpper.includes('MEDS') || deptUpper.includes('CARE')) {
      return 'https://m.media-amazon.com/images/I/71oPXQgY4GL._AC_SL1500_.jpg';
    }
  }
  
  // Really generic fallback
  return 'https://cdn.shopify.com/s/files/1/0632/5263/8506/products/food-and-beverage-packaging-supplies.jpg?v=1660081582';
}

// Function to ensure a category exists
async function ensureCategoryExists(department: string, categoryName: string): Promise<number> {
  if (!categoryName) {
    // If no category provided, use department as category
    categoryName = department || 'Uncategorized';
  }

  // Check if the category already exists
  const existingCategories = await db.select()
    .from(categories)
    .where(eq(categories.name, categoryName));
  
  if (existingCategories.length > 0) {
    return existingCategories[0].id;
  }
  
  // Create the category if it doesn't exist
  const description = `Products from the ${categoryName} category`;
  const [newCategory] = await db.insert(categories)
    .values({ name: categoryName, description })
    .returning();
  
  return newCategory.id;
}

// Main function
async function main() {
  try {
    console.log('Starting comprehensive product import (excluding tobacco items)...');
    
    // 1. Load the item list data
    const itemListPath = path.join('..', 'attached_assets', 'itemlist2.csv');
    console.log(`Looking for item list at: ${itemListPath}`);
    if (!fs.existsSync(itemListPath)) {
      console.error(`File not found: ${itemListPath}`);
      process.exit(1);
    }
    
    // Read file and handle BOM character if present
    let itemListContent = fs.readFileSync(itemListPath, 'utf8');
    if (itemListContent.charCodeAt(0) === 0xFEFF) {
      itemListContent = itemListContent.substring(1);
    }
    
    // Log the first 100 characters to check format
    console.log('CSV file start:', itemListContent.substring(0, 100));
    
    const itemListRecords = parse(itemListContent, {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
      from_line: 2, // Skip header row
      trim: true,
    }) as ItemListEntry[];
    
    // Log a sample record to debug
    if (itemListRecords.length > 0) {
      console.log('Sample record:', JSON.stringify(itemListRecords[0]));
    }
    
    console.log(`Parsed ${itemListRecords.length} total records from itemlist2.csv`);
    
    // 2. Load the price list data for accurate pricing
    const priceListPath = path.join('..', 'attached_assets', 'pricelist2.csv');
    console.log(`Looking for price list at: ${priceListPath}`);
    if (!fs.existsSync(priceListPath)) {
      console.error(`File not found: ${priceListPath}`);
      process.exit(1);
    }
    
    const priceListContent = fs.readFileSync(priceListPath, 'utf8');
    const priceListRecords = parse(priceListContent, {
      columns: true,
      from: 2, // Skip header
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
    }) as PriceListItem[];
    
    console.log(`Loaded ${priceListRecords.length} price entries`);
    
    // 3. Create a map of lookup codes to prices
    const priceMap = new Map<string, string>();
    for (const item of priceListRecords) {
      if (item['Item Lookup Code'] && item.Price) {
        priceMap.set(item['Item Lookup Code'], item.Price);
      }
    }
    
    // 4. Get existing products to avoid duplicates
    const existingProducts = await db.select({ sku: products.sku }).from(products);
    const existingSkus = new Set<string>();
    
    for (const product of existingProducts) {
      if (product.sku) {
        existingSkus.add(product.sku);
      }
    }
    
    console.log(`Found ${existingSkus.size} existing products in database`);
    
    // 5. Process and import products
    let importedCount = 0;
    let skippedCount = 0;
    let tobaccoSkipped = 0;
    
    for (const item of itemListRecords) {
      try {
        // Skip the summary row or empty rows
        if (!item['Item Lookup Code'] || item['Item Lookup Code'] === 'Grand Summaries') {
          skippedCount++;
          continue;
        }
        
        // Skip tobacco items but keep accessories like zigzags, cones, and papers
        if (item.Department && item.Department.toUpperCase().includes('TOBACCO')) {
          const description = item.Description.toUpperCase();
          // Keep smoking accessories
          if (description.includes('ZIGZAG') || 
              description.includes('CONE') || 
              description.includes('PAPER') || 
              description.includes('FILTER') ||
              description.includes('HEMP') ||
              description.includes('ROLLER') ||
              description.includes('RAW') ||
              item.Category && (
                item.Category.toUpperCase().includes('PAPER') ||
                item.Category.toUpperCase().includes('CONE') ||
                item.Category.toUpperCase().includes('HEMP')
              )) {
            // Keep these items
            console.log(`Keeping smoking accessory: ${item.Description}`);
          } else {
            // Skip actual tobacco products
            console.log(`Skipping tobacco item: ${item.Description}`);
            tobaccoSkipped++;
            continue;
          }
        }
        
        // Skip if already exists
        if (existingSkus.has(item['Item Lookup Code'])) {
          console.log(`Skipping existing product: ${item.Description}`);
          skippedCount++;
          continue;
        }
        
        // Get price from price list if available, otherwise calculate from cost
        let price = 0;
        if (priceMap.has(item['Item Lookup Code'])) {
          price = parsePrice(priceMap.get(item['Item Lookup Code']) || '0');
        } else if (item.Cost) {
          // Use the cost from the item list, marked up by 40%
          const cost = parsePrice(item.Cost);
          price = Math.round(cost * 1.4 * 100) / 100;
        }
        
        if (price <= 0) {
          console.log(`Skipping product with invalid price: ${item.Description}`);
          skippedCount++;
          continue;
        }
        
        // Calculate tiered pricing
        const basePrice = parsePrice(item.Cost) || price * 0.75;
        const price1 = price;
        const price2 = Math.round(price * 0.975 * 100) / 100;
        const price3 = Math.round(price * 0.95 * 100) / 100;
        const price4 = Math.round(price * 0.925 * 100) / 100;
        const price5 = Math.round(price * 0.90 * 100) / 100;
        
        // Generate a reasonable stock amount
        const stock = Math.floor(Math.random() * 50) + 20; // Between 20-70
        
        // Ensure the product's category exists
        const categoryId = await ensureCategoryExists(item.Department, item.Category);
        
        // Find an appropriate image URL
        const imageUrl = selectImageUrl(item.Description, item.Department, item.Category);
        
        // Create the product record
        const productData: InsertProduct = {
          name: item.Description,
          description: `${item.Description} - ${item.Department}`,
          sku: item['Item Lookup Code'],
          basePrice,
          price: price1,
          price1,
          price2,
          price3,
          price4,
          price5,
          imageUrl,
          stock,
          categoryId,
        };
        
        await db.insert(products).values(productData);
        importedCount++;
        
        console.log(`Imported: ${item.Description} at $${price}`);
      } catch (error) {
        console.error(`Error importing product ${item.Description || '(no description)'}:`, error);
        skippedCount++;
      }
    }
    
    console.log('Import completed successfully!');
    console.log(`Products imported: ${importedCount}`);
    console.log(`Products skipped: ${skippedCount}`);
    console.log(`Tobacco products excluded: ${tobaccoSkipped}`);
    
  } catch (error) {
    console.error('Error during import:', error);
    process.exit(1);
  }
}

main().then(() => {
  console.log('Import completed, exiting...');
  process.exit(0);
}).catch(error => {
  console.error('Unhandled error during import:', error);
  process.exit(1);
});