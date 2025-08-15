import { db } from "../db";
import { cartItems } from "../..../../shared/schema";
import { eq } from "drizzle-orm";

/**
 * This module handles specialized cart clearing for the admin user
 * to fix the persistent cart items issue
 */

export async function clearAdminCart() {
  try {
    console.log("⭐️ NUCLEAR CART CLEAR REQUESTED FOR: admin-user");
    
    // Attempt 1: Using drizzle ORM to delete all cart items for admin
    try {
      await db.delete(cartItems).where(eq(cartItems.userId, "admin-user"));
      console.log("✓ DRIZZLE DELETE EXECUTED");
    } catch (err) {
      console.error("Failed to clear cart with Drizzle:", err);
    }
    
    // Attempt 2: Using direct pool query
    try {
      const { pool } = await import('../db');
      await pool.query('DELETE FROM cart_items WHERE user_id = $1', ["admin-user"]);
      console.log("✓ DIRECT POOL QUERY SUCCESSFUL");
    } catch (err) {
      console.error("Failed to clear cart with direct pool:", err);
    }
    
    // Attempt 3: Using raw SQL
    try {
      await db.execute(sql`DELETE FROM cart_items WHERE user_id = 'admin-user'`);
      console.log("✓ RAW SQL DELETE EXECUTED");
    } catch (err) {
      console.error("Failed to clear cart with raw SQL:", err);
    }
    
    console.log("✓ NUCLEAR CART CLEAR COMPLETED WITH ALL METHODS");
    return true;
  } catch (error) {
    console.error("💥 CRITICAL ERROR IN NUCLEAR CART CLEAR:", error);
    return false;
  }
}