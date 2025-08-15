import { db } from '../server/db';
import { products, categories } from '../shared/schema';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { eq } from 'drizzle-orm';

interface Product {
  lookupCode: string;
  department: string;
  category: string;
  description: string;
  cost: string;
  basePrice: number;
  price1: number;
  price2: number;
  price3: number;
  price4: number;
  price5: number;
  stock: number;
}

function selectImageUrl(description: string, department: string, category: string): string {
  // Logic to select images based on product details
  if (description.toLowerCase().includes('paper towel') || description.toLowerCase().includes('roll')) {
    return 'https://m.media-amazon.com/images/I/71jfGmUk83L.jpg'; // Paper towels image
  }
  
  if (description.toLowerCase().includes('bottle opener')) {
    return 'https://m.media-amazon.com/images/I/61Ag+HCh-4L.jpg'; // Bottle opener image
  }
  
  if (description.toLowerCase().includes('salt') && description.toLowerCase().includes('lemon')) {
    return 'https://m.media-amazon.com/images/I/81RJwVd66xL._AC_SL1500_.jpg'; // Salt image
  }
  
  if (description.toLowerCase().includes('topochico') || description.toLowerCase().includes('topo chico')) {
    return 'https://m.media-amazon.com/images/I/71Nky2SdCEL._SL1500_.jpg'; // TopoChico image
  }
  
  if (description.toLowerCase().includes('battery') || description.toLowerCase().includes('duracell')) {
    return 'https://m.media-amazon.com/images/I/71o8z4kbG+L._AC_SL1500_.jpg'; // Duracell battery
  }
  
  if (description.toLowerCase().includes('pickle')) {
    return 'https://m.media-amazon.com/images/I/71AOMz+UOdL._SX569_.jpg'; // Pickle
  }
  
  if (description.toLowerCase().includes('trojan')) {
    return 'https://m.media-amazon.com/images/I/71H0tz0THJL._AC_SL1500_.jpg'; // Trojan
  }
  
  if (description.toLowerCase().includes('swisher') || category.toLowerCase().includes('cigar')) {
    return 'https://m.media-amazon.com/images/I/71Fx21KLc5L._AC_SL1500_.jpg'; // Swisher cigars
  }
  
  if (description.toLowerCase().includes('beer salt') || description.toLowerCase().includes('twang')) {
    return 'https://m.media-amazon.com/images/I/81eUzAfObdL._AC_SL1500_.jpg'; // Twang beer salt
  }
  
  if (description.toLowerCase().includes('coconut') || description.toLowerCase().includes('juice')) {
    return 'https://m.media-amazon.com/images/I/71bW1N6WQUL._SL1500_.jpg'; // Coconut juice
  }
  
  if (description.toLowerCase().includes('white owl') && category.toLowerCase().includes('cigar')) {
    return 'https://m.media-amazon.com/images/I/71e+VBq7FdL._AC_SL1500_.jpg'; // White Owl cigars
  }
  
  // Department-based fallbacks
  if (department.toLowerCase().includes('tobacco')) {
    return 'https://m.media-amazon.com/images/I/71QZrQFj78L._AC_SL1500_.jpg'; // Generic tobacco
  }
  
  if (department.toLowerCase().includes('food')) {
    return 'https://m.media-amazon.com/images/I/71J76P5+9LL._SL1500_.jpg'; // Food & beverage
  }
  
  if (department.toLowerCase().includes('meds') || department.toLowerCase().includes('daily care')) {
    return 'https://m.media-amazon.com/images/I/81txHjQ6aRL._AC_SL1500_.jpg'; // Medicine
  }
  
  if (department.toLowerCase().includes('plastic') || department.toLowerCase().includes('paper')) {
    return 'https://m.media-amazon.com/images/I/71MIdGcZ5fL._AC_SL1500_.jpg'; // Paper goods
  }
  
  if (department.toLowerCase().includes('liquor')) {
    return 'https://m.media-amazon.com/images/I/71QYeYXqXdL._AC_SL1500_.jpg'; // Liquor supplies
  }
  
  if (department.toLowerCase().includes('automotive')) {
    return 'https://m.media-amazon.com/images/I/712bMVUcDQL._AC_SL1500_.jpg'; // Automotive
  }
  
  if (department.toLowerCase().includes('smoke')) {
    return 'https://m.media-amazon.com/images/I/61vLHqk7XsL._AC_SL1500_.jpg'; // Smoke supplies
  }
  
  if (category.toLowerCase().includes('energy drink')) {
    return 'https://m.media-amazon.com/images/I/71uVTn6mPKL._SL1500_.jpg'; // Energy drink
  }
  
  // Default fallback image for items without a specific match
  return 'https://m.media-amazon.com/images/I/71a4ZQNqTiL._SL1500_.jpg';
}

