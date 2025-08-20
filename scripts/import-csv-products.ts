import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import { db } from '../server/db';
import { products, categories } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Get directory path in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Product image map - maps product keywords to image URLs
const productImages: Record<string, string> = {
  'CLAMATO': 'https://cdn.shopify.com/s/files/1/0528/0128/1929/products/clamato.jpg?v=1629911236',
  'TOPO CHICO': 'https://m.media-amazon.com/images/I/71FUNn6HUrL.jpg',
  'DURACELL': 'https://m.media-amazon.com/images/I/71QwR0Gk8DL.jpg',
  'BATTERY': 'https://m.media-amazon.com/images/I/71QwR0Gk8DL.jpg',
  'KRAZY GLUE': 'https://m.media-amazon.com/images/I/81Zt4ld8A4L.jpg',
  'LITTLE TREE': 'https://m.media-amazon.com/images/I/718TFRLCcEL.jpg',
  'SCOTCH': 'https://m.media-amazon.com/images/I/81-mFpwb2aL.jpg',
  'TAPE': 'https://m.media-amazon.com/images/I/81-mFpwb2aL.jpg',
  'BRELLA': 'https://cdn.shopify.com/s/files/1/0430/3887/2722/products/IMG_6985_1800x1800.jpg?v=1654711602',
  'ZIG ZAG': 'https://m.media-amazon.com/images/I/71m-7wz1+eL._AC_UF894,1000_QL80_.jpg',
  'COCONUT': 'https://m.media-amazon.com/images/I/61lfPw5+b0L.jpg',
  'ALKA-SELTZER': 'https://m.media-amazon.com/images/I/81z3+eGFcVL.jpg',
  'TWANG': 'https://m.media-amazon.com/images/I/71SNYFXQgPL.jpg',
  'SALT': 'https://m.media-amazon.com/images/I/71SNYFXQgPL.jpg',
  'CHAMOY': 'https://m.media-amazon.com/images/I/71nDlmXi4AL.jpg',
  'SWISHER': 'https://i5.walmartimages.com/asr/9d96ca6e-2e17-4254-b9cb-60f42c6e10fc.d79a9c6be9ef4bf49590f271bd9dcea3.jpeg',
  'WHITE OWL': 'https://cdn.shopify.com/s/files/1/0565/2661/4204/products/White-Owl-Cigars-White-Grape_480x480.jpg?v=1638297528',
  'MINUTE MAID': 'https://m.media-amazon.com/images/I/71qYz6rSRoL.jpg',
  'LEMONADE': 'https://m.media-amazon.com/images/I/71qYz6rSRoL.jpg',
  'MOBIL': 'https://m.media-amazon.com/images/I/81K9MVlMv6L.jpg',
  'OIL': 'https://m.media-amazon.com/images/I/81K9MVlMv6L.jpg',
  'PLATES': 'https://m.media-amazon.com/images/I/71DfuJjHdEL.jpg',
  'TROJAN': 'https://m.media-amazon.com/images/I/71Jq+YUTXQL.jpg',
  'GINSENG': 'https://m.media-amazon.com/images/I/71PnQ7O2YUL.jpg',
  'ENERGY': 'https://m.media-amazon.com/images/I/71PnQ7O2YUL.jpg',
  'LIME JUICE': 'https://m.media-amazon.com/images/I/71-Lp-gCxAL.jpg',
  'MICHELADA': 'https://m.media-amazon.com/images/I/71geTWCu1tL.jpg',
  'COCKTAIL': 'https://m.media-amazon.com/images/I/71geTWCu1tL.jpg',
  'ROSES': 'https://m.media-amazon.com/images/I/61H6xQkXmvL.jpg',
  'JUICE': 'https://m.media-amazon.com/images/I/61H6xQkXmvL.jpg',
  'WATER': 'https://m.media-amazon.com/images/I/61DPX4GRrML.jpg',
  'PAPER': 'https://m.media-amazon.com/images/I/71DfuJjHdEL.jpg',
  'GAME': 'https://cdn.shopify.com/s/files/1/0588/4227/5141/products/game-cigarillos-white-grape-2-for-0.99-cigars-cbsa-2_grande.jpg?v=1665150324',
};

// Department/category mapping - maps department to category
const departmentCategoryMap: Record<string, string> = {
  'FOOD & BEVERAGE': 'Beverages',
  'ELECTRONICS & ACCESSORIES': 'Electronics',
  'SMOKE SUPPLIES': 'Miscellaneous',
  'AUTOMOTIVE': 'Automotive',
  'LIQUOR SUPPLIES': 'Beverages',
  'WRAPS/FILTERS/HEMP/CONES': 'Miscellaneous',
  'MEDS/DAILY CARE': 'Healthcare',
  'PLASTIC/PAPER GOODS': 'Kitchen Supplies',
  'SUPPLEMENTS': 'Healthcare',
  'TOBACCO': 'Miscellaneous',
};

// Function to find best image match for a product
function findImageForProduct(productName: string, description: string, category: string): string {
  // Combine all product text for better matching
  const combinedText = `${productName} ${description} ${category}`.toUpperCase();
  
  // Try to find a direct match for the product name or keywords
  for (const [keyword, imageUrl] of Object.entries(productImages)) {
    if (combinedText.includes(keyword)) {
      return imageUrl;
    }
  }
  
  // Default image if no match found (generic product image)
  return 'https://cdn.shopify.com/s/files/1/0533/2089/files/placeholder-images-product-1_large.png?format=jpg&quality=90&v=1530129341';
}

