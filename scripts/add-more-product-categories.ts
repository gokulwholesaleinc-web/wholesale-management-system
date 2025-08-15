import { db } from "../server/db";
import { products, categories, type InsertProduct } from "../shared/schema";
import { eq } from "drizzle-orm";

// Map from category names in CSV to existing category IDs
const CATEGORY_MAP: Record<string, number> = {
  // Main categories
  "FOOD & BEVERAGE": 19,
  "MEDS/DAILY CARE": 20,
  "PLASTIC/PAPER GOODS": 21,
  "LIQUOR SUPPLIES": 22,
  "AUTOMOTIVE": 23,
  "ELECTRONICS & ACCESSORIES": 31,
  "CONES, PAPERS & HEMP": 34,
  "MISC": 38,
  "Uncategorized": 53,
  "SODA": 60,
  "FOOD": 61,
  "PIPES": 62,
  "BUTANE": 63,
  
  // Map specific subcategories to their parent categories
  "JUICE/MIXERS": 19, // to FOOD & BEVERAGE
  "ENERGY DRINK": 19, // to FOOD & BEVERAGE
  "SALT": 22, // to LIQUOR SUPPLIES
  "BRELLA": 22, // to LIQUOR SUPPLIES
  "BATTERIES": 31, // to ELECTRONICS & ACCESSORIES
  "LIGHTERS": 31, // to ELECTRONICS & ACCESSORIES
  "WRAPS/FILTERS/HEMP/CONES": 34, // to CONES, PAPERS & HEMP
  "CONES": 34, // to CONES, PAPERS & HEMP
  "WRAPS/PREROLL": 34, // to CONES, PAPERS & HEMP
  "DENTAL": 20, // to MEDS/DAILY CARE
  "PILLS": 20, // to MEDS/DAILY CARE
  "OIL": 23, // to AUTOMOTIVE
  "PLATES": 21 // to PLASTIC/PAPER GOODS
};

// Helper function to select an appropriate image for the product
function selectProductImage(description: string, department: string, category: string, lookupCode: string): string {
  const descLower = description.toLowerCase();
  const deptLower = department.toLowerCase();
  const catLower = category ? category.toLowerCase() : '';

  // Default image path for any product
  let imagePath = "https://wholesaleapp.s3.amazonaws.com/default_product.png";
  
  // Tobacco products
  if (deptLower.includes("tobacco")) {
    if (descLower.includes("swisher") && descLower.includes("mini")) {
      return "https://wholesaleapp.s3.amazonaws.com/swisher_mini.png";
    } else if (descLower.includes("swisher") && descLower.includes("sweet")) {
      return "https://wholesaleapp.s3.amazonaws.com/swisher_sweet.png";
    } else if (descLower.includes("swisher")) {
      return "https://wholesaleapp.s3.amazonaws.com/swisher_cigar.png";
    } else if (descLower.includes("white owl")) {
      return "https://wholesaleapp.s3.amazonaws.com/white_owl_cigar.png";
    } else if (descLower.includes("game") && descLower.includes("cigar")) {
      return "https://wholesaleapp.s3.amazonaws.com/game_cigar.png";
    } else if (descLower.includes("garcia vega")) {
      return "https://wholesaleapp.s3.amazonaws.com/garcia_vega_cigar.png";
    } else if (descLower.includes("grizzly") || descLower.includes("kodiak")) {
      return "https://wholesaleapp.s3.amazonaws.com/tobacco_snuff.png";
    }
  }
  
  // Trojan products
  if (descLower.includes("trojan")) {
    return "https://wholesaleapp.s3.amazonaws.com/trojan.png";
  }
  
  // San Pellegrino
  if (descLower.includes("san pellecrino") || descLower.includes("san pellegrino")) {
    return "https://wholesaleapp.s3.amazonaws.com/san_pellegrino.png";
  }
  
  // BC Powder
  if (descLower.includes("bc powder")) {
    return "https://wholesaleapp.s3.amazonaws.com/bc_powder.png";
  }
  
  // Alka-Seltzer
  if (descLower.includes("alka-seltzer") || descLower.includes("alka seltzer")) {
    return "https://wholesaleapp.s3.amazonaws.com/alka_seltzer.png";
  }
  
  // Rolaids
  if (descLower.includes("rolaids")) {
    return "https://wholesaleapp.s3.amazonaws.com/rolaids.png";
  }

  return imagePath;
}

