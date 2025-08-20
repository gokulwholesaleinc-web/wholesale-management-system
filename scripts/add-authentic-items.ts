import { db } from '../server/db';
import { products, categories } from '../shared/schema';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { eq } from 'drizzle-orm';
import path from 'path';

// Function to select an appropriate image based on product details
function selectProductImage(description: string, department: string, category: string, lookupCode: string): string {
  // Specific product matches by UPC/lookup code
  const productImageMap: Record<string, string> = {
    "00014800003628": "https://m.media-amazon.com/images/I/71e0co0PADL._SL1500_.jpg", // CLAMATO MICHELADA
    "00014800511765": "https://m.media-amazon.com/images/I/71XwLSjvSQL._SL1500_.jpg", // CLAMATO 16OZ
    "00021136070378": "https://m.media-amazon.com/images/I/71Nky2SdCEL._SL1500_.jpg", // TOPO CHICO 24CT
    "00041333009612": "https://m.media-amazon.com/images/I/71o8z4kbG+L._AC_SL1500_.jpg", // DURACELL AA 4PK
    "00041333014616": "https://m.media-amazon.com/images/I/71UnjkevQIL._AC_SL1500_.jpg", // DURACELL AAA 4PK
    "00070158112054": "https://m.media-amazon.com/images/I/81xoytqjUiL._AC_SL1500_.jpg", // KRAZY GLUE 12PK
    "00076171939937": "https://m.media-amazon.com/images/I/91aKkdoRTdL._AC_SL1500_.jpg", // LITTLE TREES VARIETY
    "038200041226": "https://m.media-amazon.com/images/I/71AOMz+UOdL._SX569_.jpg", // PICKLE IN POUCH HOT
    "038900773700": "https://m.media-amazon.com/images/I/71t5fM-gb0L._SL1500_.jpg", // DOLE PINEAPPLE
    "023604215632": "https://m.media-amazon.com/images/I/81eUzAfObdL._AC_SL1500_.jpg", // TWANG LIME SALT
    "022600642039": "https://m.media-amazon.com/images/I/71H0tz0THJL._AC_SL1500_.jpg", // TROJAN MAGNUM
    "031700237762": "https://m.media-amazon.com/images/I/61OpQpiSgFL._AC_SL1001_.jpg", // WHITE OWL BLUE RASP
    "008660006035": "https://m.media-amazon.com/images/I/71XCwfEdkXL._AC_SL1500_.jpg", // ZIG ZAG CONE
    "014800582048": "https://m.media-amazon.com/images/I/71YMp4RuqaL._SL1500_.jpg", // REAL LIME
    "016229908515": "https://m.media-amazon.com/images/I/71bW1N6WQUL._SL1500_.jpg", // FOCO COCONUT
    "021136070545": "https://m.media-amazon.com/images/I/61-jkSDgQFL._SL1100_.jpg", // TOPOCHICO PLASTIC
    "025000058011": "https://m.media-amazon.com/images/I/71+OQg+WLiL._SL1500_.jpg"  // MINUTE MAID LEMONADE
  };

  // Check if we have a direct match by lookup code
  if (lookupCode in productImageMap) {
    return productImageMap[lookupCode];
  }
  
  // Keyword-based image matching
  if (description.toLowerCase().includes('topo chico') || description.toLowerCase().includes('topochico')) {
    return "https://m.media-amazon.com/images/I/61M3EzHzBkL._SL1100_.jpg";
  }
  
  if (description.toLowerCase().includes('battery') || description.toLowerCase().includes('duracell')) {
    return "https://m.media-amazon.com/images/I/71o8z4kbG+L._AC_SL1500_.jpg";
  }
  
  if (description.toLowerCase().includes('zig zag')) {
    return "https://m.media-amazon.com/images/I/71XCwfEdkXL._AC_SL1500_.jpg";
  }
  
  if (description.toLowerCase().includes('clamato')) {
    return "https://m.media-amazon.com/images/I/71e0co0PADL._SL1500_.jpg";
  }
  
  if (description.toLowerCase().includes('trojan')) {
    return "https://m.media-amazon.com/images/I/71H0tz0THJL._AC_SL1500_.jpg";
  }
  
  if (description.toLowerCase().includes('pickle')) {
    return "https://m.media-amazon.com/images/I/71AOMz+UOdL._SX569_.jpg";
  }
  
  if (description.toLowerCase().includes('little tree')) {
    return "https://m.media-amazon.com/images/I/91aKkdoRTdL._AC_SL1500_.jpg";
  }
  
  if (description.toLowerCase().includes('swisher') || description.toLowerCase().includes('cigar')) {
    return "https://m.media-amazon.com/images/I/71Fx21KLc5L._AC_SL1500_.jpg";
  }
  
  if (description.toLowerCase().includes('twang') || description.toLowerCase().includes('salt')) {
    return "https://m.media-amazon.com/images/I/81eUzAfObdL._AC_SL1500_.jpg";
  }
  
  // Department-based fallbacks
  if (department.toLowerCase().includes('food') || department.toLowerCase().includes('beverage')) {
    return "https://m.media-amazon.com/images/I/71J76P5+9LL._SL1500_.jpg";
  }
  
  if (department.toLowerCase().includes('tobacco')) {
    return "https://m.media-amazon.com/images/I/71QZrQFj78L._AC_SL1500_.jpg";
  }
  
  if (department.toLowerCase().includes('electronics')) {
    return "https://m.media-amazon.com/images/I/71o8z4kbG+L._AC_SL1500_.jpg";
  }
  
  if (department.toLowerCase().includes('smoke')) {
    return "https://m.media-amazon.com/images/I/61vLHqk7XsL._AC_SL1500_.jpg";
  }
  
  if (department.toLowerCase().includes('liquor')) {
    return "https://m.media-amazon.com/images/I/71QYeYXqXdL._AC_SL1500_.jpg";
  }
  
  // Default fallback image
  return "https://m.media-amazon.com/images/I/61M3EzHzBkL._SL1100_.jpg";
}

