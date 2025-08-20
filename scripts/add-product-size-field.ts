import { db } from "../server/db";

async function main() {
  console.log("Adding 'size' column to products table...");
  
  try {
    // Check if the column already exists
    const checkQuery = `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'products' AND column_name = 'size';
    `;
    const result = await db.execute(checkQuery);
    
    if (result.rows && result.rows.length > 0) {
      console.log("'size' column already exists in products table");
    } else {
      // Add the column
      const addColumnQuery = `
        ALTER TABLE products
        ADD COLUMN IF NOT EXISTS size VARCHAR;
      `;
      await db.execute(addColumnQuery);
      console.log("Successfully added 'size' column to products table");
    }
  } catch (error) {
    console.error("Error adding 'size' column:", error);
    throw error;
  }
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