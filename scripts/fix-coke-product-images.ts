/**
 * This script fixes the Coca-Cola product family images
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Product ID to image URL mapping
const cokeProductImages: Record<number, string> = {
  // Coke family products
  27: 'https://i5.walmartimages.com/seo/Coca-Cola-Soda-20-fl-oz-Bottles-24-Pack_44e2c36a-95bb-41e2-8a67-a021bd405894.2bd11c3c7923a909b3f0e9db531b9c2f.jpeg', // COKE 20 OZ 24CT
  28: 'https://i5.walmartimages.com/seo/Coca-Cola-Zero-Sugar-Diet-Soda-Soft-Drink-20-fl-oz-24-Pack_8bdcb1bf-d33c-4fcc-b5e1-7776ae973390.8a295f760d58095500ae6e53c83fee95.jpeg', // COKE ZERO 20 OZ 24CT
  29: 'https://i5.walmartimages.com/asr/ff50fdfa-e5fe-4cf5-a0a1-0e33f42e16d0.be59c7bd6f733e767e7248d444721b26.jpeg', // DIET COKE 20 OZ 24CT
  31: 'https://i5.walmartimages.com/seo/Sprite-Lemon-Lime-Soda-Pop-20-fl-oz-24-Pack_1f8d16d0-a5f7-4e15-843a-f7a57d8a3413.7dc3dc6eabe58fbc2a6b9735d0ff6e02.jpeg', // SPRITE 20 OZ 24CT
};

async function main() {
  console.log('Fixing Coca-Cola product family images...');
  
  for (const [productId, imageUrl] of Object.entries(cokeProductImages)) {
    const id = parseInt(productId);
    
    try {
      await db.update(products)
        .set({ 
          imageUrl,
          updatedAt: new Date()
        })
        .where(eq(products.id, id));
      
      console.log(`✅ Updated image for product #${id}`);
    } catch (error) {
      console.error(`Error updating product #${id}:`, error);
    }
  }
  
  console.log('Coca-Cola product family images updated successfully!');
}

main()
  .catch(e => {
    console.error('Error updating product images:', e);
    process.exit(1);
  });