// The specific items we want to add from the sheet
const itemsToAdd = [
  "00014800003628", // CLAMATO MICHELADA
  "00014800511765", // CLAMATO 16OZ
  "00021136070378", // TOPO CHICO 24CT 
  "00041333009612", // DURACELL AA 4PK
  "00070158112054", // KRAZY GLUE 12PK
  "008660006035",   // ZIG ZAG CONE
  "014800582048",   // REAL LIME
  "016229908515",   // FOCO COCONUT JUICE
  "021136070545",   // TOPOCHICO PLASTIC WATER
  "023604215632",   // TWANG LIME SALT
  "025000058011",   // MINUTE MAID LEMONADE
  "038200041226",   // PICKLE IN POUCH HOT
  "038900773700"    // DOLE PINEAPPLE
];

async function main() {
  console.log('Adding authentic items from price sheet...');
  
  try {
    // Get full path to CSV file
    const csvFilePath = path.resolve('./attached_assets/itemlist2.csv');
    console.log('Reading from:', csvFilePath);
    
    // Read the CSV file - use binary mode to handle BOM correctly
    const csvData = fs.readFileSync(csvFilePath);
    
    // Convert Buffer to string and manually handle BOM if present
    let csvString = csvData.toString('utf8');
    
    // Remove BOM if present
    if (csvString.charCodeAt(0) === 0xFEFF) {
      csvString = csvString.slice(1);
    }
    
    // Parse the CSV data
    const records = parse(csvString, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      bom: true, // Handle BOM automatically
      skip_records_with_empty_values: true
    });
    
    console.log('CSV parsed, found', records.length, 'records');
    
    // Print a sample of the records for debugging
    for (let i = 0; i < Math.min(5, records.length); i++) {
      console.log(`Record ${i}:`, records[i]);
    }
    
    // Get existing categories
    const existingCategories = await db.select().from(categories);
    
    let newProducts = 0;
    let skippedProducts = 0;
    
    // Directly check for the products we want by lookup code
    console.log('Directly checking for products by lookup code:');
    
    // Create a list to store the valid/usable records
    const usableRecords = [];
    
    // Manually find and add the records we want
    for (const record of records) {
      const lookupCode = record['Item Lookup Code'];
      if (lookupCode && itemsToAdd.includes(lookupCode)) {
        console.log('Found wanted item:', lookupCode, record['Description']);
        usableRecords.push(record);
      }
    }
    
    console.log('Found', usableRecords.length, 'usable records to import');
    
    // Process each selected record
    for (const record of usableRecords) {
      try {
        const lookupCode = record['Item Lookup Code'];
        const department = record['Department'] || 'Uncategorized';
        const category = record['Category'] || '';
        const description = record['Description'] || '';
        
        // Skip if missing key fields
        if (!description) {
          skippedProducts++;
          continue;
        }
        
        // Check if product already exists by lookup code
        const existingProduct = await db.select().from(products).where(eq(products.sku, lookupCode)).limit(1);
        
        if (existingProduct.length > 0) {
          console.log(`Product already exists: ${description}`);
          skippedProducts++;
          continue;
        }
        
        // Clean up the cost value
        let cost = record['Cost'] || '0';
        cost = cost.replace('$', '').trim();
        const basePrice = parseFloat(cost) || 0;
        
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
        const imageUrl = selectProductImage(description, department, category, lookupCode);
        
        // Get the sales price from the record (if available)
        let salesPrice = 0;
        if (record['Sales'] && record['Quantity Sold']) {
          const sales = parseFloat(record['Sales'].replace('$', '').replace(',', ''));
          const quantitySold = parseInt(record['Quantity Sold'].replace(',', ''));
          if (!isNaN(sales) && !isNaN(quantitySold) && quantitySold > 0) {
            salesPrice = Math.round((sales / quantitySold) * 100) / 100;
          }
        }
        
        // Use the sales price as the price if available, otherwise use calculated price
        const finalPrice = salesPrice > 0 ? salesPrice : price1;
        
        // Add the product to the database
        await db.insert(products).values({
          name: description,
          description: `${description} - ${department}${category ? ' - ' + category : ''}`,
          sku: lookupCode,
          basePrice: basePrice,
          price: finalPrice,
          price1: finalPrice,
          price2: price2,
          price3: price3,
          price4: price4,
          price5: price5,
          imageUrl: imageUrl,
          stock: Math.floor(Math.random() * 50) + 25, // Random stock between 25 and 75
          categoryId: categoryId,
          featured: Math.random() > 0.7, // 30% chance of being featured
        });
        
        newProducts++;
        console.log(`Added product: ${description} (${lookupCode})`);
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