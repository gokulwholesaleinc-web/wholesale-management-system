import { db } from '../server/db';
import { products, categories } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Selected products to add
const selectedProducts = [
  {
    name: "CLAMATO MICHELADA 12-320Z",
    description: "Clamato Michelada mix in 320oz bottles, case of 12",
    department: "FOOD & BEVERAGE",
    category: "JUICE/MIXERS",
    basePrice: 33.99,
    imageUrl: "https://m.media-amazon.com/images/I/81K+es+j4bL._SL1500_.jpg",
    sku: "00014800003628"
  },
  {
    name: "DURACELL AA 4PK BATTERY",
    description: "Duracell AA batteries, pack of 4",
    department: "ELECTRONICS & ACCESSORIES",
    category: "BATTERIES",
    basePrice: 38.50,
    imageUrl: "https://m.media-amazon.com/images/I/71o8z4kbG+L._AC_SL1500_.jpg",
    sku: "00041333009612"
  },
  {
    name: "KRAZY GLUE 12PK",
    description: "Krazy Glue single-use tubes, pack of 12",
    department: "SMOKE SUPPLIES",
    category: "MISC",
    basePrice: 8.50,
    imageUrl: "https://m.media-amazon.com/images/I/71EvJZywWiL._AC_SL1500_.jpg",
    sku: "00070158112054"
  },
  {
    name: "PICKLE IN POUCH LRG HOT",
    description: "Large hot pickles in pouches",
    department: "FOOD & BEVERAGE",
    category: "FOOD",
    basePrice: 7.50,
    imageUrl: "https://m.media-amazon.com/images/I/71AOMz+UOdL._SX569_.jpg",
    sku: "038200041226"
  },
  {
    name: "DOLE PINEAPPLE 8OZ CAN 24PK",
    description: "Dole pineapple chunks in 8oz cans, case of 24",
    department: "FOOD & BEVERAGE",
    category: "FOOD",
    basePrice: 14.98,
    imageUrl: "https://m.media-amazon.com/images/I/71t5fM-gb0L._SL1500_.jpg",
    sku: "038900773700"
  },
  {
    name: "TWANG LIME SALT 10CT",
    description: "Twang lime salt packets, package of 10",
    department: "LIQUOR SUPPLIES",
    category: "SALT",
    basePrice: 9.30,
    imageUrl: "https://m.media-amazon.com/images/I/81eUzAfObdL._AC_SL1500_.jpg",
    sku: "023604215632"
  },
  {
    name: "TROJAN MAGNUM 6PK",
    description: "Trojan Magnum condoms, pack of 6",
    department: "MEDS/DAILY CARE",
    category: "MISC",
    basePrice: 8.00,
    imageUrl: "https://m.media-amazon.com/images/I/71H0tz0THJL._AC_SL1500_.jpg",
    sku: "022600642039"
  },
  {
    name: "WHITE OWL BLUE RASP 2/1.19 60CT",
    description: "White Owl Blue Raspberry cigars, 2 for $1.19, case of 60",
    department: "TOBACCO",
    category: "60CT CIGAR",
    basePrice: 29.38,
    imageUrl: "https://m.media-amazon.com/images/I/61OpQpiSgFL._AC_SL1001_.jpg",
    sku: "031700237762"
  }
];

async function main() {
  console.log('Adding select products from price sheet...');
  
  try {
    // Get existing categories
    const existingCategories = await db.select().from(categories);
    
    let newProducts = 0;
    let skippedProducts = 0;
    
    // Process each selected product
    for (const product of selectedProducts) {
      try {
        // Check if product already exists by SKU
        const existingProduct = await db.select().from(products).where(eq(products.sku, product.sku)).limit(1);
        
        if (existingProduct.length > 0) {
          console.log(`Product already exists: ${product.name}`);
          skippedProducts++;
          continue;
        }
        
        // First, ensure the category exists
        let categoryId: number | null = null;
        
        // Try to find an existing category that matches
        const matchingCategory = existingCategories.find(c => 
          c.name.toUpperCase() === product.department.toUpperCase() || 
          (product.category && c.name.toUpperCase() === product.category.toUpperCase())
        );
        
        if (matchingCategory) {
          categoryId = matchingCategory.id;
        } else if (product.department) {
          // If no match found, create a new category based on the department
          const [newCategory] = await db.insert(categories).values({
            name: product.department.toUpperCase(),
            description: `${product.department} products`,
          }).returning();
          
          categoryId = newCategory.id;
          existingCategories.push(newCategory); // Add to local cache
          console.log(`Created new category: ${product.department}`);
        }
        
        // Calculate markup-based prices (25% markup as default)
        const markup = 1.25;
        const price1 = Math.round(product.basePrice * markup * 100) / 100;
        const price2 = Math.round(price1 * 0.975 * 100) / 100; // 2.5% discount
        const price3 = Math.round(price1 * 0.95 * 100) / 100;  // 5% discount
        const price4 = Math.round(price1 * 0.925 * 100) / 100; // 7.5% discount
        const price5 = Math.round(price1 * 0.90 * 100) / 100;  // 10% discount
        
        // Add the product to the database
        await db.insert(products).values({
          name: product.name,
          description: product.description,
          sku: product.sku,
          basePrice: product.basePrice,
          price: price1,
          price1: price1,
          price2: price2,
          price3: price3,
          price4: price4,
          price5: price5,
          imageUrl: product.imageUrl,
          stock: Math.floor(Math.random() * 50) + 20, // Random stock between 20 and 70
          categoryId: categoryId,
          featured: Math.random() > 0.7, // 30% chance of being featured
        });
        
        newProducts++;
        console.log(`Added product: ${product.name}`);
      } catch (error) {
        console.error(`Error processing product ${product.name}:`, error);
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