import { db } from "../server/db";
import { products, categories, type InsertProduct } from "../shared/schema";
import { eq } from "drizzle-orm";

// Helper function to find or create a category
async function ensureCategoryExists(department: string, categoryName: string): Promise<number> {
  // Clean up department and category names
  department = department.trim();
  categoryName = categoryName.trim();
  
  // If category is empty, use department as category
  if (!categoryName) {
    categoryName = department;
  }
  
  try {
    // First check if the category already exists
    const [existingCategory] = await db
      .select()
      .from(categories)
      .where(eq(categories.name, categoryName));
      
    if (existingCategory) {
      console.log(`Category ${categoryName} already exists with ID ${existingCategory.id}`);
      return existingCategory.id;
    }
    
    // If not, create it
    const [newCategory] = await db
      .insert(categories)
      .values({ name: categoryName })
      .returning();
      
    console.log(`Created new category ${categoryName} with ID ${newCategory.id}`);
    return newCategory.id;
  } catch (error) {
    console.error(`Error ensuring category ${categoryName} exists:`, error);
    throw error;
  }
}

// Helper function to select an appropriate image for the product
function selectProductImage(description: string, department: string, category: string, lookupCode: string): string {
  const descLower = description.toLowerCase();
  const deptLower = department.toLowerCase();
  const catLower = category ? category.toLowerCase() : '';

  // Default image path for any product
  let imagePath = "https://wholesaleapp.s3.amazonaws.com/default_product.png";
  
  // Beverages
  if (descLower.includes("coca cola") || descLower.includes("coke")) {
    return "https://wholesaleapp.s3.amazonaws.com/coke_20oz.png";
  } else if (descLower.includes("sprite")) {
    return "https://wholesaleapp.s3.amazonaws.com/sprite_20oz.png";
  } else if (descLower.includes("minute maid") && descLower.includes("lemonade")) {
    return "https://wholesaleapp.s3.amazonaws.com/minute_maid_lemonade.png";
  } else if (descLower.includes("minute maid") && descLower.includes("pink")) {
    return "https://wholesaleapp.s3.amazonaws.com/minute_maid_pink_lemonade.png";
  } else if (descLower.includes("fanta") && descLower.includes("orange")) {
    return "https://wholesaleapp.s3.amazonaws.com/fanta_orange.png";
  }
  
  // Batteries
  if (descLower.includes("duracell") && descLower.includes("battery")) {
    if (descLower.includes("aa 4pk")) {
      return "https://wholesaleapp.s3.amazonaws.com/duracell_aa_4pk.png";
    } else if (descLower.includes("aaa 4pk")) {
      return "https://wholesaleapp.s3.amazonaws.com/duracell_aaa_4pk.png";
    } else if (descLower.includes("aa 2pk")) {
      return "https://wholesaleapp.s3.amazonaws.com/duracell_aa_2pk.png";
    } else if (descLower.includes("aaa 2pk")) {
      return "https://wholesaleapp.s3.amazonaws.com/duracell_aaa_2pk.png";
    } else if (descLower.includes("d 2pk")) {
      return "https://wholesaleapp.s3.amazonaws.com/duracell_d_2pk.png";
    } else if (descLower.includes("c 2pk")) {
      return "https://wholesaleapp.s3.amazonaws.com/duracell_c_2pk.png";
    }
    return "https://wholesaleapp.s3.amazonaws.com/duracell_battery.png";
  }
  
  // Medical/Health items
  if (descLower.includes("alka-seltzer") || descLower.includes("alka seltzer")) {
    return "https://wholesaleapp.s3.amazonaws.com/alka_seltzer.png";
  } else if (deptLower.includes("meds") && descLower.includes("trojan")) {
    return "https://wholesaleapp.s3.amazonaws.com/trojan.png";
  }
  
  // Food items
  if (descLower.includes("pickle") && descLower.includes("pouch")) {
    return "https://wholesaleapp.s3.amazonaws.com/pickle_pouch.png";
  } else if (descLower.includes("dole") && descLower.includes("pineapple")) {
    return "https://wholesaleapp.s3.amazonaws.com/dole_pineapple.png";
  } 
  
  // Condiments and mixers
  if (descLower.includes("lime juice") || descLower.includes("real lime")) {
    return "https://wholesaleapp.s3.amazonaws.com/lime_juice.png";
  } else if (descLower.includes("lemon juice") || descLower.includes("real lemon")) {
    return "https://wholesaleapp.s3.amazonaws.com/lemon_juice.png";
  } else if (descLower.includes("coconut juice") || descLower.includes("foco coconut")) {
    return "https://wholesaleapp.s3.amazonaws.com/coconut_juice.png";
  } else if (descLower.includes("chamoy") || descLower.includes("twang classic chamoy")) {
    return "https://wholesaleapp.s3.amazonaws.com/chamoy.png";
  }
  
  // Twang product line
  if (descLower.includes("twang") && descLower.includes("salt")) {
    if (descLower.includes("lime salt")) {
      return "https://wholesaleapp.s3.amazonaws.com/twang_lime_salt.png";
    } else if (descLower.includes("lemon salt")) {
      return "https://wholesaleapp.s3.amazonaws.com/twang_lemon_salt.png";
    } else if (descLower.includes("pickle salt")) {
      return "https://wholesaleapp.s3.amazonaws.com/twang_pickle_salt.png";
    } else if (descLower.includes("chili lime")) {
      return "https://wholesaleapp.s3.amazonaws.com/twang_chili_lime_salt.png";
    } else if (descLower.includes("mango chili")) {
      return "https://wholesaleapp.s3.amazonaws.com/twang_mango_chili_salt.png";
    }
    return "https://wholesaleapp.s3.amazonaws.com/twang_salt.png";
  }
  
  return imagePath;
}

