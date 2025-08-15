import fs from 'fs';
import path from 'path';
import { db } from '../server/db';
import { products, categories } from '../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * This script imports products from the pricelist.csv file
 * It handles CSV issues like quoted fields and inconsistent lines
 * by processing the file line by line instead of using csv-parse
 */

// Product interface that matches our schema
interface Product {
  name: string;
  description: string;
  sku: string;
  basePrice: number;
  price: number;
  price1: number;
  price2: number;
  price3: number;
  price4: number;
  price5: number;
  imageUrl: string;
  stock: number;
  categoryId: number;
}

// Function to select image URL based on product details
function selectImageUrl(description: string, department: string, category: string): string {
  // Create a mapping of keywords to image URLs
  const imageMap: Record<string, string> = {
    'MONSTER': 'https://m.media-amazon.com/images/I/71i-aw15B-L.jpg',
    'RED BULL': 'https://m.media-amazon.com/images/I/61h6tOjl4zL.jpg',
    'ENERGY DRINK': 'https://m.media-amazon.com/images/I/71Uy9tWEYrL.jpg',
    '5-HOUR': 'https://m.media-amazon.com/images/I/61RxJJJWsAL.jpg',
    'CLAMATO': 'https://m.media-amazon.com/images/I/61cgrXcWOAL.jpg',
    'MICHELADA': 'https://m.media-amazon.com/images/I/71OOJDsHkuL.jpg',
    'TOPO CHICO': 'https://m.media-amazon.com/images/I/71PGR8EzbkL.jpg',
    'DURACELL': 'https://m.media-amazon.com/images/I/71Fci4MUOdL.jpg',
    'BATTERY': 'https://m.media-amazon.com/images/I/71gxlZ7pXNL.jpg',
    'BULL DOG': 'https://m.media-amazon.com/images/I/61Ld9MU4W8L.jpg',
    'CIGARETTE': 'https://m.media-amazon.com/images/I/61rKf-OUjDL.jpg',
    'CIGAR': 'https://m.media-amazon.com/images/I/71yNjQVLfGL.jpg',
    'SWISHER': 'https://m.media-amazon.com/images/I/71NzYPGstlL.jpg',
    'BLACK BAGS': 'https://m.media-amazon.com/images/I/61HK8y0V73L.jpg',
    'WHITE BAG': 'https://m.media-amazon.com/images/I/61JGpT+pQgL.jpg',
    'BAG': 'https://m.media-amazon.com/images/I/81fZznV4yJL.jpg',
    'PERRIER': 'https://m.media-amazon.com/images/I/61ZU1JbPYwL.jpg',
    'WATER': 'https://m.media-amazon.com/images/I/71Ey-vfgvQL.jpg',
    'ALKA SELTZER': 'https://m.media-amazon.com/images/I/81FXQJ7PPOL.jpg',
    'CUP': 'https://m.media-amazon.com/images/I/71SmRbLQXGL.jpg',
    'PLATE': 'https://m.media-amazon.com/images/I/71V0vXJJwLL.jpg',
    'NAPKIN': 'https://m.media-amazon.com/images/I/71TZ-pRRHrL.jpg',
    'STRAW': 'https://m.media-amazon.com/images/I/71z25cJ9PNL.jpg',
    'TOWEL': 'https://m.media-amazon.com/images/I/81YpDzGPtQL.jpg',
    'COKE': 'https://m.media-amazon.com/images/I/61Ag+HCh-4L.jpg',
    'RAW': 'https://m.media-amazon.com/images/I/71MR5V6CqML.jpg',
    'BACKWOOD': 'https://m.media-amazon.com/images/I/71uOT0SiUNL.jpg',
    'DUTCH MASTER': 'https://m.media-amazon.com/images/I/81wWkJa8nCL.jpg',
  };

  // Check each keyword in our image map
  for (const [keyword, imageUrl] of Object.entries(imageMap)) {
    if (description && description.toUpperCase().includes(keyword) || 
        department && department.toUpperCase().includes(keyword) || 
        category && category.toUpperCase().includes(keyword)) {
      return imageUrl;
    }
  }

  // Default images based on department
  const departmentImages: Record<string, string> = {
    'FOOD & BEVERAGE': 'https://m.media-amazon.com/images/I/716EZ7Qgv8L.jpg',
    'PLASTIC/PAPER GOODS': 'https://m.media-amazon.com/images/I/61IWLQzGIFL.jpg',
    'SMOKE SUPPLIES': 'https://m.media-amazon.com/images/I/613M98Y1H8L.jpg',
    'ELECTRONICS & ACCESSORIES': 'https://m.media-amazon.com/images/I/71xb2xkN5qL.jpg',
    'TOBACCO': 'https://m.media-amazon.com/images/I/61vxrXPbFmL.jpg',
    'MEDS/DAILY CARE': 'https://m.media-amazon.com/images/I/71KZoFCMGbL.jpg',
  };

  return departmentImages[department] || 'https://m.media-amazon.com/images/I/61vJcKJSrML.jpg';
}

// Function to parse price from string
function parsePrice(priceStr: string): number {
  if (!priceStr || priceStr === '' || priceStr === '0.0000') return 0;
  // Remove any non-numeric characters except for decimal point
  const cleanPrice = priceStr.replace(/[^0-9.]/g, '');
  // Convert string to float
  return parseFloat(cleanPrice) || 0;
}