async function main() {
  console.log('Importing products from itemlist2.csv...');
  
  try {
    // Read the CSV file
    const csvData = fs.readFileSync('./attached_assets/itemlist2.csv', 'utf8');
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    
    // Get existing categories
    const existingCategories = await db.select().from(categories);
    
    let newProducts = 0;
    let skippedProducts = 0;
    
    // Process each record
    for (const record of records) {
      try {
        if (!record['Item Lookup Code'] || record['Item Lookup Code'] === 'Grand Summaries') {
          continue; // Skip headers or empty rows
        }
        
        const department = record['Department'] || 'Uncategorized';
        const category = record['Category'] || 'Uncategorized';
        const description = record['Description'] || '';
        
        // Skip if missing key fields
        if (!description) {
          skippedProducts++;
          continue;
        }
        
        // Clean up the cost value
        let cost = record['Cost'] || '0';
        cost = cost.replace('$', '').trim();
        const basePrice = parseFloat(cost) || 0;
        
        // Check if we already have this product by lookup code
        const lookupCode = record['Item Lookup Code'];
        const existingProduct = await db.select().from(products).where(eq(products.sku, lookupCode)).limit(1);
        
        if (existingProduct.length > 0) {
          console.log(`Product already exists: ${description}`);
          skippedProducts++;
          continue;
        }
        
        // First, ensure the category exists
        let categoryId: number | null = null;
        
        // Try to find an existing category that matches
        const matchingCategory = existingCategories.find(c => 
          c.name.toUpperCase() === department.toUpperCase() || 
          (category && c.name.toUpperCase() === category.toUpperCase())
        );
        
        if (matchingCategory) {
          categoryId = matchingCategory.id;
        } else if (department) {
          // If no match found, create a new category based on the department
          const [newCategory] = await db.insert(categories).values({
            name: department.toUpperCase(),
            description: `${department} products`,
          }).returning();
          
          categoryId = newCategory.id;
          existingCategories.push(newCategory); // Add to local cache
          console.log(`Created new category: ${department}`);
        }
        
        // Calculate markup-based prices (25% markup as default)
        const markup = 1.25;
        const price1 = Math.round(basePrice * markup * 100) / 100;
        const price2 = Math.round(price1 * 0.975 * 100) / 100; // 2.5% discount
        const price3 = Math.round(price1 * 0.95 * 100) / 100;  // 5% discount
        const price4 = Math.round(price1 * 0.925 * 100) / 100; // 7.5% discount
        const price5 = Math.round(price1 * 0.90 * 100) / 100;  // 10% discount
        
        // Get image URL based on product details
        const imageUrl = selectImageUrl(description, department, category);
        
        // Add the product to the database
        await db.insert(products).values({
          name: description.toUpperCase(),
          description: `${description}`,
          sku: lookupCode,
          basePrice: basePrice,
          price: price1,
          price1: price1,
          price2: price2,
          price3: price3,
          price4: price4,
          price5: price5,
          imageUrl: imageUrl,
          stock: Math.floor(Math.random() * 100) + 10, // Random stock between 10 and 110
          categoryId: categoryId,
        });
        
        newProducts++;
        console.log(`Added product: ${description}`);
      } catch (error) {
        console.error(`Error processing record:`, error);
        skippedProducts++;
      }
    }
    
    console.log(`Import completed: ${newProducts} products added, ${skippedProducts} skipped.`);
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    console.log('Import process finished');
    process.exit(0);
  }
}

main().catch(console.error);