import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq, ilike } from 'drizzle-orm';

/**
 * This script updates all Coca-Cola product families from 16oz to 20oz
 */
async function main() {
  try {
    console.log('Finding Coca-Cola family products with incorrect size...');
    
    // Get all products first
    const allProducts = await db.select().from(products);
    
    // Filter products that need to be updated
    const productsToUpdate = allProducts.filter(product => {
      const productName = product.name || '';
      return (
        productName.includes('COKE 16 OZ') ||
        productName.includes('COCA COLA 16 OZ') ||
        productName.includes('SPRITE 16 OZ') ||
        productName.includes('MINUTE MAID 16 OZ') ||
        productName.includes('FANTA 16 OZ') ||
        productName.includes('DR PEPPER 16 OZ')
      );
    });
    
    console.log(`Found ${productsToUpdate.length} products to update.`);
    
    // Update each product one by one
    let updatedCount = 0;
    for (const product of productsToUpdate) {
      const oldName = product.name || '';
      const newName = oldName.replace('16 OZ', '20 OZ');
      
      const oldDescription = product.description || oldName;
      const newDescription = oldDescription.replace('16 OZ', '20 OZ');
      
      console.log(`Updating: ${oldName} -> ${newName}`);
      
      await db.update(products)
        .set({
          name: newName,
          description: newDescription
        })
        .where(eq(products.id, product.id));
        
      updatedCount++;
    }
    
    console.log(`Updated ${updatedCount} products successfully.`);
    
  } catch (error) {
    console.error('Error updating products:', error);
    process.exit(1);
  }
}

main();