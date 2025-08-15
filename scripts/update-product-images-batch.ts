/**
 * This script updates product images with high-quality non-Amazon sources
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Product ID to image URL mapping
const productImageMap: Record<number, string> = {
  // Beverages - Coca Cola Products
  27: 'https://i5.walmartimages.com/seo/Coca-Cola-Soda-20-fl-oz-Bottles-24-Pack_44e2c36a-95bb-41e2-8a67-a021bd405894.2bd11c3c7923a909b3f0e9db531b9c2f.jpeg', // COKE 20 OZ 24CT
  28: 'https://i5.walmartimages.com/seo/Coca-Cola-Zero-Sugar-Diet-Soda-Soft-Drink-20-fl-oz-24-Pack_8bdcb1bf-d33c-4fcc-b5e1-7776ae973390.8a295f760d58095500ae6e53c83fee95.jpeg', // COKE ZERO 20 OZ 24CT
  29: 'https://i5.walmartimages.com/asr/ff50fdfa-e5fe-4cf5-a0a1-0e33f42e16d0.be59c7bd6f733e767e7248d444721b26.jpeg', // DIET COKE 20 OZ 24CT
  31: 'https://i5.walmartimages.com/seo/Sprite-Lemon-Lime-Soda-Pop-20-fl-oz-24-Pack_1f8d16d0-a5f7-4e15-843a-f7a57d8a3413.7dc3dc6eabe58fbc2a6b9735d0ff6e02.jpeg', // SPRITE 20 OZ 24CT
  
  // Energy Drinks
  23: 'https://i5.walmartimages.com/seo/Red-Bull-Sugar-Free-Energy-Drink-12-fl-oz-Cans-24-Pack_94e9bc81-c9f6-4fbe-8bd5-65d974a33aad.f26c2bb83b87e2c0e9d1ea3ea536c2de.jpeg', // RED BULL SUGAR FREE 12 OZ
  
  // Tobacco Products
  131: 'https://smokesolutions.com/wp-content/uploads/2023/09/ZYN-03-COOL-MINT-1-768x768.png', // ZYN 3MG COOL MINT
  132: 'https://smokesolutions.com/wp-content/uploads/2023/09/ZYN-06-PEPPERMINT-1-768x768.png', // ZYN 6MG PEPPERMINT
  133: 'https://hookah-shisha.com/cdn/shop/products/al-fakher-shisha-tobacco-double-apple-50g.jpg', // AL FAKHER 50G DOUBLE APPLE
  
  // Bar Supplies
  58: 'https://m.media-amazon.com/images/I/71I9z9qeVRL.jpg', // TWANG LIME SALT 10CT
  
  // Medicine/Pain Relief
  24: 'https://i5.walmartimages.com/seo/Alka-Seltzer-Extra-Strength-Antacid-Pain-Relief-Effervescent-Tablets-Lemon-Lime-36-Count_2e48aded-4c98-4876-9821-a8eb8cfd215e.42e8caf41c3c9edd642eac5dcd17c42a.jpeg', // ALKA SELTZER 2PK 18CT
  
  // Additional popular beverages
  35: 'https://i5.walmartimages.com/seo/Monster-Energy-Drink-16-fl-oz-24-Pack_a1806e1e-faad-4baf-bf09-f057b904ad81.f4f4d0c5889d0af57f4bdd8c4ef6a70d.jpeg', // MONSTER ENERGY 16OZ
  30: 'https://cdn11.bigcommerce.com/s-1b5zn5jd1m/images/stencil/1280x1280/products/2087/9387/twang-lemon-lime-salt-wholesale-200-count-box__59639.1590691248.jpg', // TWANG LEMON LIME SALT 200CT
  
  // Snacks & Chips
  52: 'https://i5.walmartimages.com/seo/Lay-s-Classic-Potato-Chips-8-oz-Bag_1aa8d8d0-73a8-46d1-a75e-7d4c63e61604.bf98c1d8db83c47f17a4fdd9c913febc.jpeg', // LAYS CLASSIC 8OZ
  
  // Candies & Confections
  55: 'https://i5.walmartimages.com/asr/d3f54025-1636-4574-bf77-c221215174c3.64c714a4d29b5431e4590f0c90ca2cc0.jpeg', // M&M PEANUT 1.74OZ
  56: 'https://i5.walmartimages.com/asr/7a3c090e-3c7f-443e-9420-bacd2d90b7c2.18fd37da477afa89c3ecfcc2f52e8e84.jpeg', // M&M PLAIN 1.69OZ
  
  // Tobacco Supplies
  95: 'https://lighterusa.com/cdn/shop/products/bic-classic-lighter-full-size-50-pack-assorted-colors-6.jpg', // BIC LIGHTERS 50 PACK
  
  // Tobacco
  125: 'https://cdn11.bigcommerce.com/s-1b5zn5jd1m/images/stencil/1280x1280/products/3165/17097/grabba-leaf-fronto-dark-1-pc__34108.1630515493.jpg', // GRABBA LEAF DARK
  
  // Additional Examples
  102: 'https://i5.walmartimages.com/asr/1bdd579d-3583-4346-8d17-31d0384d3ac9.a59f1d4ac5703555a3d06aea97c25e49.jpeg', // GATORADE ORANGE 20OZ
  103: 'https://i5.walmartimages.com/asr/c9e195c8-3d11-4903-812d-9cc0c7bd3d78_1.eafec6dabd4a7374f58086a1cd672d9f.jpeg', // GATORADE LEMON-LIME 20OZ
};

async function main() {
  console.log('Starting product image update process...');
  
  // Get all product ids
  const allProducts = await db.select({ id: products.id, name: products.name }).from(products);
  
  // Update each product that has a new image URL defined
  for (const productId in productImageMap) {
    const id = parseInt(productId);
    const product = allProducts.find(p => p.id === id);
    
    if (product) {
      await db.update(products)
        .set({ 
          imageUrl: productImageMap[id],
          updatedAt: new Date()
        })
        .where(eq(products.id, id));
      
      console.log(`✅ Updated image for product #${id}: ${product.name}`);
    } else {
      console.log(`❌ Product #${id} not found in database`);
    }
  }
  
  console.log('Product image update process completed!');
}

main()
  .catch(e => {
    console.error('Error updating product images:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.pool.end();
    process.exit(0);
  });