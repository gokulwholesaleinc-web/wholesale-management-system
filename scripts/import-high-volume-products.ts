import fs from 'fs';
import { parse } from 'csv-parse/sync';
import path from 'path';
import { db } from '../server/db';
import { insertProductSchema, products, categories } from '../shared/schema';
import { eq } from 'drizzle-orm';

interface CsvProduct {
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

function parsePrice(priceStr: string): number {
  if (!priceStr || priceStr === '' || priceStr === '$0.00') return 0;
  // Remove dollar sign and commas
  const cleanedPrice = priceStr.replace(/[$,]/g, '');
  // Convert to float
  return parseFloat(cleanedPrice);
}

function selectImageUrl(description: string, department: string, category: string): string {
  // Create a mapping of keywords to image URLs
  const imageMap: Record<string, string> = {
    'MONSTER': 'https://m.media-amazon.com/images/I/71i-aw15B-L.jpg',
    'RED BULL': 'https://m.media-amazon.com/images/I/61h6tOjl4zL.jpg',
    'ENERGY DRINK': 'https://m.media-amazon.com/images/I/71Uy9tWEYrL.jpg',
    'CLAMATO': 'https://m.media-amazon.com/images/I/61cgrXcWOAL.jpg',
    'MICHELADA': 'https://m.media-amazon.com/images/I/71OOJDsHkuL.jpg',
    'TOPO CHICO': 'https://m.media-amazon.com/images/I/71PGR8EzbkL.jpg',
    'DURACELL': 'https://m.media-amazon.com/images/I/71Fci4MUOdL.jpg',
    'BATTERY': 'https://m.media-amazon.com/images/I/71gxlZ7pXNL.jpg',
    'BULL DOG': 'https://m.media-amazon.com/images/I/61Ld9MU4W8L.jpg',
    'CIGARETTE': 'https://m.media-amazon.com/images/I/61rKf-OUjDL.jpg',
    'CIGAR': 'https://m.media-amazon.com/images/I/71yNjQVLfGL.jpg',
    'BLACK BAGS': 'https://m.media-amazon.com/images/I/61HK8y0V73L.jpg',
    'WHITE BAG': 'https://m.media-amazon.com/images/I/61JGpT+pQgL.jpg',
    'BAG': 'https://m.media-amazon.com/images/I/81fZznV4yJL.jpg',
    'WATER': 'https://m.media-amazon.com/images/I/71Ey-vfgvQL.jpg',
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
    console.log('Importing high-volume products from CSV...');
    const filePath = path.join(process.cwd(), 'attached_assets', 'itemlist2.csv');
    
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      process.exit(1);
    }

    const fileContent = fs.readFileSync(filePath, 'utf8');
    
    // Parse the CSV file
    const records = parse(fileContent, {
      columns: [
        'lookupCode', 'department', 'category', 'description', 
        'quantitySold', 'sales', 'lastSold', 'cost', 'costSold', 
        'nonSaleMovement', 'lastReceived'
      ],
      from: 4, // Skip the header, Grand Summaries, and summary line
      skip_empty_lines: true,
      cast: (value, context) => {
        if (context.column === 'quantitySold') {
          return parseInt(value, 10);
        }
        if (context.column === 'nonSaleMovement') {
          return parseInt(value, 10);
        }
        return value;
      }
    });

    let importedCount = 0;
    let skippedCount = 0;
    
    // Filter products with quantity sold > 2
    const highVolumeProducts = records.filter((record: CsvProduct) => 
      record.quantitySold > 2
    );
    
    console.log(`Found ${highVolumeProducts.length} high-volume products to import`);

    for (const product of highVolumeProducts) {
      try {
        // Calculate base price (cost) and retail price
        const basePrice = parsePrice(product.cost);
        // Calculate retail price with a 25% markup
        const retailPrice = basePrice * 1.25;
        
        // Calculate tiered pricing
        const priceLevel1 = retailPrice;
        const priceLevel2 = parseFloat((retailPrice * 0.975).toFixed(2)); // 2.5% discount
        const priceLevel3 = parseFloat((retailPrice * 0.95).toFixed(2));  // 5% discount
        const priceLevel4 = parseFloat((retailPrice * 0.925).toFixed(2)); // 7.5% discount
        const priceLevel5 = parseFloat((retailPrice * 0.90).toFixed(2));  // 10% discount

        // Generate a stock amount based on quantity sold (ensure it's an integer)
        const stock = Math.max(10, Math.floor(product.quantitySold * 1.5));

        // Ensure the product's category exists
        const categoryId = await ensureCategoryExists(product.department, product.category);
        
        // Find an appropriate image URL
        const imageUrl = selectImageUrl(product.description, product.department, product.category);

        // Prepare the product data
        const productData = insertProductSchema.parse({
          name: product.description,
          description: `${product.description} - ${product.department}`,
          sku: product.lookupCode,
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
          featured: product.quantitySold > 100 // Features products with high sales
        });

        // Check if product already exists by SKU
        const existingProduct = product.lookupCode ? 
          await db.select()
            .from(products)
            .where(eq(products.sku, product.lookupCode))
            .limit(1) : 
          [];

        if (existingProduct.length > 0) {
          // Update existing product
          await db.update(products)
            .set(productData)
            .where(eq(products.id, existingProduct[0].id));
          
          console.log(`Updated existing product: ${product.description}`);
        } else {
          // Insert new product
          await db.insert(products).values(productData);
          importedCount++;
          
          if (importedCount % 10 === 0) {
            console.log(`Imported ${importedCount} products so far...`);
          }
        }
      } catch (err) {
        console.error(`Error importing product ${product.description}:`, err);
        skippedCount++;
      }
    }

    console.log(`Import complete! Imported ${importedCount} products, skipped ${skippedCount} products.`);
  } catch (error) {
    console.error('Error importing products:', error);
    process.exit(1);
  }
}

main();