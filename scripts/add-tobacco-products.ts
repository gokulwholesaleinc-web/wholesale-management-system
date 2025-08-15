import { db } from '../server/db';
import { products, categories } from '../shared/schema';
import fs from 'fs';
import { parse } from 'csv-parse/sync';
import { eq } from 'drizzle-orm';
import path from 'path';

// Function to select an appropriate image based on product details
function selectProductImage(description: string, department: string, category: string, lookupCode: string): string {
  // Specific product matches by UPC/lookup code for tobacco products
  const productImageMap: Record<string, string> = {
    // White Owl products
    "031700237762": "https://m.media-amazon.com/images/I/61OpQpiSgFL._AC_SL1001_.jpg", // WHITE OWL BLUE RASP 
    "031700237717": "https://m.media-amazon.com/images/I/717zn8rZp5L._AC_SL1001_.jpg", // WHITE OWL WHITE GRAPE
    "031700237748": "https://m.media-amazon.com/images/I/61XwTvEPigL._AC_SL1000_.jpg", // WHITE OWL GREEN SWEET
    "031700237694": "https://m.media-amazon.com/images/I/61OGhR7bFcL._AC_SL1001_.jpg", // WHITE OWL SWEET
    "031700237779": "https://m.media-amazon.com/images/I/61KFc-gIfhL._AC_SL1001_.jpg", // WHITE OWL MANGO
    "031700237809": "https://m.media-amazon.com/images/I/61QQgPx+LwL._AC_SL1001_.jpg", // WHITE OWL STRAWBERRY
    "031700237816": "https://m.media-amazon.com/images/I/61DuIrONPHL._AC_SL1001_.jpg", // WHITE OWL PEACH
    
    // Swisher products
    "025900287337": "https://m.media-amazon.com/images/I/414FQodORnL._AC_SL1000_.jpg", // SWISHER REG
    "025900287344": "https://m.media-amazon.com/images/I/41NbNFogw0L._AC_SL1000_.jpg", // SWISHER GRAPE
    "025900287351": "https://m.media-amazon.com/images/I/41g46aOV+GL._AC_SL1000_.jpg", // SWISHER BLUE
    "025900296353": "https://m.media-amazon.com/images/I/71Fx21KLc5L._AC_SL1500_.jpg", // SWISHER GREEN SWEET
    "025900329839": "https://m.media-amazon.com/images/I/41j4Fkjdg4L._AC_SL1000_.jpg", // SWISHER DIAMOND
    
    // Zig Zag products
    "008660006035": "https://m.media-amazon.com/images/I/71XCwfEdkXL._AC_SL1500_.jpg", // ZIG ZAG CONE
    "008660006073": "https://m.media-amazon.com/images/I/81FtPVJStdL._AC_SL1500_.jpg", // ZIG ZAG UNBLEACHED CONE
    "008660007247": "https://m.media-amazon.com/images/I/71hU7EAi0OL._AC_SL1500_.jpg", // ZIG ZAG ORANGE PAPER
    "008660007315": "https://m.media-amazon.com/images/I/71sOHQDTK2L._AC_SL1500_.jpg", // ZIG ZAG ULTRA THIN
    "008660007681": "https://m.media-amazon.com/images/I/71YwOlzMHNL._AC_SL1500_.jpg", // ZIG ZAG CONE UNBLEACHED
  };

  // Check if we have a direct match by lookup code
  if (lookupCode in productImageMap) {
    return productImageMap[lookupCode];
  }
  
  // Keyword-based image matching for tobacco products
  if (description.toLowerCase().includes('white owl')) {
    return "https://m.media-amazon.com/images/I/61OpQpiSgFL._AC_SL1001_.jpg";
  }
  
  if (description.toLowerCase().includes('swisher')) {
    return "https://m.media-amazon.com/images/I/41g46aOV+GL._AC_SL1000_.jpg";
  }
  
  if (description.toLowerCase().includes('zig zag')) {
    return "https://m.media-amazon.com/images/I/71XCwfEdkXL._AC_SL1500_.jpg";
  }
  
  if (description.toLowerCase().includes('cigar') || description.toLowerCase().includes('cigarillo')) {
    return "https://m.media-amazon.com/images/I/71Fx21KLc5L._AC_SL1500_.jpg";
  }
  
  // Default image for tobacco products
  return "https://m.media-amazon.com/images/I/71QZrQFj78L._AC_SL1500_.jpg";
}

// The tobacco products we want to add
const tobaccoProductsToAdd = [
  // White Owl
  "031700237762", // WHITE OWL BLUE RASP
  "031700237717", // WHITE OWL WHITE GRAPE
  "031700237748", // WHITE OWL GREEN SWEET
  "031700237694", // WHITE OWL SWEET
  "031700237779", // WHITE OWL MANGO
  "031700237809", // WHITE OWL STRAWBERRY
  "031700237816", // WHITE OWL PEACH
  
  // Swisher
  "025900287337", // SWISHER REG
  "025900287344", // SWISHER GRAPE
  "025900287351", // SWISHER BLUE
  "025900296353", // SWISHER GREEN
  "025900325718", // SWISHER BLACK SMOOTH
  "025900325725", // SWISHER BLACK CHERRY
  "025900325732", // SWISHER BLACK GRAPE
  "025900325749", // SWISHER BLACK BERRY
  "025900329839", // SWISHER DIAMOND
  
  // Zig Zag
  "008660006035", // ZIG ZAG CONE 1 1/4
  "008660006073", // ZIG ZAG UNBLEACHED CONE
  "008660007247", // ZIG ZAG ORANGE PAPER
  "008660007315", // ZIG ZAG ULTRA THIN
  "008660007681", // ZIG ZAG CONE UNBLEACHED
];

async function main() {
  console.log('Adding tobacco products from price sheet...');
  
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
    
    // Get existing categories
    const existingCategories = await db.select().from(categories);
    
    // Make sure TOBACCO category exists
    let tobaccoCategoryId: number | null = null;
    const existingTobaccoCategory = existingCategories.find(c => c.name.toUpperCase() === 'TOBACCO');
    
    if (existingTobaccoCategory) {
      tobaccoCategoryId = existingTobaccoCategory.id;
      console.log('Using existing TOBACCO category:', tobaccoCategoryId);
    } else {
      // Create TOBACCO category if it doesn't exist
      const [newCategory] = await db.insert(categories).values({
        name: 'TOBACCO',
        description: 'Tobacco products, cigars, and smoking accessories',
      }).returning();
      
      tobaccoCategoryId = newCategory.id;
      existingCategories.push(newCategory);
      console.log('Created new TOBACCO category:', tobaccoCategoryId);
    }
    
    // Create a list to store the valid/usable records
    const usableRecords = [];
    
    // Filter for tobacco products we want to import
    for (const record of records) {
      const lookupCode = record['Item Lookup Code'];
      if (lookupCode && tobaccoProductsToAdd.includes(lookupCode)) {
        console.log('Found tobacco item:', lookupCode, record['Description']);
        usableRecords.push(record);
      }
    }
    
    console.log('Found', usableRecords.length, 'tobacco products to import');
    
    let newProducts = 0;
    let skippedProducts = 0;
    
    // Process each tobacco record
    for (const record of usableRecords) {
      try {
        const lookupCode = record['Item Lookup Code'];
        const department = record['Department'] || 'TOBACCO';
        const category = record['Category'] || '';
        const description = record['Description'] || '';
        
        // Skip if missing key fields
        if (!description) {
          console.log('Skipping record missing description:', lookupCode);
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
        
        // Calculate markup-based prices (25% markup as default)
        const markup = 1.25;
        const price1 = Math.round(basePrice * markup * 100) / 100;
        const price2 = Math.round(price1 * 0.975 * 100) / 100; // 2.5% discount
        const price3 = Math.round(price1 * 0.95 * 100) / 100;  // 5% discount
        const price4 = Math.round(price1 * 0.925 * 100) / 100; // 7.5% discount
        const price5 = Math.round(price1 * 0.90 * 100) / 100;  // 10% discount
        
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
        
        // Get image URL based on product details
        const imageUrl = selectProductImage(description, department, category, lookupCode);
        
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
          categoryId: tobaccoCategoryId,
          featured: Math.random() > 0.7, // 30% chance of being featured
        });
        
        newProducts++;
        console.log(`Added tobacco product: ${description} (${lookupCode})`);
      } catch (error) {
        console.error(`Error processing record:`, error);
        skippedProducts++;
      }
    }
    
    console.log(`Import completed: ${newProducts} tobacco products added, ${skippedProducts} skipped.`);
  } catch (error) {
    console.error('Import failed:', error);
  } finally {
    console.log('Import process finished');
    process.exit(0);
  }
}

main().catch(console.error);