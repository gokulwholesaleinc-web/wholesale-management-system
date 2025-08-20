import fs from 'fs';
import { parse } from 'csv-parse/sync';
import path from 'path';
import { db } from '../server/db';
import { insertProductSchema, products, categories } from '../shared/schema';
import { eq } from 'drizzle-orm';

interface ItemListEntry {
  lookupCode: string;
  department: string;
  category: string;
  description: string;
  quantitySold: number;
  sales: string;
  lastSold: string;
  cost: string;
  costSold: string;
  nonSaleMovement: number;
  lastReceived: string;
}

interface PriceListItem {
  department: string;
  category: string;
  lookupCode: string;
  description: string;
  price: string;
}

function parsePrice(priceStr: string): number {
  if (!priceStr || priceStr === '' || priceStr === '0.0000') return 0;
  // Remove any commas and dollar signs, then convert to float
  return parseFloat(priceStr.replace(/[$,]/g, ''));
}

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
    'LIME': 'https://m.media-amazon.com/images/I/71Ld-ycU5nL.jpg',
    'LEMON': 'https://m.media-amazon.com/images/I/61bPYTfQbVL.jpg',
    'JUICE': 'https://m.media-amazon.com/images/I/71rYQeGlw3L.jpg',
    'COCONUT': 'https://m.media-amazon.com/images/I/71RLxLxBouL.jpg',
    'TROJAN': 'https://m.media-amazon.com/images/I/61pUgfZQVHL.jpg',
    'SALT': 'https://m.media-amazon.com/images/I/61HmUCfcb-L.jpg',
    'TWANG': 'https://m.media-amazon.com/images/I/61kvqdoJ0yL.jpg',
    'PICKLE': 'https://m.media-amazon.com/images/I/71c4UvGAHXL.jpg',
    'PAPER': 'https://m.media-amazon.com/images/I/81Yx1G08qUL.jpg',
  };

  // Check each keyword in our image map
  for (const [keyword, imageUrl] of Object.entries(imageMap)) {
    if (description.toUpperCase().includes(keyword) || 
        department.toUpperCase().includes(keyword) || 
        category.toUpperCase().includes(keyword)) {
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
    'LIQUOR SUPPLIES': 'https://m.media-amazon.com/images/I/61vJcKJSrML.jpg',
  };

  return departmentImages[department] || 'https://m.media-amazon.com/images/I/61vJcKJSrML.jpg';
}

async function ensureCategoryExists(department: string, categoryName: string): Promise<number> {
  // Combine department and category for a full category name if both exist
  let fullCategoryName = department;
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

async function main() {
  try {
    console.log('Importing high-volume products from itemlist2.csv...');
    
    // Load item list (products with 2+ sales)
    const itemListPath = path.join(process.cwd(), 'attached_assets', 'itemlist2.csv');
    if (!fs.existsSync(itemListPath)) {
      console.error(`File not found: ${itemListPath}`);
      process.exit(1);
    }
    
    const itemListContent = fs.readFileSync(itemListPath, 'utf8');
    const itemListRecords = parse(itemListContent, {
      columns: [
        'lookupCode', 'department', 'category', 'description', 
        'quantitySold', 'sales', 'lastSold', 'cost', 
        'costSold', 'nonSaleMovement', 'lastReceived'
      ],
      from: 2, // Skip header rows
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
    }) as ItemListEntry[];
    
    console.log(`Parsed ${itemListRecords.length} total records from itemlist2.csv`);
    
    // Filter for products with 2+ sales
    const highVolumeProducts = itemListRecords.filter(record => {
      // Skip the summary row or empty rows
      if (!record.lookupCode || record.lookupCode === 'Grand Summaries') return false;
      
      // Convert quantity sold to a number and check if >= 2
      const quantitySold = parseFloat(String(record.quantitySold).replace(/,/g, ''));
      return !isNaN(quantitySold) && quantitySold >= 2;
    });
    
    console.log(`Found ${highVolumeProducts.length} products with 2+ sales`);
    
    // Load price list
    const priceListPath = path.join(process.cwd(), 'attached_assets', 'pricelist2.csv');
    if (!fs.existsSync(priceListPath)) {
      console.error(`File not found: ${priceListPath}`);
      process.exit(1);
    }
    
    const priceListContent = fs.readFileSync(priceListPath, 'utf8');
    const priceListRecords = parse(priceListContent, {
      columns: [
        'department', 'category', 'lookupCode', 'description', 'price'
      ],
      from: 2, // Skip header
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
    }) as PriceListItem[];
    
    console.log(`Loaded ${priceListRecords.length} price entries`);
    
    // Create a map of lookup codes to prices
    const priceMap = new Map<string, string>();
    for (const item of priceListRecords) {
      if (item.lookupCode && item.price) {
        priceMap.set(item.lookupCode, item.price);
      }
    }
    
    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const item of highVolumeProducts) {
      try {
        if (!item.lookupCode || !item.description) {
          skippedCount++;
          continue; // Skip entries without lookup code or description
        }
        
        // Get the price from the price list if available
        let price = 0;
        if (priceMap.has(item.lookupCode)) {
          price = parsePrice(priceMap.get(item.lookupCode) || '0');
        } else {
          // Use the cost from the item list, marked up by 40%
          const cost = parsePrice(item.cost);
          price = Math.round((cost * 1.4) * 100) / 100;
        }
        
        // Calculate tiered pricing
        const basePrice = parsePrice(item.cost);
        const priceLevel1 = price;
        const priceLevel2 = Math.round((priceLevel1 * 0.975) * 100) / 100;
        const priceLevel3 = Math.round((priceLevel1 * 0.95) * 100) / 100;
        const priceLevel4 = Math.round((priceLevel1 * 0.925) * 100) / 100;
        const priceLevel5 = Math.round((priceLevel1 * 0.90) * 100) / 100;
        
        // Get actual stock amount based on non-sale movement (or a reasonable default)
        const stock = Math.max(item.nonSaleMovement, Math.floor(Math.random() * 30) + 20);
        
        // Ensure the product's category exists
        const categoryId = await ensureCategoryExists(item.department, item.category);
        
        // Find an appropriate image URL
        const imageUrl = selectImageUrl(item.description, item.department, item.category);
        
        // Skip products with no image
        if (!imageUrl) {
          console.log(`Skipping product without image: ${item.description}`);
          skippedCount++;
          continue;
        }
        
        // Prepare the product data
        const productData = insertProductSchema.parse({
          name: item.description,
          description: `${item.description} - ${item.department}`,
          sku: item.lookupCode,
          basePrice: basePrice,
          price: priceLevel1,
          priceLevel1: priceLevel1,
          priceLevel2: priceLevel2,
          priceLevel3: priceLevel3,
          priceLevel4: priceLevel4,
          priceLevel5: priceLevel5,
          imageUrl: imageUrl,
          stock: stock,
          categoryId: categoryId,
        });
        
        // Check if product already exists by SKU
        const existingProduct = await db.select()
          .from(products)
          .where(eq(products.sku, item.lookupCode))
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
        console.error(`Error importing product ${item.description}:`, err);
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