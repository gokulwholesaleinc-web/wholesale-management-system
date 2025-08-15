import { db } from '../server/db';
import { products, categories } from '../shared/schema';
import { eq } from 'drizzle-orm';
import * as fs from 'fs';
import { parse } from 'csv-parse/sync';

async function main() {
  try {
    console.log('Starting to import products from price list...');
    
    // Read and parse the CSV file
    const csvData = fs.readFileSync('../attached_assets/pricelist.csv', 'utf8');
    const records = parse(csvData, {
      columns: true,
      skip_empty_lines: true
    });
    
    // Create a map to store departments/categories
    const departmentMap = new Map();
    
    // First pass - collect all departments and categories
    for (const record of records) {
      if (record.Department && !departmentMap.has(record.Department)) {
        departmentMap.set(record.Department, new Set());
      }
      
      if (record.Department && record.Category) {
        departmentMap.get(record.Department).add(record.Category);
      }
    }
    
    // Add departments as categories if they don't exist
    for (const [department, subcategories] of departmentMap.entries()) {
      if (department) {
        let departmentDesc = 'Products from ' + department + ' department';
        
        // Check if department exists
        const existingDept = await db.select().from(categories)
          .where(eq(categories.name, department))
          .limit(1);
        
        let departmentId;
        
        if (existingDept.length === 0) {
          // Create department
          const newDept = await db.insert(categories)
            .values({ name: department, description: departmentDesc })
            .returning();
          departmentId = newDept[0].id;
          console.log(`Added department category: ${department} with ID ${departmentId}`);
        } else {
          departmentId = existingDept[0].id;
          console.log(`Department category already exists: ${department} with ID ${departmentId}`);
        }
        
        // Add subcategories if they exist
        for (const subcategory of subcategories) {
          if (subcategory) {
            const existingCat = await db.select().from(categories)
              .where(eq(categories.name, subcategory))
              .limit(1);
            
            if (existingCat.length === 0) {
              const newCat = await db.insert(categories)
                .values({ 
                  name: subcategory, 
                  description: subcategory + ' products in ' + department + ' department',
                  parentId: departmentId
                })
                .returning();
              console.log(`Added subcategory: ${subcategory} with ID ${newCat[0].id} under ${department}`);
            } else {
              console.log(`Subcategory already exists: ${subcategory} with ID ${existingCat[0].id}`);
            }
          }
        }
      }
    }
    
    // Get all categories for reference
    const allCategories = await db.select().from(categories);
    const categoryMap = new Map();
    
    // Create a nested map structure for fast lookups
    for (const category of allCategories) {
      categoryMap.set(category.name, category.id);
    }
    
    // Create products from the CSV data
    let productsAdded = 0;
    let productsUpdated = 0;
    
    const batchSize = 100;
    let currentBatch = 0;
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      
      // Skip if missing critical information
      if (!record.Description || !record.Price || !record['Item Lookup Code']) {
        continue;
      }
      
      // Determine category
      let categoryId = null;
      if (record.Category && categoryMap.has(record.Category)) {
        categoryId = categoryMap.get(record.Category);
      } else if (record.Department && categoryMap.has(record.Department)) {
        categoryId = categoryMap.get(record.Department);
      }
      
      // Set default price values if not available
      const price = parseFloat(record.Price) || 0;
      const basePrice = parseFloat(record.Cost) || price;
      const price1 = parseFloat(record['Price A']) || price;
      const price2 = parseFloat(record['Price B']) || price;
      const price3 = parseFloat(record['Price C']) || price;
      // Default price4 and price5 based on decreasing scale
      const price4 = price3 > 0 ? price3 * 0.95 : price * 0.95;
      const price5 = price3 > 0 ? price3 * 0.90 : price * 0.90;
      
      // Check if product already exists by SKU
      const existingProduct = await db.select().from(products)
        .where(eq(products.sku, record['Item Lookup Code']))
        .limit(1);
      
      // Generate a description if it's too short
      let description = record.Description;
      if (description.length < 10) {
        description = `${description} - Quality product from ${record.Department || 'our wholesale catalog'}`;
      }
      
      // Select image URL based on product name/description
      const imageUrl = selectImageUrl(record.Description, record.Department, record.Category);
      
      if (existingProduct.length === 0) {
        // Create new product
        await db.insert(products).values({
          name: record.Description,
          description: description,
          price: price,
          basePrice: basePrice,
          price1: price1 || price,
          price2: price2 || price * 0.97,
          price3: price3 || price * 0.95,
          price4: price4,
          price5: price5,
          sku: record['Item Lookup Code'],
          stock: Math.floor(Math.random() * 100) + 50, // Random stock between 50-150
          categoryId: categoryId,
          imageUrl: imageUrl
        });
        
        productsAdded++;
        
        if (i % 10 === 0) {
          console.log(`Added product: ${record.Description}`);
        }
      } else {
        // Update existing product
        await db.update(products)
          .set({
            price: price,
            basePrice: basePrice,
            price1: price1 || price,
            price2: price2 || price * 0.97,
            price3: price3 || price * 0.95,
            price4: price4,
            price5: price5,
            stock: existingProduct[0].stock || Math.floor(Math.random() * 100) + 50,
            categoryId: categoryId || existingProduct[0].categoryId,
            imageUrl: existingProduct[0].imageUrl || imageUrl
          })
          .where(eq(products.id, existingProduct[0].id));
        
        productsUpdated++;
        
        if (i % 50 === 0) {
          console.log(`Updated product: ${record.Description}`);
        }
      }
      
      // Process in batches to avoid overwhelming the database
      if (i % batchSize === 0 && i > 0) {
        currentBatch++;
        console.log(`Processed batch ${currentBatch} (${i} products so far)`);
      }
    }
    
    console.log(`Import complete! Added ${productsAdded} new products and updated ${productsUpdated} existing products.`);
    
  } catch (error) {
    console.error('Error importing products:', error);
  }
}

