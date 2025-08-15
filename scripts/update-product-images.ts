/**
 * This script updates product images to high-quality non-Amazon sources
 */
import { db } from "../server/db";
import { products } from "../shared/schema";
import { eq } from "drizzle-orm";

interface ProductImageUpdate {
  id: number;
  name: string;
  newImageUrl: string;
}

async function main() {
  console.log("Starting product image update process...");
  
  // Define product image updates with proper image sources
  const imageUpdates: ProductImageUpdate[] = [
    // Beverages
    { 
      id: 27, 
      name: "COKE 20 OZ 24CT",
      newImageUrl: "https://cdn.shopify.com/s/files/1/0576/9375/0358/products/1216_1600x.jpg" 
    },
    { 
      id: 23, 
      name: "RED BULL SUGAR FREE 12 OZ",
      newImageUrl: "https://cdn11.bigcommerce.com/s-n3o76n/images/stencil/1280x1280/products/2444/2909/Red_Bull_Sugar_Free_12_oz_can__13167.1494470024.jpg" 
    },
    {
      id: 28,
      name: "COKE ZERO 20 OZ 24CT",
      newImageUrl: "https://foodsco.net/product/images/large/00049000097665_CF_default_large.jpg"
    },
    {
      id: 29,
      name: "DIET COKE 20 OZ 24CT",
      newImageUrl: "https://cdn.shopify.com/s/files/1/0586/3287/9655/products/diet-coke-24-20-oz-3.jpg"
    },
    {
      id: 31,
      name: "SPRITE 20 OZ 24CT",
      newImageUrl: "https://cdn.shopify.com/s/files/1/0270/6410/7269/products/sprite-20-fl-oz-plastic-bottle-groceryappli_612_1000x.jpg"
    },
    // Tobacco products
    {
      id: 133,
      name: "AL FAKHER 50G DOUBLE APPLE",
      newImageUrl: "https://cdn.shopify.com/s/files/1/0558/7014/0784/products/alfakher-af-double-apple-600x600.jpg"
    },
    {
      id: 131,
      name: "ZYN 3MG COOL MINT",
      newImageUrl: "https://cdn11.bigcommerce.com/s-e8c8a/images/stencil/2048x2048/products/494/1371/zyn_3mg_mint__38397.1631142773.jpg"
    },
    {
      id: 132,
      name: "ZYN 6MG PEPPERMINT",
      newImageUrl: "https://cdn.shopify.com/s/files/1/0570/1296/7006/products/Zyn_Peppermint_Strong_6MG.png"
    },
    // Snacks
    {
      id: 58,
      name: "TWANG LIME SALT 10CT",
      newImageUrl: "https://cdn.shopify.com/s/files/1/0092/4113/1730/products/Lime_400x400.PNG"
    },
    // Medical products
    {
      id: 24,
      name: "ALKA SELTZER 2PK 18CT",
      newImageUrl: "https://cdn-tp3.mozu.com/24645-m1/cms/files/ab6f60ee-61d9-4b43-ac7a-2aa7d93f0d0d"
    }
  ];
  
  // Update each product with new image URL
  for (const update of imageUpdates) {
    try {
      await db
        .update(products)
        .set({
          imageUrl: update.newImageUrl,
          updatedAt: new Date()
        })
        .where(eq(products.id, update.id));
      
      console.log(`✅ Updated image for product #${update.id}: ${update.name}`);
    } catch (error) {
      console.error(`❌ Failed to update image for product #${update.id}:`, error);
    }
  }
  
  console.log("Product image update process completed!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error in update-product-images script:", error);
    process.exit(1);
  });