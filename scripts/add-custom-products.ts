import { db } from '../server/db';
import { products, categories } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function main() {
  try {
    console.log('Starting to add custom products...');
    
    // Get all categories for reference
    const allCategories = await db.select().from(categories);
    const categoryMap = new Map();
    
    // Create a category map for fast lookups
    for (const category of allCategories) {
      categoryMap.set(category.name, category.id);
    }
    
    // List of custom products to add
    const customProducts = [
      {
        name: "RED BULL 12oz 24CT",
        description: "Red Bull energy drink, 12oz cans, 24 count case",
        price: 59.99,
        basePrice: 45.99,
        price1: 59.99,
        price2: 58.99,
        price3: 57.50,
        price4: 56.99,
        price5: 55.99,
        sku: "RB12OZ24CT",
        stock: 48,
        categoryId: categoryMap.get("ENERGY DRINK") || 25,
        imageUrl: "https://m.media-amazon.com/images/I/71Nvg68MgJL.jpg"
      },
      {
        name: "MARLBORO RED BOX",
        description: "Marlboro red box cigarettes",
        price: 89.99,
        basePrice: 78.99,
        price1: 89.99,
        price2: 88.99,
        price3: 87.50,
        price4: 86.99,
        price5: 85.99,
        sku: "MARLRED",
        stock: 120,
        categoryId: categoryMap.get("TOBACCO") || 18,
        imageUrl: "https://m.media-amazon.com/images/I/61UZJVv3bJL.jpg"
      },
      {
        name: "MONSTER ENERGY 16oz 24CT",
        description: "Monster energy drink, 16oz cans, 24 count case",
        price: 52.99,
        basePrice: 40.99,
        price1: 52.99,
        price2: 51.99,
        price3: 50.50,
        price4: 49.99,
        price5: 48.99,
        sku: "MONSTER16OZ24CT",
        stock: 36,
        categoryId: categoryMap.get("ENERGY DRINK") || 25,
        imageUrl: "https://m.media-amazon.com/images/I/71iWWFdw+ML.jpg"
      },
      {
        name: "COCA-COLA 12oz 24CT",
        description: "Coca-Cola soda, 12oz cans, 24 count case",
        price: 16.99,
        basePrice: 12.99,
        price1: 16.99,
        price2: 16.50,
        price3: 15.99,
        price4: 15.50,
        price5: 14.99,
        sku: "COKE12OZ24CT",
        stock: 85,
        categoryId: categoryMap.get("SODA") || 29,
        imageUrl: "https://m.media-amazon.com/images/I/617YcY1EbaL.jpg"
      },
      {
        name: "SPRITE 12oz 24CT",
        description: "Sprite lemon-lime soda, 12oz cans, 24 count case",
        price: 16.99,
        basePrice: 12.99,
        price1: 16.99,
        price2: 16.50,
        price3: 15.99,
        price4: 15.50,
        price5: 14.99,
        sku: "SPRITE12OZ24CT",
        stock: 72,
        categoryId: categoryMap.get("SODA") || 29,
        imageUrl: "https://m.media-amazon.com/images/I/61URXeVui6L.jpg"
      },
      {
        name: "SWISHER SWEETS CIGARILLOS",
        description: "Swisher Sweets flavored cigarillos, 2-pack",
        price: 2.99,
        basePrice: 1.89,
        price1: 2.99,
        price2: 2.89,
        price3: 2.79,
        price4: 2.69,
        price5: 2.59,
        sku: "SWISHERCIGAR",
        stock: 250,
        categoryId: categoryMap.get("TOBACCO") || 18,
        imageUrl: "https://www.famous-smoke.com/cigars/skupics/swisher_sweets/CI-SSW-LEASTN-400.jpg"
      },
      {
        name: "5-HOUR ENERGY BERRY 12CT",
        description: "5-Hour Energy shots, berry flavor, 12 count",
        price: 35.99,
        basePrice: 27.99,
        price1: 35.99,
        price2: 34.99,
        price3: 33.99,
        price4: 32.99,
        price5: 31.99,
        sku: "5HRENERGY12CT",
        stock: 60,
        categoryId: categoryMap.get("ENERGY DRINK") || 25,
        imageUrl: "https://5hourenergy.com/wp-content/uploads/2019/11/extra-strength-berry.jpg"
      },
      {
        name: "TYLENOL EXTRA STRENGTH 100CT",
        description: "Tylenol extra strength pain reliever, 100 count",
        price: 17.99,
        basePrice: 14.50,
        price1: 17.99,
        price2: 17.49,
        price3: 16.99,
        price4: 16.49,
        price5: 15.99,
        sku: "TYLENOL100CT",
        stock: 42,
        categoryId: categoryMap.get("MEDS/DAILY CARE") || 20,
        imageUrl: "https://m.media-amazon.com/images/I/81o9BRLr72L.jpg"
      },
      {
        name: "HEFTY TRASH BAGS 30CT",
        description: "Hefty strong trash bags, 30 count",
        price: 14.50,
        basePrice: 11.99,
        price1: 14.50,
        price2: 13.99,
        price3: 13.49,
        price4: 12.99,
        price5: 12.49,
        sku: "HEFTY30CT",
        stock: 55,
        categoryId: categoryMap.get("PAPER GOODS") || 21,
        imageUrl: "https://m.media-amazon.com/images/I/71kLCgZywzL.jpg"
      },
      {
        name: "PERRIER SPARKLING WATER 24CT",
        description: "Perrier sparkling water, 16.9oz bottles, 24 count case",
        price: 28.99,
        basePrice: 22.50,
        price1: 28.99,
        price2: 27.99,
        price3: 26.99,
        price4: 25.99,
        price5: 24.99,
        sku: "PERRIER24CT",
        stock: 38,
        categoryId: categoryMap.get("FOOD & BEVERAGE") || 19,
        imageUrl: "https://m.media-amazon.com/images/I/81fPKHOEqRL.jpg"
      }
    ];
    
    let productsAdded = 0;
    let productsUpdated = 0;
    
    // Add each product
    for (const product of customProducts) {
      // Check if product already exists by SKU
      const existingProduct = await db.select().from(products)
        .where(eq(products.sku, product.sku))
        .limit(1);
      
      if (existingProduct.length === 0) {
        // Create new product
        const result = await db.insert(products).values({
          name: product.name,
          description: product.description,
          price: product.price,
          basePrice: product.basePrice,
          price1: product.price1,
          price2: product.price2,
          price3: product.price3,
          price4: product.price4,
          price5: product.price5,
          sku: product.sku,
          stock: product.stock,
          categoryId: product.categoryId,
          imageUrl: product.imageUrl,
          minOrderQuantity: 1
        }).returning();
        
        console.log(`Added product: ${product.name} with ID ${result[0].id}`);
        productsAdded++;
      } else {
        // Update existing product
        await db.update(products)
          .set({
            description: product.description,
            price: product.price,
            basePrice: product.basePrice,
            price1: product.price1,
            price2: product.price2,
            price3: product.price3,
            price4: product.price4,
            price5: product.price5,
            stock: product.stock,
            imageUrl: product.imageUrl
          })
          .where(eq(products.id, existingProduct[0].id));
        
        console.log(`Updated existing product: ${product.name} with ID ${existingProduct[0].id}`);
        productsUpdated++;
      }
    }
    
    console.log(`Import complete! Added ${productsAdded} new products and updated ${productsUpdated} existing products.`);
    
  } catch (error) {
    console.error('Error adding custom products:', error);
  }
}

// Execute the import
main();