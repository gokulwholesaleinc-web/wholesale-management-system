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
  console.log("Adding products using only existing categories...");
  
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
  
  // Combine all the products
  const allProductsToAdd = [
    ...smokeSuppliesItems, 
    ...wrapsFiltersItems, 
    ...liquorSuppliesItems,
    ...automotiveItems,
    ...paperGoodsItems,
    ...healthBeautyItems,
    ...energyDrinkItems,
    ...beveragesItems,
    ...juicesMixersItems,
    ...twangSaltItems,
    ...foodItems,
    ...medicalItems,
    ...electronicsItems
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
      
      // Get the category ID from the mapping
      const categoryId = getCategoryId(item.department, item.category);
      
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
      
      console.log(`Added product ${newProduct.name} with ID ${newProduct.id} (Category ID: ${categoryId})`);
    } catch (error) {
      console.error(`Error adding product ${item.sku} - ${item.name}:`, error);
    }
  }
  
  console.log("Done adding products with existing categories!");
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