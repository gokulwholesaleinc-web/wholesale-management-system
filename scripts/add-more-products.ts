import { db } from '../server/db';
import { products, categories } from '../shared/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';

// Map of lookup codes we've already added to avoid duplicates
const processedCodes = new Set();

async function main() {
  try {
    console.log('Starting to import additional products from itemlist2...');
    
    // Read and parse the CSV file
    const csvData = fs.readFileSync('./attached_assets/itemlist2.csv', 'utf8');
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true // Handle quotes more permissively
    });
    
    // Get all categories for reference
    const allCategories = await db.select().from(categories);
    const categoryMap = new Map();
    
    // Create a category map for fast lookups
    for (const category of allCategories) {
      categoryMap.set(category.name, category.id);
    }
    
    // Check which lookup codes are already in the database
    const existingProducts = await db.select({ sku: products.sku }).from(products);
    console.log('Existing products in database:');
    for (const product of existingProducts) {
      if (product.sku) {
        processedCodes.add(product.sku);
        console.log(`  - Product with SKU: ${product.sku}`);
      }
    }
    
    console.log(`Found ${processedCodes.size} existing products in database`);
    console.log(`Total records in CSV: ${records.length}`);
    
    // Log the first 5 records to see what's in the CSV
    console.log('First 5 records in CSV:');
    for (let i = 0; i < 5 && i < records.length; i++) {
      console.log(JSON.stringify(records[i]));
    }
    
    // Create products from the CSV data
    let productsAdded = 0;
    const batchSize = 20;
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      // Skip summary rows or rows missing critical information
      if (!record.Description || record.Description === 'Grand Summaries' || !record['Item Lookup Code']) {
        continue;
      }
      
      // Skip if we've already processed this lookup code
      if (processedCodes.has(record['Item Lookup Code'])) {
        continue;
      }
      
      // Skip if Sales is not present or cannot be parsed as a number
      const sales = record.Sales ? record.Sales.replace('$', '').replace(',', '') : '';
      if (!sales || isNaN(parseFloat(sales))) {
        continue;
      }
      
      // Determine category
      let categoryId = null;
      if (record.Category && categoryMap.has(record.Category)) {
        categoryId = categoryMap.get(record.Category);
      } else if (record.Department && categoryMap.has(record.Department)) {
        categoryId = categoryMap.get(record.Department);
      }
      
      // Set price values from the CSV - adapt to itemlist2.csv format
      const salesValue = record.Sales.replace('$', '').replace(',', '');
      const costValue = record.Cost ? record.Cost.replace('$', '').replace(',', '') : null;
      
      const price = parseFloat(salesValue) || 0;
      const basePrice = costValue ? parseFloat(costValue) : price * 0.8;
      
      // For the tiered pricing, create calculated values
      const price1 = price;
      const price2 = Math.round(price * 0.97 * 100) / 100;
      const price3 = Math.round(price * 0.95 * 100) / 100;
      const price4 = Math.round(price * 0.93 * 100) / 100;
      const price5 = Math.round(price * 0.90 * 100) / 100;
      
      // Generate a rich description using data from the price sheet
      let description = record.Description;
      if (description.length < 20) {
        if (record.Department) {
          description += ` - Premium ${record.Department.toLowerCase()} product`;
        }
        if (record.Category) {
          description += ` from the ${record.Category.toLowerCase()} category`;
        }
      }
      
      // Select image URL based on manufacturer-specific keywords
      const imageUrl = selectManufacturerImage(record.Description, record.Department, record.Category, record['Item Lookup Code']);
      
      // Create new product
      try {
        await db.insert(products).values({
          name: record.Description,
          description: description,
          price: price,
          basePrice: basePrice,
          price1: price1 || price,
          price2: price2 || price * 0.97,
          price3: price3 || price * 0.95,
          price4: price4,
          price5: price5,
          sku: record['Item Lookup Code'],
          upcCode: record['Item Lookup Code'],
          stock: Math.floor(Math.random() * 100) + 30, // Random stock between 30-130
          categoryId: categoryId,
          imageUrl: imageUrl,
          minOrderQuantity: 1,
        });
        
        // Mark as processed
        processedCodes.add(record['Item Lookup Code']);
        
        productsAdded++;
        
        if (productsAdded % 5 === 0) {
          console.log(`Added ${productsAdded} products so far...`);
        }
        
        // Process in batches to avoid overwhelming the database
        if (productsAdded >= batchSize) {
          break;
        }
      } catch (error) {
        console.error(`Error adding product ${record.Description}:`, error);
      }
    }
    
    console.log(`Import complete! Added ${productsAdded} new products.`);
    
  } catch (error) {
    console.error('Error importing products:', error);
  }
}