// Function to parse a CSV line that might contain quotes and commas
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let inQuotes = false;
  let currentValue = '';
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(currentValue.trim());
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  
  // Add the last value
  result.push(currentValue.trim());
  
  return result;
}

// Function to ensure a category exists, returns its ID
async function ensureCategoryExists(department: string, categoryName: string): Promise<number> {
  // Use the category name if provided, otherwise use department
  let fullCategoryName = department || 'Uncategorized';
  if (categoryName && categoryName.trim() !== '') {
    fullCategoryName = categoryName;
  }

  // Check if category already exists
  const existingCategory = await db.select()
    .from(categories)
    .where(eq(categories.name, fullCategoryName))
    .limit(1);

  if (existingCategory.length > 0) {
    return existingCategory[0].id;
  }

  // Create the category if it doesn't exist
  const [newCategory] = await db.insert(categories)
    .values({
      name: fullCategoryName,
      description: `${fullCategoryName} products`
    })
    .returning();

  return newCategory.id;
}

// Main function
async function main() {
  try {
    console.log('Importing products from price list...');
    const filePath = path.join(process.cwd(), 'attached_assets', 'pricelist.csv');
    
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      process.exit(1);
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    const lines = fileContent.split('\n');
    
    // Skip header line
    const dataLines = lines.slice(1);
    console.log(`Found ${dataLines.length} lines in price list`);
    
    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (let i = 0; i < dataLines.length; i++) {
      const line = dataLines[i];
      if (!line.trim()) {
        // Skip empty lines
        continue;
      }
      
      try {
        // Parse the line
        const fields = parseCSVLine(line);
        
        // Make sure we have at least the basic fields
        if (fields.length < 5) {
          console.warn(`Skipping line ${i+2}: Not enough fields (${fields.length})`);
          skippedCount++;
          continue;
        }
        
        const department = fields[0];
        const category = fields[1];
        const lookupCode = fields[2];
        const description = fields[3];
        const cost = parsePrice(fields[4]);
        const price = parsePrice(fields[5]);
        const priceA = fields.length > 6 ? parsePrice(fields[6]) : 0;
        const priceB = fields.length > 7 ? parsePrice(fields[7]) : 0;
        const priceC = fields.length > 8 ? parsePrice(fields[8]) : 0;
        
        if (!lookupCode || !description) {
          skippedCount++;
          continue; // Skip entries without lookup code or description
        }

        // Calculate tiered pricing
        const basePrice = Math.max(0, cost);
        const priceLevel1 = Math.max(0, price);
        const priceLevel2 = priceA > 0 ? priceA : Math.round((priceLevel1 * 0.975) * 100) / 100;
        const priceLevel3 = priceB > 0 ? priceB : Math.round((priceLevel1 * 0.95) * 100) / 100;
        const priceLevel4 = priceC > 0 ? priceC : Math.round((priceLevel1 * 0.925) * 100) / 100;
        const priceLevel5 = Math.round((priceLevel1 * 0.90) * 100) / 100;

        // Generate a reasonable stock amount
        const stock = Math.floor(Math.random() * 50) + 20; // Between 20-70

        // Ensure the product's category exists
        const categoryId = await ensureCategoryExists(department, category);
        
        // Find an appropriate image URL
        const imageUrl = selectImageUrl(description, department, category);

        // Correct size for Coca-Cola products (16oz → 20oz)
        let correctedDescription = description;
        let correctedName = description;
        
        // Fix size for Coca-Cola family products
        if (description.includes('COKE 16 OZ') || 
            description.includes('COCA COLA 16 OZ') ||
            description.includes('SPRITE 16 OZ') || 
            description.includes('MINUTE MAID 16 OZ') || 
            description.includes('FANTA 16 OZ') ||
            description.includes('DR PEPPER 16 OZ')) {
          correctedDescription = description.replace('16 OZ', '20 OZ');
          correctedName = correctedDescription;
          console.log(`Corrected size: ${description} → ${correctedName}`);
        }
        
        // Prepare the product data
        const productData = {
          name: correctedName,
          description: `${correctedName} - ${department}`,
          sku: lookupCode,
          basePrice: basePrice,
          price: priceLevel1,
          price1: priceLevel1,
          price2: priceLevel2,
          price3: priceLevel3,
          price4: priceLevel4,
          price5: priceLevel5,
          imageUrl: imageUrl,
          stock: stock,
          categoryId: categoryId,
        };

        // Check if product already exists by SKU
        const existingProduct = await db.select()
          .from(products)
          .where(eq(products.sku, lookupCode))
          .limit(1);

        if (existingProduct.length > 0) {
          // Update existing product
          await db.update(products)
            .set(productData)
            .where(eq(products.id, existingProduct[0].id));
          
          updatedCount++;
          if (updatedCount % 10 === 0) {
            console.log(`Updated ${updatedCount} existing products so far...`);
          }
        } else {
          // Insert new product
          await db.insert(products).values(productData);
          importedCount++;
          
          if (importedCount % 10 === 0) {
            console.log(`Imported ${importedCount} new products so far...`);
          }
        }
      } catch (err) {
        console.error(`Error importing line ${i+2}:`, err);
        skippedCount++;
      }
    }

    console.log(`Import complete! Imported ${importedCount} new products, updated ${updatedCount} existing products, skipped ${skippedCount} products.`);
  } catch (error) {
    console.error('Error importing products:', error);
    process.exit(1);
  }
}

main();