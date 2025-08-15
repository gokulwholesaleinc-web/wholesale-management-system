import fs from 'fs';
import { parse } from 'csv-parse/sync';
import path from 'path';
import { db } from '../server/db';
import { insertProductSchema, products, categories } from '../shared/schema';
import { eq } from 'drizzle-orm';

interface PriceListItem {
  department: string;
  category: string;
  lookupCode: string;
  description: string;
  cost: number;
  price: number;
  priceA: number;
  priceB: number;
  priceC: number;
}

function parsePrice(priceStr: string): number {
  if (!priceStr || priceStr === '' || priceStr === '0.0000') return 0;
  // Convert string to float
  return parseFloat(priceStr);
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
    console.log('Importing products from price list...');
    const filePath = path.join(process.cwd(), 'attached_assets', 'pricelist.csv');
    
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      process.exit(1);
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Parse the CSV file
    const records = parse(fileContent, {
      columns: [
        'department', 'category', 'lookupCode', 'description',
        'cost', 'price', 'priceA', 'priceB', 'priceC'
      ],
      from: 2, // Skip the header
      skip_empty_lines: true,
      relax_quotes: true, // Allow quotes in fields
      relax_column_count: true, // Handle inconsistent column counts
      cast: (value, context) => {
        // Convert price columns to numbers
        if (['cost', 'price', 'priceA', 'priceB', 'priceC'].includes(context.column as string)) {
          return parsePrice(value);
        }
        return value;
      }
    });

    console.log(`Found ${records.length} products in price list`);
    
    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    
    for (const item of records) {
      try {
        if (!item.lookupCode || !item.description) {
          skippedCount++;
          continue; // Skip entries without lookup code or description
        }

        // Calculate tiered pricing
        // Use the price from pricelist as priceLevel1
        const basePrice = Math.max(0, item.cost);
        const priceLevel1 = Math.max(0, item.price);
        const priceLevel2 = item.priceA > 0 ? item.priceA : Math.round((priceLevel1 * 0.975) * 100) / 100;
        const priceLevel3 = item.priceB > 0 ? item.priceB : Math.round((priceLevel1 * 0.95) * 100) / 100;
        const priceLevel4 = item.priceC > 0 ? item.priceC : Math.round((priceLevel1 * 0.925) * 100) / 100;
        const priceLevel5 = Math.round((priceLevel1 * 0.90) * 100) / 100;

        // Generate a reasonable stock amount
        const stock = Math.floor(Math.random() * 50) + 20; // Between 20-70

        // Ensure the product's category exists
        const categoryId = await ensureCategoryExists(item.department, item.category);
        
        // Find an appropriate image URL
        const imageUrl = selectImageUrl(item.description, item.department, item.category);

        // Prepare the product data
        const productData = insertProductSchema.parse({
          name: item.description,
          description: `${item.description} - ${item.department}`,
          sku: item.lookupCode,
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