async function main() {
  try {
    // Path to CSV file
    const csvFilePath = path.join(__dirname, '..', 'attached_assets', 'itemlist2.csv');
    
    // Check if file exists
    if (!fs.existsSync(csvFilePath)) {
      console.error('CSV file not found at:', csvFilePath);
      return;
    }
    
    console.log('Reading CSV file:', csvFilePath);
    const fileContent = fs.readFileSync(csvFilePath, { encoding: 'utf-8' });
    
    // Parse CSV
    const records = parse(fileContent, {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      trim: true,
      from_line: 3, // Skip the header lines
    });
    
    console.log(`Found ${records.length} products in CSV file`);
    
    // Extract unique departments and categories
    const departments = new Set<string>();
    records.forEach((record: any) => {
      if (record.Department && record.Department !== 'Department' && !record.Department.includes('Summaries')) {
        departments.add(record.Department);
      }
    });
    
    console.log(`Found ${departments.size} unique departments:`, Array.from(departments));
    
    // Map departments to categories and add them
    const categoryMap = new Map<string, number>();
    
    for (const department of departments) {
      const categoryName = departmentCategoryMap[department] || 'Miscellaneous';
      
      // Check if category exists
      const existingCategory = await db.select().from(categories).where(eq(categories.name, categoryName)).limit(1);
      
      if (existingCategory.length === 0) {
        const description = `Products in the ${department} department`;
        const newCategory = await db.insert(categories).values({
          name: categoryName,
          description: description
        }).returning();
        
        categoryMap.set(department, newCategory[0].id);
        console.log(`Created category: ${categoryName} with ID ${newCategory[0].id}`);
      } else {
        categoryMap.set(department, existingCategory[0].id);
        console.log(`Category already exists: ${categoryName} with ID ${existingCategory[0].id}`);
      }
    }
    
    // Process products
    let productsAdded = 0;
    
    for (const record of records) {
      // Skip summary rows and rows without proper Item Lookup Code
      if (!record['Item Lookup Code'] || 
          record['Item Lookup Code'] === 'Item Lookup Code' || 
          record['Item Lookup Code'].includes('Summaries')) {
        continue;
      }
      
      const name = record.Description;
      
      // Skip if no name/description
      if (!name) {
        console.log('Skipping product with no name/description');
        continue;
      }
      
      const department = record.Department || 'Miscellaneous';
      const category = record.Category || 'General';
      const categoryId = categoryMap.get(department) || 1; // Default to ID 1 if not found
      
      // Skip duplicates - check if the product already exists by name
      const existingProduct = await db.select().from(products).where(eq(products.name, name)).limit(1);
      
      if (existingProduct.length > 0) {
        console.log(`Product already exists: ${name} with ID ${existingProduct[0].id}`);
        continue;
      }
      
      // Calculate prices - base price from the "Sales" divided by "Quantity Sold" if available
      let basePrice = 0;
      if (record.Sales && record['Quantity Sold']) {
        // Remove commas and convert to numbers
        const sales = parseFloat(record.Sales.replace(/[$,]/g, ''));
        const quantity = parseFloat(record['Quantity Sold'].replace(/[,]/g, ''));
        
        if (!isNaN(sales) && !isNaN(quantity) && quantity > 0) {
          basePrice = sales / quantity;
        }
      }
      
      // If basePrice is still 0, use Cost + markup
      if (basePrice === 0 && record.Cost) {
        const cost = parseFloat(record.Cost.replace(/[$,]/g, ''));
        if (!isNaN(cost)) {
          basePrice = cost * 1.3; // 30% markup
        }
      }
      
      // If still no price, set a default
      if (basePrice === 0) {
        basePrice = 9.99;
      }
      
      // Round to 2 decimal places
      basePrice = Math.round(basePrice * 100) / 100;
      
      // Generate tiered pricing
      const price1 = basePrice;
      const price2 = Math.round((basePrice * 0.95) * 100) / 100; // 5% discount
      const price3 = Math.round((basePrice * 0.90) * 100) / 100; // 10% discount
      const price4 = Math.round((basePrice * 0.85) * 100) / 100; // 15% discount
      const price5 = Math.round((basePrice * 0.80) * 100) / 100; // 20% discount
      
      // Find an appropriate image
      const imageUrl = findImageForProduct(name, category, department);
      
      // Create the product
      const newProduct = {
        name,
        description: `${name} from the ${department} department, ${category} category.`,
        basePrice,
        price1,
        price2,
        price3,
        price4,
        price5,
        sku: record['Item Lookup Code'],
        stock: Math.floor(Math.random() * 100) + 20, // Random stock between 20-120
        categoryId,
        imageUrl
      };
      
      await db.insert(products).values(newProduct);
      productsAdded++;
      console.log(`Added product: ${name} (SKU: ${record['Item Lookup Code']})`);
    }
    
    console.log(`Import complete! Added ${productsAdded} new products.`);
    console.log('Database operations completed');
    
  } catch (error) {
    console.error('Error importing data:', error);
  }
}

main();