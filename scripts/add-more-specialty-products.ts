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
  
  // Smoke Supplies
  if (deptLower.includes("smoke") || catLower.includes("pipes")) {
    if (descLower.includes("glass pipe")) {
      return "https://wholesaleapp.s3.amazonaws.com/glass_pipe.png";
    } else if (descLower.includes("krazy glue")) {
      return "https://wholesaleapp.s3.amazonaws.com/krazy_glue.png";
    } else if (descLower.includes("little tree")) {
      return "https://wholesaleapp.s3.amazonaws.com/little_trees.png";
    } else if (descLower.includes("tape")) {
      return "https://wholesaleapp.s3.amazonaws.com/scotch_tape.png";
    } else if (descLower.includes("zippo") && descLower.includes("fuel")) {
      return "https://wholesaleapp.s3.amazonaws.com/zippo_fuel.png";
    } else if (descLower.includes("zippo") && descLower.includes("fluid")) {
      return "https://wholesaleapp.s3.amazonaws.com/zippo_fluid.png";
    } else if (descLower.includes("butane")) {
      return "https://wholesaleapp.s3.amazonaws.com/butane.png";
    } else if (descLower.includes("ronsonol")) {
      return "https://wholesaleapp.s3.amazonaws.com/ronsonol.png";
    }
  }
  
  // Wraps, Filters, Hemp, Cones
  if (deptLower.includes("wraps") || catLower.includes("wraps") || catLower.includes("cones")) {
    if (descLower.includes("zig zag") && descLower.includes("cone")) {
      return "https://wholesaleapp.s3.amazonaws.com/zigzag_cone.png";
    } else if (descLower.includes("zig zag") && descLower.includes("orange")) {
      return "https://wholesaleapp.s3.amazonaws.com/zigzag_orange.png";
    } else if (descLower.includes("zig zag") && descLower.includes("ultra thin")) {
      return "https://wholesaleapp.s3.amazonaws.com/zigzag_ultra_thin.png";
    } else if (descLower.includes("zig zag")) {
      return "https://wholesaleapp.s3.amazonaws.com/zigzag.png";
    } else if (descLower.includes("king palm")) {
      return "https://wholesaleapp.s3.amazonaws.com/king_palm.png";
    }
  }
  
  // Liquor Supplies
  if (deptLower.includes("liquor")) {
    if (descLower.includes("brella cocktail")) {
      return "https://wholesaleapp.s3.amazonaws.com/brella_cocktail.png";
    }
  }
  
  // Automotive
  if (deptLower.includes("automotive")) {
    if (descLower.includes("mobil") && descLower.includes("synthetic")) {
      return "https://wholesaleapp.s3.amazonaws.com/mobil_synthetic.png";
    }
  }
  
  // Plastic/Paper Goods
  if (deptLower.includes("plastic") || deptLower.includes("paper")) {
    if (descLower.includes("paper plates")) {
      return "https://wholesaleapp.s3.amazonaws.com/paper_plates.png";
    }
  }
  
  // Colgate
  if (descLower.includes("colgate")) {
    return "https://wholesaleapp.s3.amazonaws.com/colgate.png";
  }
  
  // BC Powder
  if (descLower.includes("bc powder")) {
    return "https://wholesaleapp.s3.amazonaws.com/bc_powder.png";
  }
  
  // Gillette
  if (descLower.includes("gillette")) {
    return "https://wholesaleapp.s3.amazonaws.com/gillette.png";
  }
  
  return imagePath;
}

