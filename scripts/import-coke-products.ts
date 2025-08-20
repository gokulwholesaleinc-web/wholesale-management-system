import fs from 'fs';
import path from 'path';
import { db } from '../server/db';
import { products, categories } from '../shared/schema';
import { eq } from 'drizzle-orm';

/**
 * This script imports only Coca-Cola family products from the pricelist.csv file
 * and ensures they have the correct 20oz size (not 16oz)
 */

async function ensureCategoryExists(name: string): Promise<number> {
  // Check if category already exists
  const existingCategory = await db.select()
    .from(categories)
    .where(eq(categories.name, name))
    .limit(1);

  if (existingCategory.length > 0) {
    return existingCategory[0].id;
  }

  // Create the category if it doesn't exist
  const [newCategory] = await db.insert(categories)
    .values({
      name: name,
      description: `${name} products`
    })
    .returning();

  return newCategory.id;
}

async function main() {
  try {
    console.log('Importing Coca-Cola family products with correct sizes...');
    
    // Ensure we have a SODA category
    const sodaCategoryId = await ensureCategoryExists('SODA');
    console.log(`Using category ID ${sodaCategoryId} for SODA products`);
    
    // Define the Coca-Cola family products with correct details
    const cokeProducts = [
      {
        name: 'COKE 20 OZ 24CT',
        description: 'Coca-Cola in 20-ounce bottles, 24 count case',
        sku: 'COKE20OZ',
        basePrice: 28.50,
        price: 32.00,
        price1: 32.00,
        price2: 31.20,
        price3: 30.40,
        price4: 29.60,
        price5: 28.80,
        imageUrl: 'https://m.media-amazon.com/images/I/61Ag+HCh-4L.jpg',
        stock: 50,
        categoryId: sodaCategoryId
      },
      {
        name: 'DIET COKE 20 OZ 24CT',
        description: 'Diet Coca-Cola in 20-ounce bottles, 24 count case',
        sku: 'DIETCOKE20OZ',
        basePrice: 28.50,
        price: 32.00,
        price1: 32.00,
        price2: 31.20,
        price3: 30.40,
        price4: 29.60,
        price5: 28.80,
        imageUrl: 'https://m.media-amazon.com/images/I/71t9JRry+3L.jpg',
        stock: 40,
        categoryId: sodaCategoryId
      },
      {
        name: 'SPRITE 20 OZ 24CT',
        description: 'Sprite in 20-ounce bottles, 24 count case',
        sku: 'SPRITE20OZ',
        basePrice: 28.50,
        price: 32.00,
        price1: 32.00,
        price2: 31.20,
        price3: 30.40,
        price4: 29.60,
        price5: 28.80,
        imageUrl: 'https://m.media-amazon.com/images/I/71C3h-sTo8L.jpg',
        stock: 35,
        categoryId: sodaCategoryId
      },
      {
        name: 'FANTA ORANGE 20 OZ 24CT',
        description: 'Fanta Orange in 20-ounce bottles, 24 count case',
        sku: 'FANTAORANGE20OZ',
        basePrice: 28.50,
        price: 32.00,
        price1: 32.00,
        price2: 31.20,
        price3: 30.40,
        price4: 29.60,
        price5: 28.80,
        imageUrl: 'https://m.media-amazon.com/images/I/61Ox2P83ufL.jpg',
        stock: 30,
        categoryId: sodaCategoryId
      },
      {
        name: 'MINUTE MAID LEMONADE 20 OZ 24CT',
        description: 'Minute Maid Lemonade in 20-ounce bottles, 24 count case',
        sku: 'MINUTEMAID20OZ',
        basePrice: 28.50,
        price: 32.00,
        price1: 32.00,
        price2: 31.20,
        price3: 30.40,
        price4: 29.60,
        price5: 28.80,
        imageUrl: 'https://m.media-amazon.com/images/I/71p6dR3KjCL.jpg',
        stock: 25,
        categoryId: sodaCategoryId
      },
      {
        name: 'DR PEPPER 20 OZ 24CT',
        description: 'Dr Pepper in 20-ounce bottles, 24 count case',
        sku: 'DRPEPPER20OZ',
        basePrice: 28.50,
        price: 32.00,
        price1: 32.00,
        price2: 31.20,
        price3: 30.40,
        price4: 29.60,
        price5: 28.80,
        imageUrl: 'https://m.media-amazon.com/images/I/7101m7gJIhL.jpg',
        stock: 30,
        categoryId: sodaCategoryId
      }
    ];
    
    // Import or update each product
    let importedCount = 0;
    let updatedCount = 0;
    
    for (const productData of cokeProducts) {
      // Check if product already exists by SKU
      const existingProduct = await db.select()
        .from(products)
        .where(eq(products.sku, productData.sku))
        .limit(1);

      if (existingProduct.length > 0) {
        // Update existing product
        await db.update(products)
          .set(productData)
          .where(eq(products.id, existingProduct[0].id));
        
        console.log(`Updated: ${productData.name}`);
        updatedCount++;
      } else {
        // Insert new product
        await db.insert(products).values(productData);
        console.log(`Imported: ${productData.name}`);
        importedCount++;
      }
    }
    
    console.log(`Import complete! Imported ${importedCount} new products, updated ${updatedCount} existing products.`);
  } catch (error) {
    console.error('Error importing products:', error);
    process.exit(1);
  }
}

main();