function getCategoryId(department: string, categoryName: string): number {
  // Try to get category ID directly
  if (categoryName && CATEGORY_MAP[categoryName]) {
    return CATEGORY_MAP[categoryName];
  }
  
  // If not found, try with department
  if (CATEGORY_MAP[department]) {
    return CATEGORY_MAP[department];
  }
  
  // Default to Uncategorized
  return CATEGORY_MAP["Uncategorized"];
}

async function main() {
  console.log("Adding additional product categories from itemlist2.csv...");
  
  // Tobacco Snuff items
  const tobaccoSnuffItems = [
    {
      sku: "04223418",
      department: "TOBACCO SNUFF",
      category: "SNUFF 6OZ",
      name: "Kodiak Wintergreen Long Cut (6oz)",
      description: "KODIAK WINTERGREEN LNGCT6OZ",
      basePrice: 33.99,
      price: 33.99,
      cost: 29.89,
      stock: 10,
      size: "6 oz"
    },
    {
      sku: "04254418",
      department: "TOBACCO SNUFF",
      category: "SNUFF 4.1OZ",
      name: "Grizzly Wintergreen Pouch (4.2oz)",
      description: "GRIZZLY WINTERGRN POUCH 4.2OZ",
      basePrice: 27.99,
      price: 27.99,
      cost: 23.60,
      stock: 10,
      size: "4.2 oz"
    },
    {
      sku: "04287212",
      department: "TOBACCO SNUFF",
      category: "SNUFF 6OZ",
      name: "Grizzly Wintergreen Long Cut (6oz)",
      description: "GRIZZLY WINTERGREEN LONGCT 6OZ",
      basePrice: 29.99,
      price: 29.99,
      cost: 24.14,
      stock: 10,
      size: "6 oz"
    }
  ];
  
  // Cigar items
  const cigarItems = [
    {
      sku: "025900240790",
      department: "TOBACCO",
      category: "45CT CIGAR",
      name: "Swisher Mini Diamond 3-Pack (15 Count)",
      description: "SWISHER MINI DIAMOND 3PK 15CT",
      basePrice: 23.99,
      price: 23.99,
      cost: 19.58,
      stock: 10,
      size: "3pk x 15ct"
    },
    {
      sku: "025900240806",
      department: "TOBACCO",
      category: "45CT CIGAR",
      name: "Swisher Mini Regular 3-Pack (15 Count)",
      description: "SWISHER MINI REG 3PK 15CT",
      basePrice: 24.99,
      price: 24.99,
      cost: 20.80,
      stock: 10,
      size: "3pk x 15ct"
    },
    {
      sku: "025900284305",
      department: "TOBACCO",
      category: "60CT CIGAR",
      name: "Swisher Peach 2-Pack ($1.19, 60 Count)",
      description: "SWISHER PEACH 2/1.19 60CT",
      basePrice: 31.99,
      price: 31.99,
      cost: 28.70,
      stock: 10,
      size: "2pk x 60ct"
    },
    {
      sku: "025900287337",
      department: "TOBACCO",
      category: "60CT CIGAR",
      name: "Swisher Regular 2-Pack ($1.19, 30 Count)",
      description: "SWISHER REG 2/1.19 2PK 30CT",
      basePrice: 31.99,
      price: 31.99,
      cost: 28.70,
      stock: 10,
      size: "2pk x 30ct"
    },
    {
      sku: "025900287344",
      department: "TOBACCO",
      category: "60CT CIGAR",
      name: "Swisher Grape 2-Pack ($1.19, 30 Count)",
      description: "SWISHER GRAPE 2/1.19 2PK 30CT",
      basePrice: 31.99,
      price: 31.99,
      cost: 28.70,
      stock: 10,
      size: "2pk x 30ct"
    },
    {
      sku: "031700237717",
      department: "TOBACCO",
      category: "60CT CIGAR",
      name: "White Owl White Grape 2-Pack ($1.19, 60 Count)",
      description: "WHITE OWL WHT GRAPE 2/1.19 60C",
      basePrice: 31.99,
      price: 31.99,
      cost: 28.15,
      stock: 10,
      size: "2pk x 60ct"
    },
    {
      sku: "031700237779",
      department: "TOBACCO",
      category: "60CT CIGAR",
      name: "White Owl Mango 2-Pack ($1.19, 30 Count)",
      description: "WHITE OWL MANGO 2/1.19 2PK 30C",
      basePrice: 31.99,
      price: 31.99,
      cost: 28.15,
      stock: 10,
      size: "2pk x 30ct"
    },
    {
      sku: "031700238981",
      department: "TOBACCO",
      category: "30CT CIGAR",
      name: "Garcia Vega Green 2-Pack ($1.49, 15 Count)",
      description: "GARCIA VEGA GREEN 2 /1.49 15CT",
      basePrice: 20.99,
      price: 20.99,
      cost: 17.95,
      stock: 10,
      size: "2pk x 15ct"
    }
  ];
  
  // General Medicine & Daily Care items
  const medicineDailyCareItems = [
    {
      sku: "041167100066",
      department: "MEDS/DAILY CARE",
      category: "MISC",
      name: "Rolaids Regular Strength Mint",
      description: "ROLAIDS REG STRENGTH MINT",
      basePrice: 8.99,
      price: 8.99,
      cost: 7.00,
      stock: 10,
      size: "Single"
    },
    {
      sku: "022600001553",
      department: "MEDS/DAILY CARE",
      category: "MISC",
      name: "Trojan Bareskin Raw",
      description: "TROJAN BARESKIN RAW",
      basePrice: 16.99,
      price: 16.99,
      cost: 14.00,
      stock: 10,
      size: "Single"
    },
    {
      sku: "022600019619",
      department: "MEDS/DAILY CARE",
      category: "MISC",
      name: "Trojan Double Ecstasy (6 Pack)",
      description: "TROJAN DOUBLE ECSTASY 6PK",
      basePrice: 14.99,
      price: 14.99,
      cost: 12.00,
      stock: 10,
      size: "6 Pack"
    },
    {
      sku: "022600020158",
      department: "MEDS/DAILY CARE",
      category: "MISC",
      name: "Trojan Magnum XL (6 Pack)",
      description: "TROJAN MAGNUM XL 6 PK",
      basePrice: 13.99,
      price: 13.99,
      cost: 10.50,
      stock: 10,
      size: "6 Pack"
    },
    {
      sku: "022600228882",
      department: "MEDS/DAILY CARE",
      category: "MISC",
      name: "Trojan Magnum Bareskin (6 Pack)",
      description: "TROJAN MAGNUM BARESKIN 6PK",
      basePrice: 14.99,
      price: 14.99,
      cost: 12.50,
      stock: 10,
      size: "6 Pack"
    }
  ];
  
  // Premium Water Products
  const premiumWaterItems = [
    {
      sku: "041508734660",
      department: "FOOD & BEVERAGE",
      category: "MISC",
      name: "San Pellegrino Sparkling Water",
      description: "SAN PELLECRINO",
      basePrice: 24.99,
      price: 24.99,
      cost: 15.99,
      stock: 10,
      size: "Single"
    }
  ];
  
  // All items combined
  const allItems = [
    ...tobaccoSnuffItems,
    ...cigarItems,
    ...medicineDailyCareItems,
    ...premiumWaterItems
  ];
  
  // Add each product
  for (const item of allItems) {
    try {
      // Check if the product already exists by SKU
      const [existingProduct] = await db
        .select()
        .from(products)
        .where(eq(products.sku, item.sku))
        .limit(1);
      
      if (existingProduct) {
        console.log(`Product with SKU ${item.sku} already exists, skipping...`);
        continue;
      }
      
      // Get the category ID
      // For tobacco products, map to MISC if no specific category
      let categoryId = getCategoryId(item.department, item.category);
      
      // Check if we need to set a department-specific default
      if (item.department.includes("TOBACCO")) {
        // Default to MISC for all tobacco products 
        categoryId = CATEGORY_MAP["MISC"];
      }
      
      // Select an appropriate image for the product
      const imageUrl = selectProductImage(item.description, item.department, item.category, item.sku);
      
      // Create the product
      const productData: InsertProduct = {
        name: item.name,
        description: item.description,
        price: item.price,
        basePrice: item.basePrice,
        price1: 0,  // We're not using tiered pricing
        price2: 0,
        price3: 0,
        price4: 0,
        price5: 0,
        sku: item.sku,
        imageUrl,
        stock: item.stock,
        categoryId,
        size: item.size
      };
      
      const [newProduct] = await db
        .insert(products)
        .values(productData)
        .returning();
      
      console.log(`Added product ${newProduct.name} with ID ${newProduct.id} (Category ID: ${categoryId})`);
    } catch (error) {
      console.error(`Error adding product ${item.sku} - ${item.name}:`, error);
    }
  }
  
  console.log("Done adding additional product categories!");
}

main()
  .catch((err) => {
    console.error("Error:", err);
    process.exit(1);
  })
  .finally(async () => {
    console.log("Finished!");
    process.exit(0);
  });