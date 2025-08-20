import { db } from '../server/db';
import { products, categories } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function main() {
  try {
    console.log('Starting to add products directly...');
    
    // Define categories
    const categoryData = [
      { name: 'Grains', description: 'Rice, wheat, and other grain products' },
      { name: 'Spices', description: 'Various spices and seasonings' },
      { name: 'Lentils', description: 'Different types of lentils and beans' },
      { name: 'Oils', description: 'Cooking oils and ghee' },
      { name: 'Snacks', description: 'Indian snacks and ready-to-eat items' },
      { name: 'Beverages', description: 'Drinks and refreshments' },
      { name: 'Pickles', description: 'Traditional Indian pickles and chutneys' },
      { name: 'Sweets', description: 'Indian sweets and desserts' }
    ];
    
    // Add categories if they don't exist
    for (const category of categoryData) {
      const existingCategory = await db.select().from(categories).where(eq(categories.name, category.name)).limit(1);
      
      if (existingCategory.length === 0) {
        const newCategory = await db.insert(categories).values(category).returning();
        console.log(`Added category: ${category.name} with ID ${newCategory[0].id}`);
      } else {
        console.log(`Category already exists: ${category.name} with ID ${existingCategory[0].id}`);
      }
    }
    
    // Get all categories for reference
    const allCategories = await db.select().from(categories);
    const categoryMap = Object.fromEntries(allCategories.map(cat => [cat.name, cat.id]));
    
    // Define products
    const productData = [
      {
        name: 'Premium Basmati Rice',
        description: 'High-quality long-grain basmati rice from the Himalayan foothills. Perfect for biryanis and pilaf dishes.',
        price: 18.99,
        basePrice: 18.99,
        price1: 18.99,
        price2: 17.99,
        price3: 16.99,
        price4: 15.99,
        price5: 14.99,
        sku: 'GR-BSM-002',
        stock: 200,
        categoryId: categoryMap['Grains'],
        imageUrl: 'https://cdn.shopify.com/s/files/1/0560/7345/6301/products/IndiaGateBasmatiRice10lb.png?v=1641333773'
      },
      {
        name: 'Red Chili Powder',
        description: 'Hot and vibrant red chili powder. Essential for adding heat to any Indian dish.',
        price: 5.99,
        basePrice: 5.99,
        price1: 5.99,
        price2: 5.49,
        price3: 4.99,
        price4: 4.49,
        price5: 3.99,
        sku: 'SP-CHL-001',
        stock: 150,
        categoryId: categoryMap['Spices'],
        imageUrl: 'https://m.media-amazon.com/images/I/81o9BRLr72L._SL1500_.jpg'
      },
      {
        name: 'Chana Dal',
        description: 'Split chickpeas with a mild, nutty flavor. Great for dals, soups, and stews.',
        price: 7.99,
        basePrice: 7.99,
        price1: 7.99,
        price2: 7.49,
        price3: 6.99,
        price4: 6.49,
        price5: 5.99,
        sku: 'LN-CHN-001',
        stock: 120,
        categoryId: categoryMap['Lentils'],
        imageUrl: 'https://m.media-amazon.com/images/I/71dvl-JF1iL._SL1500_.jpg'
      },
      {
        name: 'Pure Ghee',
        description: 'Traditional clarified butter. Rich, nutty flavor perfect for cooking and religious ceremonies.',
        price: 14.99,
        basePrice: 14.99,
        price1: 14.99,
        price2: 13.99,
        price3: 12.99,
        price4: 11.99,
        price5: 10.99,
        sku: 'OL-GHE-001',
        stock: 80,
        categoryId: categoryMap['Oils'],
        imageUrl: 'https://m.media-amazon.com/images/I/61YqCXr4FqL._SL1280_.jpg'
      },
      {
        name: 'Mango Pickle',
        description: 'Spicy, tangy mango pickle. Perfect accompaniment for rice, dal, and Indian breads.',
        price: 6.99,
        basePrice: 6.99,
        price1: 6.99,
        price2: 6.49,
        price3: 5.99,
        price4: 5.49,
        price5: 4.99,
        sku: 'PK-MNG-001',
        stock: 90,
        categoryId: categoryMap['Pickles'],
        imageUrl: 'https://m.media-amazon.com/images/I/71WNxaVJ6wL._SL1500_.jpg'
      },
      {
        name: 'Masala Chai',
        description: 'Premium tea blend with cardamom, cinnamon, ginger and other spices. Rich and aromatic.',
        price: 8.99,
        basePrice: 8.99,
        price1: 8.99,
        price2: 8.49,
        price3: 7.99,
        price4: 7.49,
        price5: 6.99,
        sku: 'BV-CHI-001',
        stock: 100,
        categoryId: categoryMap['Beverages'],
        imageUrl: 'https://m.media-amazon.com/images/I/71tn6FpI+EL._SL1500_.jpg'
      },
      {
        name: 'Soan Papdi',
        description: 'Flaky, sweet dessert made with gram flour, sugar, and cardamom. A festival favorite.',
        price: 9.99,
        basePrice: 9.99,
        price1: 9.99,
        price2: 9.49,
        price3: 8.99,
        price4: 8.49,
        price5: 7.99,
        sku: 'SW-SPD-001',
        stock: 70,
        categoryId: categoryMap['Sweets'],
        imageUrl: 'https://m.media-amazon.com/images/I/61UZJVv3bJL._SL1100_.jpg'
      },
      {
        name: 'Bhujia Sev',
        description: 'Crunchy, spicy gram flour snack. Perfect for munching or as a topping for chaats.',
        price: 4.99,
        basePrice: 4.99,
        price1: 4.99,
        price2: 4.49,
        price3: 3.99,
        price4: 3.49,
        price5: 2.99,
        sku: 'SN-BHJ-001',
        stock: 150,
        categoryId: categoryMap['Snacks'],
        imageUrl: 'https://m.media-amazon.com/images/I/71+eJrE9+pL._SL1500_.jpg'
      },
      {
        name: 'Garam Masala',
        description: 'Aromatic blend of ground spices used in many Indian dishes. Adds warmth and depth of flavor.',
        price: 6.99,
        basePrice: 6.99,
        price1: 6.99,
        price2: 6.49,
        price3: 5.99,
        price4: 5.49,
        price5: 4.99,
        sku: 'SP-GRM-001',
        stock: 180,
        categoryId: categoryMap['Spices'],
        imageUrl: 'https://m.media-amazon.com/images/I/71qMFXBBnGL._SL1500_.jpg'
      },
      {
        name: 'Coconut Oil',
        description: 'Cold-pressed, unrefined coconut oil. Great for cooking South Indian dishes and hair care.',
        price: 12.99,
        basePrice: 12.99,
        price1: 12.99,
        price2: 11.99,
        price3: 10.99,
        price4: 9.99,
        price5: 8.99,
        sku: 'OL-CCN-001',
        stock: 60,
        categoryId: categoryMap['Oils'],
        imageUrl: 'https://m.media-amazon.com/images/I/61KEu4Cyz6L._SL1500_.jpg'
      },
    ];
    
    // Add products
    let productsAdded = 0;
    
    for (const product of productData) {
      const existingProduct = await db.select().from(products).where(eq(products.name, product.name)).limit(1);
      
      if (existingProduct.length === 0) {
        await db.insert(products).values(product);
        productsAdded++;
        console.log(`Added product: ${product.name}`);
      } else {
        console.log(`Product already exists: ${product.name} with ID ${existingProduct[0].id}`);
      }
    }
    
    console.log(`Import complete! Added ${productsAdded} new products with images.`);
    
  } catch (error) {
    console.error('Error adding products:', error);
  }
}

main();