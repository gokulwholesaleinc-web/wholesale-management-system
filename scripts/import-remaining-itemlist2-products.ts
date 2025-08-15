import { parse } from 'csv-parse/sync';
import fs from 'fs';
import path from 'path';
import { db } from '../server/db';
import { products, categories, type InsertProduct } from '../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * This script imports products from itemlist2.csv that are not yet in the database
 * It ensures we have all the products from the itemlist2 file
 */

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

function parsePrice(priceStr: string): number {
  if (!priceStr || priceStr === '' || priceStr === 'N/A') return 0;
  
  // Remove $ and other non-numeric characters except decimal point
  const cleanedStr = priceStr.replace(/[^\d.-]/g, '');
  const price = parseFloat(cleanedStr);
  
  return isNaN(price) ? 0 : Math.round(price * 100) / 100;
}

function selectImageUrl(description: string, department: string, category: string, lookupCode: string): string {
  // Default generic image for products without specific matches
  let imageUrl = 'https://www.eatthis.com/wp-content/uploads/sites/4/2019/06/convenience-store.jpg';
  
  const productName = description.toLowerCase();
  
  // Coca-Cola family products
  if (productName.includes('coca cola') || productName.includes('coke ') || productName.includes('20oz coke')) {
    return 'https://www.meijer.com/content/dam/meijer/product/0004/90/0000/04/0004900000040_1_A1C1_0600.png';
  }
  
  if (productName.includes('diet coke') || productName.includes('diet coca cola')) {
    return 'https://www.instacart.com/image-server/932x932/filters:fill(FFF,true):format(webp)/www.instacart.com/assets/domains/product-image/files/6b4ce31a-4afb-4d14-8d0b-4e42dc30a351.png';
  }
  
  if (productName.includes('coke zero')) {
    return 'https://i5.walmartimages.com/seo/Coke-Zero-Sugar-Soda-Cola-20-fl-oz-Bottle_f3aef5e1-e535-4f41-b01e-2597bab7c9c9.6b5c0d9fc2fbc36f9f64c85b8bfcef03.jpeg';
  }
  
  if (productName.includes('sprite')) {
    return 'https://www.sprite.com/content/dam/nagbrands/us/sprite/en/products/clear/desktop/sprite-clear-20oz.png';
  }
  
  if (productName.includes('fanta')) {
    return 'https://www.fanta.com/content/dam/nagbrands/us/fanta/en/products/orange/Fanta_Orange_20oz.png';
  }
  
  if (productName.includes('dr pepper')) {
    return 'https://pepsico-na-cdn.com/images/default-source/products-ecom-images/dpsuproducts/dr-pepper.png';
  }
  
  // Energy drinks
  if (productName.includes('monster')) {
    return 'https://www.monsterenergy.com/media/uploads_image/2022/03/23/auto/800/cf8bcf161cc20e3e3be3fc3a7e1d5754.png';
  }
  
  if (productName.includes('red bull')) {
    return 'https://assets.redbull.com/images/w_1920/q_auto,f_auto/redbullcom/2022/11/18/q6tr697oe1tlmrx91otz/red-bull-energy-drink-can-12-fl-oz';
  }
  
  // Tobacco products
  if (department.toLowerCase().includes('tobacco') || category.toLowerCase().includes('cigar')) {
    return 'https://media.istockphoto.com/id/535454215/vector/no-smoking-sign.jpg?s=612x612&w=0&k=20&c=4LTvQX9YbHZDQDYQbWeC5RvKZPZcSKUvZ4qlFhP0HBI=';
  }
  
  // Candy & Snacks
  if (productName.includes('snickers') || (department.toLowerCase().includes('candy') && productName.includes('snicker'))) {
    return 'https://www.snickers.com/sites/g/files/fnmzdf616/files/migrate-product-files/dryeayyvwgysbkldxqgd.png';
  }
  
  if (productName.includes('m&m') || productName.includes('m & m')) {
    return 'https://www.mms.com/sites/g/files/fnmzdf236/files/migrate-product-files/files/images/products/product-images/standalone/us_choc_peg_4-0_2.png';
  }
  
  // Cleaning products
  if (department.toLowerCase().includes('cleaning') || category.toLowerCase().includes('cleaning')) {
    return 'https://m.media-amazon.com/images/I/81B+qv7OYzL._SX522_.jpg';
  }
  
  // Electronics and batteries
  if (productName.includes('duracell') || productName.includes('battery')) {
    return 'https://m.media-amazon.com/images/I/71TwvkQLCZL._AC_UF1000,1000_QL80_.jpg';
  }
  
  // Lighters
  if (productName.includes('lighter') || productName.includes('bic lighter')) {
    return 'https://m.media-amazon.com/images/I/71QISOI7jbL._AC_UF1000,1000_QL80_.jpg';
  }
  
  return imageUrl;
}

