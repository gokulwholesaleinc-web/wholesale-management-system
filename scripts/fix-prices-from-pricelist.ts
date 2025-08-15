/**
 * This script corrects product pricing using the prices from pricelist2.csv
 * It updates products with the correct sell price from the price list
 */

import { pool } from "../server/db";
import { db } from "../server/db";
import { products } from "../shared/schema";
import { eq } from "drizzle-orm";
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse/sync';

interface PriceListItem {
  Department: string;
  Category: string;
  'Item Lookup Code': string;
  Description: string;
  Price: string;
}

function parsePrice(priceStr: string): number {
  // Remove any non-numeric characters except for decimal point
  const price = parseFloat(priceStr.replace(/[^0-9.]/g, ''));
  return isNaN(price) ? 0 : price;
}

async function main() {
  try {
    console.log("Starting price correction from pricelist2.csv...");
    
    // Read the price list CSV file
    const filePath = path.join(process.cwd(), 'attached_assets', 'pricelist2.csv');
    const csvContent = fs.readFileSync(filePath, { encoding: 'utf-8' });
    
    // Parse the CSV data
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    }) as PriceListItem[];
    
    console.log(`Parsed ${records.length} items from price list`);
    
    // Create a map of lookup codes to prices for faster lookup
    const priceMap = new Map<string, number>();
    
    // Fill the map with all prices
    for (const record of records) {
      // Log some sample records to debug
      if (records.indexOf(record) < 5) {
        console.log("Sample record:", record);
      }
      
      // Use the correct CSV column names
      if (record['Item Lookup Code'] && record.Price) {
        console.log(`Setting price ${record.Price} for code ${record['Item Lookup Code']}`);
        priceMap.set(record['Item Lookup Code'].trim(), parsePrice(record.Price));
      }
    }
    
    console.log(`Price map contains ${priceMap.size} unique lookup codes`);
    
    // Get all products from the database
    const allProducts = await db.select().from(products);
    console.log(`Found ${allProducts.length} products in database`);
    
    // Keep track of updates
    let updatedCount = 0;
    let notUpdatedCount = 0;
    
    // Update each product with matching SKU
    for (const product of allProducts) {
      // Skip products without SKU
      if (!product.sku) {
        notUpdatedCount++;
        continue;
      }
      
      // Find the price for this product's SKU
      const price = priceMap.get(product.sku.trim());
      
      // Skip if no price found
      if (!price) {
        notUpdatedCount++;
        continue;
      }
      
      // Update the product with the new price
      await db.update(products)
        .set({
          price: price,
          // Also update the price levels based on the new price
          price1: price,
          price2: Math.round((price * 0.975) * 100) / 100, // 2.5% discount, rounded to 2 decimals
          price3: Math.round((price * 0.95) * 100) / 100,  // 5% discount
          price4: Math.round((price * 0.925) * 100) / 100, // 7.5% discount
          price5: Math.round((price * 0.9) * 100) / 100,   // 10% discount
          updatedAt: new Date()
        })
        .where(eq(products.id, product.id));
      
      updatedCount++;
    }
    
    console.log(`Price update complete!`);
    console.log(`Updated prices for ${updatedCount} products`);
    console.log(`${notUpdatedCount} products were not updated (no matching SKU or no price)`);
    
  } catch (error) {
    console.error("Error updating prices:", error);
  } finally {
    // No need to close the connection, will close automatically
  }
}

main().catch(console.error);