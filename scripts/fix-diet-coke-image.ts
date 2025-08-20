/**
 * This script specifically fixes the Diet Coke product image
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('Fixing Diet Coke 20oz image...');
  
  // Diet Coke image update
  await db.update(products)
    .set({ 
      imageUrl: 'https://i5.walmartimages.com/asr/ff50fdfa-e5fe-4cf5-a0a1-0e33f42e16d0.be59c7bd6f733e767e7248d444721b26.jpeg',
      updatedAt: new Date()
    })
    .where(eq(products.id, 29));
  
  console.log('✅ Diet Coke image updated successfully!');
}

main()
  .catch(e => {
    console.error('Error updating Diet Coke image:', e);
    process.exit(1);
  });