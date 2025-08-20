import { db } from "../server/db";
import { users } from "../shared/schema";
import bcrypt from "bcrypt";

async function main() {
  try {
    console.log("Creating admin user...");
    
    // Hash password
    const password = process.env.ADMIN_PASSWORD || "admin123";
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    
    // Generate a random admin ID
    const adminId = `admin_${Math.random().toString(36).substring(2, 10)}`;
    
    // Insert admin user directly
    const [admin] = await db.insert(users).values({
      id: adminId,
      username: "admin",
      firstName: "Admin",
      lastName: "User",
      company: "Gokul Wholesale",
      isAdmin: true,
      passwordHash: passwordHash,
      customerLevel: 5,
      createdAt: new Date(),
      updatedAt: new Date()
    }).returning();
    
    console.log("Admin user created successfully:", {
      id: admin.id,
      username: admin.username,
      isAdmin: admin.isAdmin
    });
    
    process.exit(0);
  } catch (error) {
    console.error("Error creating admin user:", error);
    process.exit(1);
  }
}

main();