// Function to select manufacturer-specific image based on product details
function selectManufacturerImage(description: string, department: string, category: string, lookupCode: string): string {
  const desc = description.toLowerCase();
  
  // Manufacturer-specific images for better matches
  if (desc.includes('swisher') || lookupCode.startsWith('025900')) {
    return 'https://www.famous-smoke.com/cigars/skupics/swisher_sweets/CI-SSW-LEASTN-400.jpg';
  }
  
  if (desc.includes('5-hour') || desc.includes('energy')) {
    if (desc.includes('watermelon')) {
      return 'https://5hourenergy.com/wp-content/uploads/2019/11/regular-strength-watermelon.jpg';
    }
    if (desc.includes('citrus')) {
      return 'https://5hourenergy.com/wp-content/uploads/2019/11/extra-strength-tropical-burst.jpg';
    }
    if (desc.includes('strawberry')) {
      return 'https://5hourenergy.com/wp-content/uploads/2019/11/extra-strength-strawberry-watermelon.jpg';
    }
    return 'https://5hourenergy.com/wp-content/uploads/2019/11/extra-strength-berry.jpg';
  }
  
  if (desc.includes('red bull')) {
    if (desc.includes('sugar free')) {
      return 'https://m.media-amazon.com/images/I/71NTi82uJ-L.jpg';
    }
    return 'https://m.media-amazon.com/images/I/71Nvg68MgJL.jpg';
  }
  
  if (desc.includes('perrier')) {
    return 'https://m.media-amazon.com/images/I/81fPKHOEqRL.jpg';
  }
  
  if (desc.includes('coke') || desc.includes('coca')) {
    return 'https://m.media-amazon.com/images/I/617YcY1EbaL.jpg';
  }
  
  if (desc.includes('sprite')) {
    return 'https://m.media-amazon.com/images/I/61URXeVui6L.jpg';
  }
  
  if (desc.includes('monster')) {
    return 'https://m.media-amazon.com/images/I/71iWWFdw+ML.jpg';
  }
  
  if (desc.includes('plenty') || desc.includes('paper') || desc.includes('roll')) {
    return 'https://m.media-amazon.com/images/I/71jfGmUk83L.jpg';
  }
  
  if (desc.includes('opener') || desc.includes('bottle')) {
    return 'https://m.media-amazon.com/images/I/61Ag+HCh-4L.jpg';
  }
  
  if (desc.includes('twang') || desc.includes('salt')) {
    return 'https://m.media-amazon.com/images/I/81RJwVw4vtL.jpg';
  }
  
  if (desc.includes('alka') || desc.includes('seltzer')) {
    return 'https://m.media-amazon.com/images/I/81GtAnwQUBL.jpg';
  }
  
  if (desc.includes('mortin') || desc.includes('ibuprofen')) {
    return 'https://m.media-amazon.com/images/I/81IQvUcf69L.jpg';
  }
  
  if (desc.includes('nyquil')) {
    return 'https://m.media-amazon.com/images/I/81TCrJadMOL.jpg';
  }
  
  if (desc.includes('garbage') || desc.includes('bag')) {
    return 'https://m.media-amazon.com/images/I/71kLCgZywzL.jpg';
  }
  
  if (desc.includes('little tree') || desc.includes('air freshener')) {
    return 'https://m.media-amazon.com/images/I/71N06NFKTIL.jpg';
  }
  
  if (desc.includes('mr. pure') || desc.includes('juice')) {
    return 'https://cdn-tp4.mozu.com/26445-41135/cms/41135/files/f579f2cb-de18-4a29-8a2e-5a5e62a26ba4';
  }
  
  // If nothing matched specifically, use generic images by department
  const defaultDeptImages: Record<string, string> = {
    'TOBACCO': 'https://m.media-amazon.com/images/I/61UZJVv3bJL.jpg',
    'SMOKE TOBACCO': 'https://m.media-amazon.com/images/I/61UZJVv3bJL.jpg',
    'FOOD & BEVERAGE': 'https://m.media-amazon.com/images/I/71tn6FpI+EL.jpg',
    'MEDS/DAILY CARE': 'https://m.media-amazon.com/images/I/81o9BRLr72L.jpg',
    'PLASTIC/PAPER GOODS': 'https://m.media-amazon.com/images/I/61KEu4Cyz6L.jpg',
    'LIQUOR SUPPLIES': 'https://m.media-amazon.com/images/I/71WNxaVJ6wL.jpg',
    'AUTOMOTIVE': 'https://m.media-amazon.com/images/I/61YqCXr4FqL.jpg'
  };

  // Check by department
  if (department && defaultDeptImages[department]) {
    return defaultDeptImages[department];
  }
  
  // Final fallback
  return 'https://m.media-amazon.com/images/I/71j8-yWVHFL.jpg';
}

// Execute the import
main();