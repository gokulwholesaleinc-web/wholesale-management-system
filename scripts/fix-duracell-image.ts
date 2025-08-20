/**
 * This script fixes the Duracell AA 4PK image specifically
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('Fixing Duracell AA 4PK image...');
  
  try {
    await db.update(products)
      .set({ 
        imageUrl: 'https://i5.walmartimages.com/asr/eaa4e92f-7aaa-4296-aa2b-c2e19e95a32e.c8d0921e033b5f4d72f6b1c03fc8a4ce.jpeg',
        updatedAt: new Date()
      })
      .where(eq(products.id, 52));
    
    console.log('✅ Duracell image updated successfully!');
  } catch (error) {
    console.error('Failed to update Duracell image:', error);
  }
}

main()
  .catch(e => {
    console.error('Error updating Duracell image:', e);
    process.exit(1);
  });