async function ensureCategoryExists(department: string, categoryName: string): Promise<number> {
  // Standardize department names
  let formattedDept = department.trim();
  
  // Check if category exists
  const [existingCategory] = await db.select().from(categories).where(eq(categories.name, categoryName));
  
  if (existingCategory) {
    return existingCategory.id;
  }
  
  // Create new category
  const [newCategory] = await db.insert(categories).values([{
    name: categoryName,
    description: `${categoryName} - ${formattedDept}`
  }]).returning();
  
  return newCategory.id;
}

async function main() {
  try {
    console.log('Starting import of remaining products from itemlist2.csv...');
    
    // Load the CSV file
    const filePath = path.resolve('./attached_assets/itemlist2.csv');
    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Parse the CSV content
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true
    }) as ItemListEntry[];
    
    console.log(`Found ${records.length} products in CSV file`);
    
    // Get existing product lookup codes
    const existingProducts = await db.select().from(products);
    const existingCodes = new Set();
    
    // Process existing SKUs and add them to our set
    console.log("Example SKUs:");
    for (let i = 0; i < Math.min(10, existingProducts.length); i++) {
      console.log(`  Product ${i+1}: ${existingProducts[i].name} - SKU: "${existingProducts[i].sku || 'EMPTY'}"`);
      if (existingProducts[i].sku && existingProducts[i].sku.trim() !== '') {
        existingCodes.add(existingProducts[i].sku.trim());
      }
    }
    
    // Debug SKU matching
    console.log(`First 5 SKUs in our set:`, Array.from(existingCodes).slice(0, 5));
    
    console.log(`Found ${existingProducts.length} existing products in database`);
    console.log(`Will check for new products to import...`);
    
    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    // Import products in smaller batches to avoid overloading the database
    const batchSize = 2;
    let currentBatch = 0;
    const batches = Math.ceil((records.length - existingProducts.length) / batchSize);
    
    // Add a maximum limit to avoid processing too many products at once
    const MAX_PRODUCTS_TO_PROCESS = 50;
    console.log(`Will process up to ${MAX_PRODUCTS_TO_PROCESS} products in this run`);
    
    // Process in smaller batches
    for (let i = 0; i < records.length && importedCount + skippedCount < MAX_PRODUCTS_TO_PROCESS; i += batchSize) {
      currentBatch++;
      const batch = records.slice(i, i + batchSize);
      console.log(`Processing batch ${currentBatch} of approximately ${batches}...`);
      console.log(`Progress: ${importedCount} imported, ${skippedCount} skipped (${importedCount + skippedCount}/${MAX_PRODUCTS_TO_PROCESS} total)`);
      
      // Stop if we've processed too many products to avoid timeouts
      if (currentBatch > 30) {
        console.log(`Reached maximum batch count of 30, stopping for now.`);
        break;
      }
      
      // Process each product in the batch
      for (const record of batch) {
        // Debug item lookup code
        console.log(`Record lookup code: "${record['Item Lookup Code'] || 'EMPTY'}", Description: "${record.Description || 'EMPTY'}"`);
        
        // Generate a lookup code if one doesn't exist
        let lookupCode = record['Item Lookup Code'];
        if (!lookupCode || lookupCode.trim() === '') {
          // Create a lookup code based on the product description
          if (record.Description) {
            // Create a code from description - replace spaces with underscores and make uppercase
            lookupCode = record.Description.replace(/\s+/g, '_').toUpperCase().substring(0, 20);
            console.log(`Generated lookup code ${lookupCode} for ${record.Description}`);
          } else {
            // Use a random number if we don't have a description
            lookupCode = `GEN_PROD_${Math.floor(Math.random() * 10000)}`;
            console.log(`Generated random lookup code ${lookupCode} for product with no description`);
          }
        }
        
        // Skip products that already exist
        if (existingCodes.has(lookupCode.trim())) {
          console.log(`Skipping product: ${record.Description?.substring(0, 30) || 'Unknown'} - already exists with code ${lookupCode}`);
          skippedCount++;
          continue;
        }
        
        try {
          console.log(`Attempting to import product: ${record.Description?.substring(0, 30) || 'Unknown'} (${record['Item Lookup Code']})`);
          console.log(`Department: ${record.Department || 'None'}, Category: ${record.Category || 'None'}`);
          
          // Get or create category
          const categoryId = await ensureCategoryExists(record.Department || 'Uncategorized', record.Category || 'General');
          console.log(`Using category ID: ${categoryId}`);
          
          // Calculate price based on cost (add 35% markup)
          const cost = parsePrice(record.Cost);
          const calculatedPrice = Math.round((cost * 1.35) * 100) / 100;
          
          // Set price to at least $1.00
          const price = calculatedPrice < 1.00 ? 1.00 : calculatedPrice;
          console.log(`Setting price: $${price} (from cost: $${cost})`);
          
          // Set image URL based on product details
          const imageUrl = selectImageUrl(
            record.Description || '', 
            record.Department || 'Uncategorized', 
            record.Category || 'General',
            lookupCode
          );
          
          // Create product data
          const productData: InsertProduct = {
            name: record.Description || `Product ${lookupCode}`,
            description: `${record.Description || 'Unnamed Product'} - ${record.Department || 'Uncategorized'}/${record.Category || 'General'}`,
            sku: lookupCode,
            price: price,
            basePrice: cost,
            price1: price,           // All have the same price as requested
            price2: price,           // All have the same price as requested
            price3: price,           // All have the same price as requested
            price4: price,           // All have the same price as requested
            price5: price,           // All have the same price as requested
            imageUrl: imageUrl,
            stock: 100,              // Default stock
            categoryId: categoryId,
            size: record.Description?.includes('oz') ? '20oz' : 'Standard',
          };
          
          // Log what we're going to insert
          console.log(`Inserting product data:`, JSON.stringify(productData).substring(0, 100) + '...');
          
          // Insert product
          const result = await db.insert(products).values([productData]).returning();
          console.log(`Insert result:`, result);
          
          importedCount++;
          
          // Log progress
          console.log(`Successfully imported product: ${record.Description?.substring(0, 30) || 'Unknown'} (${importedCount} total)`);
          
          // Add the lookup code to our existing codes set
          existingCodes.add(lookupCode);
        } catch (error) {
          console.error(`Error importing product ${lookupCode}:`, error);
          errorCount++;
          
          // If we get too many errors, pause and then continue
          if (errorCount > 5) {
            console.log('Too many errors, pausing for 2 seconds...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            errorCount = 0;
          }
        }
      }
      
      // Pause between batches to avoid overloading the database
      console.log(`Completed batch ${currentBatch}, pausing for 1 second...`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`Import complete! Imported ${importedCount} new products, skipped ${skippedCount} existing products.`);
    
  } catch (error) {
    console.error('Error in import script:', error);
  } finally {
    process.exit(0);
  }
}

main();