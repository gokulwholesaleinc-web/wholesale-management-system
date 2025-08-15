import { db } from '../server/db';
import { products, categories } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function main() {
  try {
    console.log('Starting to add sample products with images...');
    
    // Define sample categories if they don't exist
    const categoryData = [
      { name: 'Grains', description: 'Rice, wheat, and other grain products' },
      { name: 'Spices', description: 'Various spices and seasonings' },
      { name: 'Lentils', description: 'Different types of lentils and beans' },
      { name: 'Oils', description: 'Cooking oils and ghee' },
      { name: 'Snacks', description: 'Indian snacks and ready-to-eat items' },
      { name: 'Flour', description: 'Different types of flour and mixes' },
      { name: 'Beverages', description: 'Tea, coffee and other drinks' },
      { name: 'Canned Goods', description: 'Preserved and canned food items' },
      { name: 'Dairy', description: 'Dairy and dairy alternative products' },
      { name: 'Produce', description: 'Fresh fruits and vegetables' }
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
    
    // Get all category IDs for reference
    const allCategories = await db.select().from(categories);
    const categoryMap = new Map(allCategories.map(cat => [cat.name, cat.id]));
    
    // Define sample products with images
    const productData = [
      {
        name: 'Basmati Rice',
        description: 'Premium long-grain basmati rice. Aromatic and perfect for biryanis and pulao.',
        price: 25.99, // Add standard price
        basePrice: 25.99,
        price1: 25.99,
        price2: 24.99,
        price3: 23.99,
        price4: 22.99,
        price5: 21.99,
        sku: 'GR-BSM-001',
        stock: 150,
        categoryId: categoryMap.get('Grains'),
        imageUrl: 'https://cdn.shopify.com/s/files/1/0560/7345/6301/products/IndiaGateBasmatiRice10lb.png?v=1641333773'
      },
      {
        name: 'Turmeric Powder',
        description: 'Organic ground turmeric with rich color and aroma. Essential for Indian cooking.',
        price: 8.99,
        basePrice: 8.99,
        price1: 8.99,
        price2: 8.49,
        price3: 7.99,
        price4: 7.49,
        price5: 6.99,
        sku: 'SP-TRM-001',
        stock: 200,
        categoryId: categoryMap.get('Spices'),
        imageUrl: 'https://m.media-amazon.com/images/I/71JsnWjI1hL._AC_UF894,1000_QL80_.jpg'
      },
      {
        name: 'Yellow Moong Dal',
        description: 'Split yellow mung beans. Perfect for soups, stews and traditional Indian dishes.',
        price: 10.99,
        basePrice: 10.99,
        price1: 10.99,
        price2: 10.49,
        price3: 9.99,
        price4: 9.49,
        price5: 8.99,
        sku: 'LN-YMD-001',
        stock: 120,
        categoryId: categoryMap.get('Lentils'),
        imageUrl: 'https://www.pngkey.com/png/detail/171-1718206_moong-dal-png-image-background-moong-dal.png'
      },
      {
        name: 'Mustard Oil',
        description: 'Pure mustard oil for cooking. Strong flavor perfect for Bengali and North Indian cuisine.',
        price: 14.99,
        basePrice: 14.99,
        price1: 14.99,
        price2: 14.49,
        price3: 13.99,
        price4: 13.49,
        price5: 12.99,
        sku: 'OL-MST-001',
        stock: 80,
        categoryId: categoryMap.get('Oils'),
        imageUrl: 'https://5.imimg.com/data5/SELLER/Default/2023/9/345485344/PC/NO/YC/63316361/fortune-kachi-ghani-mustard-oil-1-ltr-gp.png'
      },
      {
        name: 'Parle-G Biscuits',
        description: 'Popular Indian glucose biscuits. Perfect for tea time snacks.',
        price: 2.99,
        basePrice: 2.99,
        price1: 2.99,
        price2: 2.79,
        price3: 2.59,
        price4: 2.39,
        price5: 2.19,
        sku: 'SN-PRL-001',
        stock: 300,
        categoryId: categoryMap.get('Snacks'),
        imageUrl: 'https://cdn.shopify.com/s/files/1/0277/1910/4861/products/parle-g-biscuits-original-800g_1024x.png?v=1628094356'
      },
      {
        name: 'Besan Flour',
        description: 'Gram flour made from ground chickpeas. Used for pakoras, sweets and many Indian recipes.',
        price: 9.99,
        basePrice: 9.99,
        price1: 9.99,
        price2: 9.49,
        price3: 8.99,
        price4: 8.49,
        price5: 7.99,
        sku: 'FL-BSN-001',
        stock: 100,
        categoryId: categoryMap.get('Flour'),
        imageUrl: 'https://www.pngitem.com/pimgs/m/288-2884618_besan-flour-png-transparent-png.png'
      },
      {
        name: 'Taj Mahal Tea',
        description: 'Premium Indian tea leaves. Rich aroma and strong flavor for the perfect cup of chai.',
        price: 7.99,
        basePrice: 7.99,
        price1: 7.99,
        price2: 7.49,
        price3: 6.99,
        price4: 6.49,
        price5: 5.99,
        sku: 'BV-TEA-001',
        stock: 150,
        categoryId: categoryMap.get('Beverages'),
        imageUrl: 'https://cdn.shopify.com/s/files/1/0504/9700/2327/products/7fdd95a1-0a56-4ed8-9d1a-f02a928b0871.png?v=1623066243'
      },
      {
        name: 'MTR Sambar Mix',
        description: 'Ready-to-cook sambar mix. Authentic South Indian flavors in minutes.',
        price: 5.99,
        basePrice: 5.99,
        price1: 5.99,
        price2: 5.49,
        price3: 4.99,
        price4: 4.49,
        price5: 3.99,
        sku: 'CG-SMB-001',
        stock: 100,
        categoryId: categoryMap.get('Canned Goods'),
        imageUrl: 'https://m.media-amazon.com/images/I/61Cak3xcuQL._AC_UF1000,1000_QL80_.jpg'
      },
      {
        name: 'Amul Butter',
        description: 'Creamy, salted butter. Perfect for spreading on rotis or for cooking.',
        price: 6.99,
        basePrice: 6.99,
        price1: 6.99,
        price2: 6.49,
        price3: 5.99,
        price4: 5.49,
        price5: 4.99,
        sku: 'DR-BTR-001',
        stock: 80,
        categoryId: categoryMap.get('Dairy'),
        imageUrl: 'https://cdn.webshopapp.com/shops/139272/files/424260265/500x500x2/amul-amul-butter-500g.jpg'
      },
      {
        name: 'Fresh Okra',
        description: 'Fresh, tender okra (ladies finger). Perfect for curries and bhindi masala.',
        price: 4.99,
        basePrice: 4.99,
        price1: 4.99,
        price2: 4.49,
        price3: 3.99,
        price4: 3.49,
        price5: 2.99,
        sku: 'PR-OKR-001',
        stock: 50,
        categoryId: categoryMap.get('Produce'),
        imageUrl: 'https://pngimg.com/uploads/okra/okra_PNG15.png'
      }
    ];
    
    // Add products if they don't exist
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
    
    console.log(`Added ${productsAdded} new products with images.`);
    console.log('Database operations completed');
    
  } catch (error) {
    console.error('Error adding sample products:', error);
  }
}

main();