// Function to select an appropriate image URL based on product name and category
function selectImageUrl(description: string, department: string, category: string): string {
  // Default image URLs by category
  const defaultImages: Record<string, string[]> = {
    'TOBACCO': [
      'https://m.media-amazon.com/images/I/71tn6FpI+EL._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/61UZJVv3bJL._SL1100_.jpg'
    ],
    'FOOD & BEVERAGE': [
      'https://m.media-amazon.com/images/I/71tn6FpI+EL._SL1500_.jpg',
      'https://cdn.shopify.com/s/files/1/0560/7345/6301/products/IndiaGateBasmatiRice10lb.png?v=1641333773'
    ],
    'MEDS/DAILY CARE': [
      'https://m.media-amazon.com/images/I/81o9BRLr72L._SL1500_.jpg',
      'https://m.media-amazon.com/images/I/71dvl-JF1iL._SL1500_.jpg'
    ],
    'PLASTIC/PAPER GOODS': [
      'https://m.media-amazon.com/images/I/61KEu4Cyz6L._SL1500_.jpg'
    ],
    'LIQUOR SUPPLIES': [
      'https://m.media-amazon.com/images/I/71WNxaVJ6wL._SL1500_.jpg'
    ],
    'AUTOMOTIVE': [
      'https://m.media-amazon.com/images/I/61YqCXr4FqL._SL1280_.jpg'
    ]
  };
  
  // Common image categories
  const imageCategories: Record<string, string> = {
    'CIGAR': 'https://m.media-amazon.com/images/I/71+eJrE9+pL._SL1500_.jpg',
    'ENERGY': 'https://m.media-amazon.com/images/I/71qMFXBBnGL._SL1500_.jpg',
    'SODA': 'https://m.media-amazon.com/images/I/71dvl-JF1iL._SL1500_.jpg',
    'OIL': 'https://m.media-amazon.com/images/I/61YqCXr4FqL._SL1280_.jpg',
    'RICE': 'https://cdn.shopify.com/s/files/1/0560/7345/6301/products/IndiaGateBasmatiRice10lb.png?v=1641333773',
    'VAPE': 'https://m.media-amazon.com/images/I/71qMFXBBnGL._SL1500_.jpg',
    'CHAI': 'https://m.media-amazon.com/images/I/71tn6FpI+EL._SL1500_.jpg',
    'SPICE': 'https://m.media-amazon.com/images/I/81o9BRLr72L._SL1500_.jpg',
    'PICKLE': 'https://m.media-amazon.com/images/I/71WNxaVJ6wL._SL1500_.jpg'
  };
  
  // Check if description contains any of our image category keywords
  for (const [keyword, url] of Object.entries(imageCategories)) {
    if (description.toUpperCase().includes(keyword) || 
        (category && category.toUpperCase().includes(keyword))) {
      return url;
    }
  }
  
  // If nothing matched by keyword, use department default
  if (department && defaultImages[department]) {
    const images = defaultImages[department];
    return images[Math.floor(Math.random() * images.length)];
  }
  
  // Final fallback - choose a random image from all available
  const allImages = Object.values(defaultImages).flat();
  return allImages[Math.floor(Math.random() * allImages.length)];
}

main();