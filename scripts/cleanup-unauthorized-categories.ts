import { db } from '../server/db';
import { products, categories } from '../shared/schema';
import { eq, inArray, and, not } from 'drizzle-orm';

/**
 * This script moves products from unauthorized categories to authorized categories
 * and then removes the unauthorized categories
 */
async function main() {
  try {
    console.log("Starting cleanup of unauthorized categories...");
    
    // Get all valid category IDs (the original ones from itemlist2)
    const validCategoryIds = [19, 20, 21, 22, 23, 31, 34, 38, 53];
    console.log("Valid category IDs:", validCategoryIds);
    
    // Find products in unauthorized categories
    const productsToUpdate = await db.select()
      .from(products)
      .where(
        and(
          not(inArray(products.categoryId, validCategoryIds)),
          not(eq(products.categoryId, 0))
        )
      );
      
    console.log(`Found ${productsToUpdate.length} products in unauthorized categories`);
    
    // Define mapping of unauthorized categories to valid ones
    const categoryMappings: Record<number, number> = {
      60: 19, // SODA -> FOOD & BEVERAGE
      61: 19, // FOOD -> FOOD & BEVERAGE
      62: 34, // PIPES -> CONES, PAPERS & HEMP
      63: 38, // BUTANE -> MISC
      64: 38, // Empty -> MISC
      65: 19, // JUICE/MIXERS -> FOOD & BEVERAGE
      66: 22, // BRELLA -> LIQUOR SUPPLIES
      67: 34, // CONES -> CONES, PAPERS & HEMP
      68: 34, // WRAPS/PREROLL -> CONES, PAPERS & HEMP
      69: 20, // PILLS -> MEDS/DAILY CARE
      70: 53, // General -> Uncategorized
    };
    
    // Update products to use valid categories
    for (const product of productsToUpdate) {
      const currentCategoryId = product.categoryId;
      
      // If we have a mapping, use it; otherwise use Uncategorized (53)
      const newCategoryId = categoryMappings[currentCategoryId] || 53;
      
      console.log(`Moving product ${product.id} (${product.name}) from category ${currentCategoryId} to category ${newCategoryId}`);
      
      await db.update(products)
        .set({ categoryId: newCategoryId })
        .where(eq(products.id, product.id));
    }
    
    // Now that all products have been moved, we can delete the unauthorized categories
    const categoriesToDelete = Object.keys(categoryMappings).map(id => parseInt(id));
    console.log("Deleting unauthorized categories:", categoriesToDelete);
    
    await db.delete(categories)
      .where(inArray(categories.id, categoriesToDelete));
      
    console.log("Cleanup completed successfully!");
  } catch (error) {
    console.error("Error during category cleanup:", error);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });