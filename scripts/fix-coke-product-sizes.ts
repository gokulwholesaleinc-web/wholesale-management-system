import { db } from '../server/db';
import { products } from '../shared/schema';
import { sql } from 'drizzle-orm';

/**
 * This script fixes the sizes for Coca-Cola family products from 16oz to 20oz
 */

async function main() {
  try {
    console.log('Looking for Coca-Cola family products with incorrect sizes...');
    
    // Find all products that might need size correction
    const productsToFix = await db.select()
      .from(products)
      .where(
        or(
          like(products.name, '%COKE 16 OZ%'),
          like(products.name, '%COCA COLA 16 OZ%'),
          like(products.name, '%SPRITE 16 OZ%'),
          like(products.name, '%MINUTE MAID 16 OZ%'),
          like(products.name, '%FANTA 16 OZ%'),
          like(products.name, '%DR PEPPER 16 OZ%')
        )
      );
      
    console.log(`Found ${productsToFix.length} products that need size correction.`);
    
    // Update each product with the correct size
    for (const product of productsToFix) {
      const oldName = product.name;
      const newName = oldName.replace('16 OZ', '20 OZ');
      
      const oldDescription = product.description || oldName;
      const newDescription = oldDescription.replace('16 OZ', '20 OZ');
      
      console.log(`Updating: ${oldName} -> ${newName}`);
      
      await db.update(products)
        .set({ 
          name: newName,
          description: newDescription
        })
        .where(products.id == product.id);
    }
    
    console.log('Size correction completed successfully!');
    
  } catch (error) {
    console.error('Error fixing product sizes:', error);
    process.exit(1);
  }
}

main();