async function main() {
  console.log("Adding more common products from itemlist2.csv...");
  
  // Beverages - Sodas
  const beveragesItems = [
    {
      sku: "049000005226",
      department: "FOOD & BEVERAGE",
      category: "SODA",
      name: "Coca Cola 1L (12 Pack)",
      description: "COCA COLA 1LITER 12PK",
      basePrice: 25.99,
      price: 25.99,
      cost: 21.15,
      stock: 10,
      size: "1L x 12"
    },
    {
      sku: "049000018011",
      department: "FOOD & BEVERAGE",
      category: "SODA",
      name: "Coca Cola Cherry 20oz (24 Pack)",
      description: "COCA COLA 20OZ CHERRY 24PK",
      basePrice: 32.99,
      price: 32.99,
      cost: 27.50,
      stock: 10,
      size: "20oz x 24"
    },
    {
      sku: "049000019162",
      department: "FOOD & BEVERAGE",
      category: "SODA",
      name: "Fanta Orange 20oz (24 Pack)",
      description: "COCA COLA 20OZ FANTA ORAN 24PK",
      basePrice: 32.99,
      price: 32.99,
      cost: 27.50,
      stock: 10,
      size: "20oz x 24"
    },
    {
      sku: "049000023190",
      department: "FOOD & BEVERAGE",
      category: "SODA",
      name: "Sprite 1L (12 Pack)",
      description: "SPRITE 1L 12CT",
      basePrice: 25.99,
      price: 25.99,
      cost: 22.11,
      stock: 10,
      size: "1L x 12"
    },
    {
      sku: "049000040869",
      department: "FOOD & BEVERAGE",
      category: "SODA",
      name: "Coca Cola Zero 20oz (24 Pack)",
      description: "COCA COLA 20OZ ZERO 24PK",
      basePrice: 32.99,
      price: 32.99,
      cost: 27.00,
      stock: 10,
      size: "20oz x 24"
    },
    {
      sku: "025000058011",
      department: "FOOD & BEVERAGE",
      category: "SODA",
      name: "Minute Maid Lemonade 20oz (24 Pack)",
      description: "MINUTE MAID LEMONADE 20OZ 24CT",
      basePrice: 33.99,
      price: 33.99,
      cost: 26.50,
      stock: 10,
      size: "20oz x 24"
    },
    {
      sku: "025000058868",
      department: "FOOD & BEVERAGE",
      category: "SODA",
      name: "Minute Maid Pink Lemonade 20oz (24 Pack)",
      description: "MINUTE MAID PINK LEM 20OZ 24CT",
      basePrice: 33.99,
      price: 33.99,
      cost: 26.50,
      stock: 10,
      size: "20oz x 24"
    }
  ];
  
  // Batteries and Electronics
  const electronicsItems = [
    {
      sku: "00041333009612",
      department: "ELECTRONICS & ACCESSORIES",
      category: "BATTERIES",
      name: "Duracell AA 4-Pack Battery",
      description: "DURACELL AA 4PK BATTERY",
      basePrice: 45.99,
      price: 45.99,
      cost: 38.50,
      stock: 10,
      size: "4 Pack"
    },
    {
      sku: "00041333014616",
      department: "ELECTRONICS & ACCESSORIES",
      category: "BATTERIES",
      name: "Duracell AAA 4-Pack Battery",
      description: "DURACELL AAA 4PK BATTERY",
      basePrice: 45.99,
      price: 45.99,
      cost: 49.50,
      stock: 10,
      size: "4 Pack"
    },
    {
      sku: "00041333085616",
      department: "ELECTRONICS & ACCESSORIES",
      category: "BATTERIES",
      name: "Duracell D 2-Pack Batteries (6 Count)",
      description: "DURACELL D 2PK 6CT BATTERY",
      basePrice: 19.99,
      price: 19.99,
      cost: 16.50,
      stock: 10,
      size: "2 Pack x 6"
    },
    {
      sku: "00041333086613",
      department: "ELECTRONICS & ACCESSORIES",
      category: "BATTERIES",
      name: "Duracell C 2-Pack Batteries (8 Count)",
      description: "DURACELL C 2PK 8CT BATTERY",
      basePrice: 27.99,
      price: 27.99,
      cost: 22.00,
      stock: 10,
      size: "2 Pack x 8"
    },
    {
      sku: "00041333087610",
      department: "ELECTRONICS & ACCESSORIES",
      category: "BATTERIES",
      name: "Duracell AA 2-Pack Battery",
      description: "DURACELL AA 2PK BATTERY",
      basePrice: 26.99,
      price: 26.99,
      cost: 19.60,
      stock: 10,
      size: "2 Pack"
    },
    {
      sku: "00041333151618",
      department: "ELECTRONICS & ACCESSORIES",
      category: "BATTERIES",
      name: "Duracell AAA 2-Pack Battery",
      description: "DURACELL AAA 2PK BATTERY",
      basePrice: 32.99,
      price: 32.99,
      cost: 27.00,
      stock: 10,
      size: "2 Pack"
    }
  ];
  
  // Juices and Mixers
  const juicesMixersItems = [
    {
      sku: "014800582048",
      department: "FOOD & BEVERAGE",
      category: "JUICE/MIXERS",
      name: "Real Lime Juice 8oz",
      description: "REAL LIME 8OZ",
      basePrice: 24.99,
      price: 24.99,
      cost: 18.98,
      stock: 10,
      size: "8 oz"
    },
    {
      sku: "014800582215",
      department: "FOOD & BEVERAGE",
      category: "JUICE/MIXERS",
      name: "Real Lemon Juice 8oz",
      description: "REAL LEMON 8OZ",
      basePrice: 24.99,
      price: 24.99,
      cost: 18.98,
      stock: 10,
      size: "8 oz"
    },
    {
      sku: "016229908515",
      department: "FOOD & BEVERAGE",
      category: "JUICE/MIXERS",
      name: "Foco Coconut Juice (24 Count)",
      description: "FOCO COCONUT JUICE 24CT",
      basePrice: 32.99,
      price: 32.99,
      cost: 26.99,
      stock: 10,
      size: "24 Count"
    },
    {
      sku: "01660433",
      department: "FOOD & BEVERAGE",
      category: "JUICE/MIXERS",
      name: "Roses Lime Juice 12oz",
      description: "ROSES LIME JUICE 12OZ",
      basePrice: 3.49,
      price: 3.49,
      cost: 2.50,
      stock: 10,
      size: "12 oz"
    },
    {
      sku: "023604920109",
      department: "FOOD & BEVERAGE",
      category: "JUICE/MIXERS",
      name: "Twang Michelada Cocktail Mix 2.5oz",
      description: "TWANG MICHELADA COCKTAIL 2.5OZ",
      basePrice: 18.99,
      price: 18.99,
      cost: 14.40,
      stock: 10,
      size: "2.5 oz"
    }
  ];
  
  // Twang Salt Products
  const twangSaltItems = [
    {
      sku: "023604205237",
      department: "LIQUOR SUPPLIES",
      category: "SALT",
      name: "Twang Lime Salt (200 Count)",
      description: "TWANG LIME SALT 200CT",
      basePrice: 14.99,
      price: 14.99,
      cost: 11.50,
      stock: 10,
      size: "200 Count"
    },
    {
      sku: "023604215632",
      department: "LIQUOR SUPPLIES",
      category: "SALT",
      name: "Twang Lime Salt (10 Count)",
      description: "TWANG LIME SALT 10CT",
      basePrice: 10.99,
      price: 10.99,
      cost: 9.30,
      stock: 10,
      size: "10 Count"
    },
    {
      sku: "023604212631",
      department: "LIQUOR SUPPLIES",
      category: "SALT",
      name: "Twang Chili Lime Salt (10 Count)",
      description: "TWANG CHILI LIME SALT 10CT",
      basePrice: 10.99,
      price: 10.99,
      cost: 8.75,
      stock: 10,
      size: "10 Count"
    },
    {
      sku: "023604213065",
      department: "LIQUOR SUPPLIES",
      category: "SALT",
      name: "Twang Lemon Salt (10 Count)",
      description: "TWANG LEMON SALT10CT",
      basePrice: 10.99,
      price: 10.99,
      cost: 8.75,
      stock: 10,
      size: "10 Count"
    },
    {
      sku: "023604213164",
      department: "LIQUOR SUPPLIES",
      category: "SALT",
      name: "Twang Pickle Salt (10 Count)",
      description: "TWANG PICKLE SALT 10CT",
      basePrice: 10.99,
      price: 10.99,
      cost: 7.50,
      stock: 10,
      size: "10 Count"
    },
    {
      sku: "023604219630",
      department: "LIQUOR SUPPLIES",
      category: "SALT",
      name: "Twang Mango Chili Salt (10 Count)",
      description: "TWANG MANGO CHILI SALT 10CT",
      basePrice: 10.99,
      price: 10.99,
      cost: 9.30,
      stock: 10,
      size: "10 Count"
    },
    {
      sku: "023604237016",
      department: "LIQUOR SUPPLIES",
      category: "SALT",
      name: "Twang Beer Salt Lime (24 Count)",
      description: "TWANG BEER SALT LIME 24CT",
      basePrice: 32.99,
      price: 32.99,
      cost: 27.75,
      stock: 10,
      size: "24 Count"
    }
  ];
  
  // Food Items
  const foodItems = [
    {
      sku: "038200041219",
      department: "FOOD & BEVERAGE",
      category: "FOOD",
      name: "Pickle in Pouch - Large Dill",
      description: "PICKLE IN POUCH LRG DILL",
      basePrice: 8.99,
      price: 8.99,
      cost: 7.50,
      stock: 10,
      size: "Single"
    },
    {
      sku: "038200041226",
      department: "FOOD & BEVERAGE",
      category: "FOOD",
      name: "Pickle in Pouch - Large Hot",
      description: "PICKLE IN POUCH LRG HOT",
      basePrice: 8.99,
      price: 8.99,
      cost: 7.50,
      stock: 10,
      size: "Single"
    },
    {
      sku: "038200041233",
      department: "FOOD & BEVERAGE",
      category: "FOOD",
      name: "Pickle in Pouch - Large Kosher",
      description: "PICKLE IN POUCH LRG KOSHER",
      basePrice: 8.99,
      price: 8.99,
      cost: 7.50,
      stock: 10,
      size: "Single"
    },
    {
      sku: "038200041240",
      department: "FOOD & BEVERAGE",
      category: "FOOD",
      name: "Pickle in Pouch - Large Sour",
      description: "PICKLE IN POUCH LRG SOUR",
      basePrice: 8.99,
      price: 8.99,
      cost: 7.50,
      stock: 10,
      size: "Single"
    },
    {
      sku: "038900773700",
      department: "FOOD & BEVERAGE",
      category: "FOOD",
      name: "Dole Pineapple 8oz Can (24 Pack)",
      description: "DOLE PINEAPPLE 8OZ CAN 24PK",
      basePrice: 18.99,
      price: 18.99,
      cost: 14.98,
      stock: 10,
      size: "8 oz x 24"
    },
    {
      sku: "023604213485",
      department: "FOOD & BEVERAGE",
      category: "FOOD",
      name: "Twang Tangy Tamarind",
      description: "TWANG TANGY TAMARIND",
      basePrice: 10.99,
      price: 10.99,
      cost: 8.75,
      stock: 10,
      size: "Single"
    },
    {
      sku: "023604213584",
      department: "FOOD & BEVERAGE",
      category: "FOOD",
      name: "Twang Classic Chamoy",
      description: "TWANG CLASSIC CHAMOY",
      basePrice: 10.99,
      price: 10.99,
      cost: 8.75,
      stock: 10,
      size: "Single"
    }
  ];
  
  // Medical/Daily Care Items
  const medicalItems = [
    {
      sku: "016500040194",
      department: "MEDS/DAILY CARE",
      category: "PILLS",
      name: "Alka-Seltzer Original 12 Tablets (6 Pack)",
      description: "ALKA-SELTZER ORG 12TAB X 6PK",
      basePrice: 20.99,
      price: 20.99,
      cost: 14.50,
      stock: 10,
      size: "12 tabs x 6"
    },
    {
      sku: "016500567301",
      department: "MEDS/DAILY CARE",
      category: "PILLS",
      name: "Alka Seltzer 2-Pack (18 Count)",
      description: "ALKA SELTZER 2PK 18CT",
      basePrice: 7.99,
      price: 7.99,
      cost: 5.75,
      stock: 10,
      size: "2pk x 18ct"
    },
    {
      sku: "016500591733",
      department: "MEDS/DAILY CARE",
      category: "PILLS",
      name: "Alka-Seltzer Original 58 Count (2 Pack)",
      description: "ALKA-SELTZER ORGI 58CT 2PK",
      basePrice: 15.99,
      price: 15.99,
      cost: 11.49,
      stock: 10,
      size: "58ct x 2pk"
    },
    {
      sku: "016500594932",
      department: "MEDS/DAILY CARE",
      category: "PILLS",
      name: "Alka Seltzer Plus (72 Count)",
      description: "ALKA SLETZER PLUS 72CT",
      basePrice: 23.99,
      price: 23.99,
      cost: 18.99,
      stock: 10,
      size: "72 Count"
    },
    {
      sku: "022600642039",
      department: "MEDS/DAILY CARE",
      category: "MISC",
      name: "Trojan Magnum (6 Pack)",
      description: "TROJAN MAGNUM 6PK",
      basePrice: 9.99,
      price: 9.99,
      cost: 8.00,
      stock: 10,
      size: "6 Pack"
    },
    {
      sku: "022600926207",
      department: "MEDS/DAILY CARE",
      category: "MISC",
      name: "Trojan Ultra Thin (6 Pack)",
      description: "TROJAN ULTRA THIN 6PK",
      basePrice: 9.99,
      price: 9.99,
      cost: 8.00,
      stock: 10,
      size: "6 Pack"
    },
    {
      sku: "022600930501",
      department: "MEDS/DAILY CARE",
      category: "MISC",
      name: "Trojan ENZ Premium (6 Pack)",
      description: "TROJAN ENZ PREMIUM 6PK",
      basePrice: 9.99,
      price: 9.99,
      cost: 8.00,
      stock: 10,
      size: "6 Pack"
    }
  ];
  
  // Combine all the products
  const allProductsToAdd = [
    ...beveragesItems, 
    ...electronicsItems, 
    ...juicesMixersItems,
    ...twangSaltItems,
    ...foodItems,
    ...medicalItems
  ];
  
  // Add each product
  for (const item of allProductsToAdd) {
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
      
      // Ensure the category exists
      const categoryId = await ensureCategoryExists(item.department, item.category);
      
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
        size: item.size || ""
      };
      
      const [newProduct] = await db
        .insert(products)
        .values(productData)
        .returning();
      
      console.log(`Added product ${newProduct.name} with ID ${newProduct.id}`);
    } catch (error) {
      console.error(`Error adding product ${item.sku} - ${item.name}:`, error);
    }
  }
  
  console.log("Done adding common products!");
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