async function main() {
  console.log("Adding more specialty products from itemlist2.csv...");
  
  // Smoke Supplies
  const smokeSuppliesItems = [
    {
      sku: "#32 GLASS PIPE",
      department: "SMOKE SUPPLIES",
      category: "PIPES",
      name: "#32 Glass Pipe",
      description: "#32 GLASS PIPE",
      basePrice: 22.99,
      price: 22.99,
      cost: 18.00,
      stock: 10,
      size: "Single"
    },
    {
      sku: "00070158112054",
      department: "SMOKE SUPPLIES",
      category: "MISC",
      name: "Krazy Glue (12 Pack)",
      description: "KRAZY GLUE 12PK",
      basePrice: 11.99,
      price: 11.99,
      cost: 8.50,
      stock: 10,
      size: "12 Pack"
    },
    {
      sku: "00076171939937",
      department: "SMOKE SUPPLIES",
      category: "MISC",
      name: "Little Trees Variety Pack (24 Pack)",
      description: "LITTLE TREES VARITY 24PK",
      basePrice: 15.99,
      price: 15.99,
      cost: 13.50,
      stock: 10,
      size: "24 Pack"
    },
    {
      sku: "00076171941930",
      department: "SMOKE SUPPLIES",
      category: "MISC",
      name: "Little Tree Assorted Can (12 Count)",
      description: "LITTLE TREE ASSORTED CAN 12CT",
      basePrice: 15.99,
      price: 15.99,
      cost: 13.00,
      stock: 10,
      size: "12 Count"
    },
    {
      sku: "00076308411688",
      department: "SMOKE SUPPLIES",
      category: "MISC",
      name: "Scotch Utility Tape (12 Count)",
      description: "SCOTCH UTILITY TAPE 12CT",
      basePrice: 11.99,
      price: 11.99,
      cost: 9.00,
      stock: 10,
      size: "12 Count"
    },
    {
      sku: "037900990629",
      department: "SMOKE SUPPLIES",
      category: "BUTANE",
      name: "Ronsonol Lighter Fluid 8oz (24 Count)",
      description: "RONSONOL LIGHTER FLUID 24C 8OZ",
      basePrice: 2.99,
      price: 2.99,
      cost: 1.88,
      stock: 10,
      size: "8 oz x 24"
    },
    {
      sku: "041689140038",
      department: "SMOKE SUPPLIES",
      category: "LIGHTERS",
      name: "Zippo Butane Fuel 4.5oz (12 Count)",
      description: "ZIPPO BUTANE FUEL 4.50OZ 12CT",
      basePrice: 39.99,
      price: 39.99,
      cost: 31.44,
      stock: 10,
      size: "4.5 oz x 12"
    },
    {
      sku: "041689300494",
      department: "SMOKE SUPPLIES",
      category: "BUTANE",
      name: "Zippo Lighter Fluid 4oz",
      description: "ZIPPO LIGHTER FLUID 4OZ",
      basePrice: 1.99,
      price: 1.99,
      cost: 1.40,
      stock: 10,
      size: "4 oz"
    },
    {
      sku: "041689301224",
      department: "SMOKE SUPPLIES",
      category: "BUTANE",
      name: "Zippo Lighter Fluid 12oz",
      description: "ZIPPO LIGHTER FLUID 12OZ",
      basePrice: 3.49,
      price: 3.49,
      cost: 2.58,
      stock: 10,
      size: "12 oz"
    }
  ];
  
  // Wraps, Filters, Hemp, Cones
  const wrapsFiltersItems = [
    {
      sku: "008660006035",
      department: "WRAPS/FILTERS/HEMP/CONES",
      category: "CONES",
      name: "Zig Zag 1 1/4 Size Cone (24 Count, 6 Pack)",
      description: "ZIG ZAG 1 1/4 SIZECONE 24CT6PK",
      basePrice: 42.99,
      price: 42.99,
      cost: 34.10,
      stock: 10,
      size: "24ct x 6pk"
    },
    {
      sku: "008660006073",
      department: "WRAPS/FILTERS/HEMP/CONES",
      category: "CONES",
      name: "Zig Zag Unbleached 1 1/4 Cone",
      description: "ZIG ZAG UNBLEACHED 1 1/4 CONE",
      basePrice: 42.99,
      price: 42.99,
      cost: 34.10,
      stock: 10,
      size: "Single"
    },
    {
      sku: "008660007247",
      department: "WRAPS/FILTERS/HEMP/CONES",
      category: "WRAPS/PREROLL",
      name: "Zig Zag Orange 1.25 Paper (24 Pack)",
      description: "ZIG ZAG ORANGE 1.25 PAPER 24PK",
      basePrice: 39.99,
      price: 39.99,
      cost: 36.00,
      stock: 10,
      size: "24 Pack"
    },
    {
      sku: "008660007315",
      department: "WRAPS/FILTERS/HEMP/CONES",
      category: "WRAPS/PREROLL",
      name: "Zig Zag Ultra Thin 1 1/4 (24 Count)",
      description: "ZIG ZAG ULTRA THIN 1 1/4 24CT",
      basePrice: 42.99,
      price: 42.99,
      cost: 37.75,
      stock: 10,
      size: "24 Count"
    },
    {
      sku: "008660007681",
      department: "WRAPS/FILTERS/HEMP/CONES",
      category: "CONES",
      name: "Zig Zag Cone Unbleached 1/4 (6 Pack, 24 Count)",
      description: "ZIG ZAG CONE UNBLCH 1/4 6PK24C",
      basePrice: 28.99,
      price: 28.99,
      cost: 23.40,
      stock: 10,
      size: "6pk x 24ct"
    },
    {
      sku: "041985453634",
      department: "WRAPS/FILTERS/HEMP/CONES",
      category: "WRAPS/PREROLL",
      name: "King Palm 4 Count Mini Roll (24 Pack)",
      description: "KING PALM 4CT MINI ROLL 24PK",
      basePrice: 54.99,
      price: 54.99,
      cost: 47.00,
      stock: 10,
      size: "4ct x 24pk"
    }
  ];
  
  // Liquor Supplies
  const liquorSuppliesItems = [
    {
      sku: "00860009496026",
      department: "LIQUOR SUPPLIES",
      category: "BRELLA",
      name: "Brella Cocktail Mixer (6 Count)",
      description: "BRELLA COCKTAIL MIXER 6CT",
      basePrice: 35.99,
      price: 35.99,
      cost: 19.50,
      stock: 10,
      size: "6 Count"
    }
  ];
  
  // Automotive
  const automotiveItems = [
    {
      sku: "00071924940031",
      department: "AUTOMOTIVE",
      category: "OIL",
      name: "Mobil Synthetic 10W30 (6 Quart)",
      description: "MOBIL SYNTHETIC 10W30 6QT",
      basePrice: 28.99,
      price: 28.99,
      cost: 38.00,
      stock: 10,
      size: "6 Quart"
    }
  ];
  
  // Plastic/Paper Goods
  const paperGoodsItems = [
    {
      sku: "018026024504",
      department: "PLASTIC/PAPER GOODS",
      category: "PLATES",
      name: "Paper Plates (50 Count)",
      description: "PAPER PLATES 50CT",
      basePrice: 1.19,
      price: 1.19,
      cost: 0.92,
      stock: 10,
      size: "50 Count"
    }
  ];
  
  // Health and Beauty Items
  const healthBeautyItems = [
    {
      sku: "035000511058",
      department: "MEDS/DAILY CARE",
      category: "DENTAL",
      name: "Colgate Toothpaste 2.8oz (6 Pack)",
      description: "COLGATE 2.8OZ 6PK",
      basePrice: 9.99,
      price: 9.99,
      cost: 6.00,
      stock: 10,
      size: "2.8oz x 6"
    },
    {
      sku: "042037111144",
      department: "MEDS/DAILY CARE",
      category: "MISC",
      name: "BC Powder 2 Count (36 Pieces)",
      description: "BC POWDER 2CT 36PC",
      basePrice: 21.99,
      price: 21.99,
      cost: 19.50,
      stock: 10,
      size: "2ct x 36pc"
    },
    {
      sku: "042037111168",
      department: "MEDS/DAILY CARE",
      category: "MISC",
      name: "BC Powder 6 Count (24 Pack)",
      description: "BC 6CT 24PK",
      basePrice: 38.99,
      price: 38.99,
      cost: 32.50,
      stock: 10,
      size: "6ct x 24pk"
    },
    {
      sku: "047400130920",
      department: "MEDS/DAILY CARE",
      category: "MISC",
      name: "Gillette Shaving Gel",
      description: "GILLETTE SHAVING GEL",
      basePrice: 8.99,
      price: 8.99,
      cost: 6.25,
      stock: 10,
      size: "Single"
    }
  ];
  
  // Energy Drink
  const energyDrinkItems = [
    {
      sku: "018355102416",
      department: "FOOD & BEVERAGE",
      category: "ENERGY DRINK",
      name: "Ginseng Energy Now (24 Pack)",
      description: "GINSENG ENERGY NOW 24PK",
      basePrice: 6.99,
      price: 6.99,
      cost: 4.50,
      stock: 10,
      size: "24 Pack"
    }
  ];
  
  // Combine all the products
  const allProductsToAdd = [
    ...smokeSuppliesItems, 
    ...wrapsFiltersItems, 
    ...liquorSuppliesItems,
    ...automotiveItems,
    ...paperGoodsItems,
    ...healthBeautyItems,
    ...energyDrinkItems
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
  
  console.log("Done adding specialty products!");
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