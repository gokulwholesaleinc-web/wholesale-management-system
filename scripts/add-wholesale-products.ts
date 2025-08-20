import { db } from '../server/db';
import { products, categories } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function main() {
  try {
    console.log('Starting to add wholesale products...');
    
    // Define categories based on your price list
    const categoryData = [
      { name: 'TOBACCO', description: 'Tobacco products' },
      { name: 'FOOD & BEVERAGE', description: 'Food and beverage products' },
      { name: 'MEDS/DAILY CARE', description: 'Medicine and daily care products' },
      { name: 'PLASTIC/PAPER GOODS', description: 'Plastic and paper goods' },
      { name: 'LIQUOR SUPPLIES', description: 'Liquor and bar supplies' },
      { name: 'AUTOMOTIVE', description: 'Automotive products' },
      { name: 'CIGAR', description: 'Cigar products' },
      { name: 'ENERGY DRINK', description: 'Energy drinks' },
      { name: 'JUICE/MIXERS', description: 'Juices and mixers' },
      { name: 'SMOKE TOBACCO', description: 'Smoking tobacco products' },
      { name: 'SMOKELESS', description: 'Smokeless tobacco products' },
      { name: 'SODA', description: 'Soda products' },
      { name: 'PILLS', description: 'Pills and medicine' }
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
    
    // Products based on your price list
    const productData = [
      {
        name: 'SWISHER LEAF DARK STOUT',
        description: 'Premium dark stout cigar 10/3 pack',
        price: 27.99,
        basePrice: 26.50,
        price1: 27.99,
        price2: 27.95,
        price3: 27.50,
        price4: 27.00,
        price5: 26.75,
        sku: '025900359065',
        stock: 123,
        categoryId: categoryMap['TOBACCO'],
        imageUrl: 'https://m.media-amazon.com/images/I/71+eJrE9+pL._SL1500_.jpg'
      },
      {
        name: '5-HOUR ENERGY WATERMELON',
        description: 'Energy shot in watermelon flavor',
        price: 23.25,
        basePrice: 21.00,
        price1: 23.25,
        price2: 22.99,
        price3: 22.50,
        price4: 22.00,
        price5: 21.50,
        sku: '719410175436',
        stock: 87,
        categoryId: categoryMap['FOOD & BEVERAGE'],
        imageUrl: 'https://m.media-amazon.com/images/I/71qMFXBBnGL._SL1500_.jpg'
      },
      {
        name: '5-HOUR EXTRA ULTIMATE CITRUS',
        description: 'Extra strength energy shot in citrus flavor',
        price: 23.25,
        basePrice: 20.40,
        price1: 23.25,
        price2: 22.99,
        price3: 22.50,
        price4: 21.99,
        price5: 21.00,
        sku: '719410725129',
        stock: 92,
        categoryId: categoryMap['FOOD & BEVERAGE'],
        imageUrl: 'https://m.media-amazon.com/images/I/71qMFXBBnGL._SL1500_.jpg'
      },
      {
        name: 'RED BULL SUGAR FREE 12 OZ',
        description: 'Sugar-free energy drink, 12-ounce cans',
        price: 57.00,
        basePrice: 50.13,
        price1: 57.00,
        price2: 56.50,
        price3: 55.00,
        price4: 53.50,
        price5: 52.00,
        sku: '611269423754',
        stock: 145,
        categoryId: categoryMap['FOOD & BEVERAGE'],
        imageUrl: 'https://m.media-amazon.com/images/I/71dvl-JF1iL._SL1500_.jpg'
      },
      {
        name: 'ALKA SELTZER 2PK 18CT',
        description: 'Antacid and pain relief medicine, 18 count of 2 packs',
        price: 7.50,
        basePrice: 5.75,
        price1: 7.50,
        price2: 7.25,
        price3: 6.99,
        price4: 6.75,
        price5: 6.50,
        sku: '016500567301',
        stock: 78,
        categoryId: categoryMap['MEDS/DAILY CARE'],
        imageUrl: 'https://m.media-amazon.com/images/I/81o9BRLr72L._SL1500_.jpg'
      },
      {
        name: 'RED BULL 8.4FL OZ',
        description: 'Classic energy drink in 8.4-ounce cans',
        price: 39.00,
        basePrice: 37.99,
        price1: 39.00,
        price2: 38.50,
        price3: 38.00,
        price4: 37.75,
        price5: 37.50,
        sku: '611269991246',
        stock: 156,
        categoryId: categoryMap['FOOD & BEVERAGE'],
        imageUrl: 'https://m.media-amazon.com/images/I/71dvl-JF1iL._SL1500_.jpg'
      },
      {
        name: 'PERRIER 330ML 24CT',
        description: 'Carbonated mineral water, 330ml bottles, 24 count',
        price: 23.50,
        basePrice: 19.99,
        price1: 23.50,
        price2: 22.99,
        price3: 22.25,
        price4: 21.50,
        price5: 20.99,
        sku: '074780004107',
        stock: 63,
        categoryId: categoryMap['FOOD & BEVERAGE'],
        imageUrl: 'https://m.media-amazon.com/images/I/71dvl-JF1iL._SL1500_.jpg'
      },
      {
        name: 'COKE 16 OZ 24CT',
        description: 'Coca-Cola in 16-ounce bottles, 24 count case',
        price: 32.00,
        basePrice: 28.50,
        price1: 32.00,
        price2: 31.50,
        price3: 30.99,
        price4: 30.00,
        price5: 29.50,
        sku: 'COKE16OZ',
        stock: 89,
        categoryId: categoryMap['FOOD & BEVERAGE'],
        imageUrl: 'https://m.media-amazon.com/images/I/71dvl-JF1iL._SL1500_.jpg'
      },
      {
        name: 'PLENTY BIG ROLL 15CT',
        description: 'Paper towels, big roll size, 15 count',
        price: 19.50,
        basePrice: 15.99,
        price1: 19.50,
        price2: 18.99,
        price3: 18.50,
        price4: 17.99,
        price5: 17.50,
        sku: '183689182028',
        stock: 112,
        categoryId: categoryMap['PLASTIC/PAPER GOODS'],
        imageUrl: 'https://m.media-amazon.com/images/I/61KEu4Cyz6L._SL1500_.jpg'
      },
      {
        name: 'MINI TRAVEL BOTTLE OPENER 48CT',
        description: 'Compact bottle openers for travel, 48 count',
        price: 24.00,
        basePrice: 16.80,
        price1: 24.00,
        price2: 23.50,
        price3: 22.99,
        price4: 22.00,
        price5: 21.00,
        sku: '756545773083',
        stock: 75,
        categoryId: categoryMap['LIQUOR SUPPLIES'],
        imageUrl: 'https://m.media-amazon.com/images/I/71WNxaVJ6wL._SL1500_.jpg'
      },
      {
        name: 'TWANG LEMON LIME SALT 200CT',
        description: 'Lemon lime flavored salt packets, 200 count',
        price: 14.50,
        basePrice: 11.50,
        price1: 14.50,
        price2: 14.00,
        price3: 13.50,
        price4: 12.99,
        price5: 12.50,
        sku: '023604200232',
        stock: 93,
        categoryId: categoryMap['LIQUOR SUPPLIES'],
        imageUrl: 'https://m.media-amazon.com/images/I/71WNxaVJ6wL._SL1500_.jpg'
      },
      {
        name: 'MORTIN-IB 50CT',
        description: 'Ibuprofen pain relief tablets, 50 count',
        price: 14.50,
        basePrice: 11.99,
        price1: 14.50,
        price2: 14.00,
        price3: 13.50,
        price4: 12.99,
        price5: 12.50,
        sku: '300450481528',
        stock: 87,
        categoryId: categoryMap['MEDS/DAILY CARE'],
        imageUrl: 'https://m.media-amazon.com/images/I/81o9BRLr72L._SL1500_.jpg'
      },
      {
        name: 'NYQUIL SEVERE 32 2PK',
        description: 'Cold and flu relief medicine, severe formula, 32 count 2 pack',
        price: 36.00,
        basePrice: 28.50,
        price1: 36.00,
        price2: 35.00,
        price3: 33.99,
        price4: 31.99,
        price5: 30.00,
        sku: '20323900048366',
        stock: 65,
        categoryId: categoryMap['MEDS/DAILY CARE'],
        imageUrl: 'https://m.media-amazon.com/images/I/81o9BRLr72L._SL1500_.jpg'
      },
      {
        name: 'ALKA SLETZER PLUS 72CT',
        description: 'Cold and flu relief tablets, 72 count',
        price: 23.00,
        basePrice: 18.99,
        price1: 23.00,
        price2: 22.50,
        price3: 21.99,
        price4: 21.00,
        price5: 20.00,
        sku: '016500594932',
        stock: 76,
        categoryId: categoryMap['MEDS/DAILY CARE'],
        imageUrl: 'https://m.media-amazon.com/images/I/81o9BRLr72L._SL1500_.jpg'
      },
      {
        name: 'GARBAGE BAG 33/39',
        description: 'Heavy-duty garbage bags, fits 33-39 gallon containers',
        price: 21.00,
        basePrice: 7.65,
        price1: 21.00,
        price2: 15.50,
        price3: 23.00,
        price4: 20.00,
        price5: 18.50,
        sku: 'GARBAGEBAG33/39',
        stock: 104,
        categoryId: categoryMap['PLASTIC/PAPER GOODS'],
        imageUrl: 'https://m.media-amazon.com/images/I/61KEu4Cyz6L._SL1500_.jpg'
      },
      {
        name: 'SPRITE 1L 12CT',
        description: 'Sprite soda in 1-liter bottles, 12 count case',
        price: 25.00,
        basePrice: 22.11,
        price1: 25.00,
        price2: 24.50,
        price3: 24.00,
        price4: 23.50,
        price5: 23.00,
        sku: '049000023190',
        stock: 87,
        categoryId: categoryMap['FOOD & BEVERAGE'],
        imageUrl: 'https://m.media-amazon.com/images/I/71dvl-JF1iL._SL1500_.jpg'
      },
      {
        name: 'LITTLE TRESS BLACK ICE',
        description: 'Car air freshener, black ice scent',
        price: 15.75,
        basePrice: 13.50,
        price1: 15.75,
        price2: 15.50,
        price3: 15.00,
        price4: 14.50,
        price5: 14.00,
        sku: '30076171101557',
        stock: 132,
        categoryId: categoryMap['AUTOMOTIVE'],
        imageUrl: 'https://m.media-amazon.com/images/I/61YqCXr4FqL._SL1280_.jpg'
      },
      {
        name: 'MONSTER ULTRA PEACHY KEEN 16OZ',
        description: 'Monster energy drink, peachy keen flavor, 16 ounce cans',
        price: 40.50,
        basePrice: 37.00,
        price1: 40.50,
        price2: 40.00,
        price3: 39.50,
        price4: 38.99,
        price5: 38.00,
        sku: '070847029434',
        stock: 95,
        categoryId: categoryMap['FOOD & BEVERAGE'],
        imageUrl: 'https://m.media-amazon.com/images/I/71qMFXBBnGL._SL1500_.jpg'
      },
      {
        name: 'MR. PURE FRUIT PUNCH 16OZ',
        description: 'Fruit punch juice, 16 ounce bottles',
        price: 19.50,
        basePrice: 15.65,
        price1: 19.50,
        price2: 19.00,
        price3: 18.50,
        price4: 17.99,
        price5: 17.00,
        sku: '072718100334',
        stock: 78,
        categoryId: categoryMap['FOOD & BEVERAGE'],
        imageUrl: 'https://m.media-amazon.com/images/I/71dvl-JF1iL._SL1500_.jpg'
      }
    ];
    
    // Add products
    let productsAdded = 0;
    
    for (const product of productData) {
      const existingProduct = await db.select().from(products).where(eq(products.sku, product.sku)).limit(1);
      
      if (existingProduct.length === 0) {
        await db.insert(products).values(product);
        productsAdded++;
        console.log(`Added product: ${product.name}`);
      } else {
        console.log(`Product already exists: ${product.name} with ID ${existingProduct[0].id}`);
      }
    }
    
    console.log(`Import complete! Added ${productsAdded} new wholesale products.`);
    
  } catch (error) {
    console.error('Error adding products:', error);
  }
}

main();