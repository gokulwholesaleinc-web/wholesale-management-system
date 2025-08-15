/**
 * This script updates more product images with high-quality non-Amazon sources
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Product ID to image URL mapping for additional products
const productImageMap: Record<number, string> = {
  // Drinks & Beverages
  26: 'https://i5.walmartimages.com/seo/Perrier-Carbonated-Mineral-Water-11-15-Fl-Oz-Bottles-24-Count_e6d6cdcd-822a-4055-9b53-e7acbea9d9a2.1e5f58b9dbd5d6fdea23611eaa9a7853.jpeg', // PERRIER 330ML 24CT
  33: 'https://i5.walmartimages.com/seo/Arizona-Iced-Tea-with-Lemon-Flavor-128-fl-oz-Bottle_c7cea7b8-a85e-4b53-8b33-d493a0c80373.a80c2ae66aa2b38e73aad33d34bbb1fa.jpeg', // ARIZONA ICED TEA 1 GAL
  34: 'https://i5.walmartimages.com/seo/Simply-Orange-Juice-52-fl-oz-Simply-Orange-Juice-Pulp-Free-52-fl-oz_fd72522e-6dd9-4a3a-8f4a-d41dcbef8def.1c41c51b94afe9562e7a9d6e9f309da1.jpeg', // SIMPLY ORANGE 52 OZ
  
  // Snacks
  37: 'https://i5.walmartimages.com/seo/Doritos-Nacho-Cheese-Flavored-Tortilla-Chips-9-25-oz-Bag_26c7e1c3-e336-4463-b8c5-7172b9077a4c.e0ffbada4797dbf6c75a3c097f3439c4.jpeg', // DORITOS NACHO 9.25 OZ
  38: 'https://i5.walmartimages.com/asr/75a0d2ad-c4c1-4ae5-8cc4-a44111435633_1.29f90cd0e94795cce4e0e3e5a10e331b.jpeg', // CHEETOS REG 8.5OZ
  39: 'https://i5.walmartimages.com/asr/a73b6d9a-9f53-4e08-a6b1-87026a0d4f0c.24b8c31672f8514211e8b8cf8be746cd.jpeg', // RUFFLES SOUR CREAM & ONION 8.5OZ
  
  // Tobacco Products
  59: 'https://mobileimages.lowes.com/productimages/10b7a06b-3d7d-42c1-a94e-7fe30e89dc4c/13912546.jpg', // ZIGZAG SLOW BURN 32/1.25
  60: 'https://i5.walmartimages.com/asr/7d32a2b8-5191-4e67-9a7d-d14ef6a73659.ee3a0178a3be4a5eb8bf06eadf924483.jpeg', // RIZLA KING SIZE SILVER
  
  // Household Items
  73: 'https://i5.walmartimages.com/seo/Dawn-Ultra-Dishwashing-Liquid-Dish-Soap-Original-Scent-19-4-fl-oz_aebcd7ec-d61e-4524-8efa-063ce4195359.6aad3ee53fd98f3aff5f9dba3f9f5a4e.jpeg', // DAWN DISHWASHING LIQUID 28OZ
  
  // Candies
  45: 'https://i5.walmartimages.com/asr/15c81ee8-3687-43d4-9fdb-ae54a0ac8aa7.ef7b3ac8efdf224b25d36b2e7c816af9.jpeg', // SKITTLES ORIGINAL 2.17OZ
  46: 'https://i5.walmartimages.com/asr/0bb41afc-1e84-4fc4-b9df-7c4f1f2eb8dc.c10b43adc31a3d055b38ed94fd7c2ece.jpeg', // STARBURST ORIGINAL 2.07OZ
  
  // Miscellaneous
  136: 'https://i5.walmartimages.com/seo/Kountry-Boy-Grabba-Leaf-Fronto-Tobacco-Leaf-1-Pack-Natural-Flavor-Color-May-Vary_9ce04f54-2273-4b67-8883-0fbf9bfc5c8e.bb6d39fffc95e8eb99f30f5ffb8dfd17.png', // GRABBA LEAF DARK
  137: 'https://i5.walmartimages.com/asr/76aec03d-4b73-482b-b4cf-68cdf86b1c46_1.d5c759afecc1fa9fc1fda9c3f81548df.jpeg', // FRONTO LEAF NATURAL
  138: 'https://i5.walmartimages.com/asr/2d4bf09e-e171-4ce5-ba12-98bb12f4c2fd_1.3a4d8b33c5d422acf23fc847096fc83f.jpeg', // DUM DUM POPS 300CT
};

async function main() {
  console.log('Starting additional product image update process...');
  
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
  
  console.log('Additional product image update process completed!');
}

main()
  .catch(e => {
    console.error('Error updating product images:', e);
    process.exit(1);
  });