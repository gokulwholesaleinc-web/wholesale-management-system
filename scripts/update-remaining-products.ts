/**
 * This script updates the remaining products with high-quality non-Amazon images
 */

import { db } from '../server/db';
import { products } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Product ID to image URL mapping for remaining products
const productImageMap: Record<number, string> = {
  // 5-Hour Energy
  26: 'https://i5.walmartimages.com/asr/af5a5cd2-ecc9-4ae6-8d8d-0d67e0185c30.7414e4a35a918a77d8956dac49b7becc.jpeg', // PERRIER 330ML 24CT
  32: 'https://i5.walmartimages.com/asr/04f7c46e-72e9-4c98-8a5f-6ff48f9d867c.9e12ae217b65c6a20a980f42542ce6fc.jpeg', // WHITE OWL SILVER 2/1.29 60CT
  40: 'https://i5.walmartimages.com/asr/16b67f79-ba40-435f-807d-b11ef3acb4a8.63d6eb51169760e60a8a91355a44b096.jpeg', // 5-HOUR ENERGY GRAPE 12CT
  41: 'https://i5.walmartimages.com/asr/68de5985-98a0-4cb3-b096-b16e0b631635.e01d41b7d4f6706a0db68431c18d146a.jpeg', // 5-HOUR ENERGY EXTRA STRENGTH BERRY 12CT
  42: 'https://i5.walmartimages.com/asr/5c00e012-e75a-40e5-939a-953b3f7b8ce1.c0a88c3ffa7cc87c41d7c73381a48c14.jpeg', // 5-HOUR ENERGY REGULAR STRENGTH 12CT
  43: 'https://i5.walmartimages.com/seo/5-hour-ENERGY-Shots-Berry-Extra-Strength-1-93-fl-oz-Bottle-12-pack_c8915c1c-5acb-43d5-92cb-9c8ef3ee9e26.e9eda4fe2e4b9e9a4842a021a4c2f2f0.jpeg', // 5-HOUR ENERGY REGUL POMEGRANATE 12CT
  
  // Popular snacks
  51: 'https://i5.walmartimages.com/asr/21e5ae58-a44e-42c1-966c-d1a238f67221.fd4df3b6b4f1e7f4f272f98e92f6bf60.jpeg', // TOSTITOS ORIGINAL 13OZ
  53: 'https://i5.walmartimages.com/asr/31cb8541-7652-4507-81fb-5a9c89c23ae8.73a0ed59487b8bccb5d8daa09fc5a6f6.jpeg', // LAYS SOUR CREAM & ONION 2.625OZ
  54: 'https://i5.walmartimages.com/asr/2eb5ffb5-0e1e-4cbb-a2a5-dab5e69e1e0a.1b22b5b2ac7f7fdba89a4c3b0e8a8e28.jpeg', // REESE'S PEANUT BUTTER CUPS 1.5OZ
  
  // Tobacco products
  61: 'https://cdn11.bigcommerce.com/s-2x1bzmrdyk/images/stencil/original/products/1031/3183/1285248338_Juicy-Jay-s-1-1-4-Size-Flavored-Rolling-Papers-24ct-Display-strawberry_kiwi-360x215__46698.1574196979.jpg', // JUICY JAY 1 1/4 STRAWBERRY
  62: 'https://cdn11.bigcommerce.com/s-2x1bzmrdyk/images/stencil/original/products/1025/3158/1285247903_Juicy-Jay-s-1-1-4-Size-Flavored-Rolling-Papers-24ct-Display-blackberry_brandy-360x215__84839.1574196971.jpg', // JUICY JAY 1 1/4 BALCKBERRY

  // Additional snacks
  80: 'https://i5.walmartimages.com/asr/d87fef5e-7d83-40c2-96c4-d39c044f7b9a.00697af34bdf9666afbadad300d56667.jpeg', // TWIX CARAMEL 1.79OZ
  82: 'https://i5.walmartimages.com/asr/eaa4e92f-7aaa-4296-aa2b-c2e19e95a32e.c8d0921e033b5f4d72f6b1c03fc8a4ce.jpeg', // KIT KAT 1.5OZ
};

async function main() {
  console.log('Starting remaining product image update process...');
  
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
  
  console.log('Remaining product image update process completed!');
}

main()
  .catch(e => {
    console.error('Error updating product images:', e);
    process.exit(1);
  });