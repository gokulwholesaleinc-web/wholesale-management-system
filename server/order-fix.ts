import { db } from "./db";
import { eq } from "drizzle-orm";
import { cartItems, products, orders, orderItems } from "../shared/schema";

export async function createOrderFromCart(userId: string, orderData: any) {
  console.log("FIXED ORDER CREATION - Starting for user:", userId);
  
  let userCartItems = [];
  
  // For admin users, check both admin-user and admin_49rzcl0p formats
  if (userId === 'admin-user' || userId === 'admin_49rzcl0p') {
    // Import the storage to access cart
    const { storage } = await import("./storage");
    
    // Try to get cart items for admin user
    try {
      const adminCartItems = await storage.getCart(userId);
      if (adminCartItems && adminCartItems.length > 0) {
        userCartItems = adminCartItems.map(item => ({
          id: item.id,
          userId: item.userId,
          productId: item.productId,
          quantity: item.quantity,
          product: item.product
        }));
        console.log("FIXED ORDER - Found admin cart items:", userCartItems.length);
      }
    } catch (error) {
      console.log("Admin cart not available, checking database cart");
    }
    
    // Also try the alternative admin ID format
    if (userCartItems.length === 0 && userId === 'admin-user') {
      try {
        const adminCartItems = await storage.getCart('admin_49rzcl0p');
        if (adminCartItems && adminCartItems.length > 0) {
          userCartItems = adminCartItems.map(item => ({
            id: item.id,
            userId: item.userId,
            productId: item.productId,
            quantity: item.quantity,
            product: item.product
          }));
          console.log("FIXED ORDER - Found admin cart items with alternate ID:", userCartItems.length);
        }
      } catch (error) {
        console.log("Alternate admin cart check failed");
      }
    }
  }
  
  // If no items found in admin cart or not admin user, check database
  if (userCartItems.length === 0) {
    userCartItems = await db
      .select({
        id: cartItems.id,
        userId: cartItems.userId,
        productId: cartItems.productId,
        quantity: cartItems.quantity,
        product: {
          id: products.id,
          name: products.name,
          price: products.price,
          stock: products.stock
        }
      })
      .from(cartItems)
      .leftJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.userId, userId));

    console.log("FIXED ORDER - Found database cart items:", userCartItems.length);
  }

  if (userCartItems.length === 0) {
    throw new Error("Order must contain at least one item");
  }

  // Calculate totals
  const subtotal = userCartItems.reduce((sum, item) => {
    const price = item.product?.price || 0;
    return sum + (item.quantity * price);
  }, 0);

  let deliveryFee = 0;
  if (orderData.orderType === 'delivery') {
    // Apply standard delivery fee logic
    deliveryFee = subtotal >= 100 ? 0 : 5;
  }

  const total = subtotal + deliveryFee;

  // Create order
  const [newOrder] = await db.insert(orders).values({
    userId: userId,
    total: total,
    orderType: orderData.orderType,
    status: 'pending',
    deliveryDate: orderData.deliveryDate || null,
    deliveryTimeSlot: orderData.deliveryTimeSlot || null,
    pickupDate: orderData.pickupDate || null,
    pickupTimeSlot: orderData.pickupTimeSlot || null,
    deliveryFee: deliveryFee,
    notes: orderData.notes || null
  }).returning();

  // Create order items
  for (const cartItem of userCartItems) {
    await db.insert(orderItems).values({
      orderId: newOrder.id,
      productId: cartItem.productId,
      quantity: cartItem.quantity,
      price: cartItem.product?.price || 0
    });
  }

  // Clear cart
  await db.delete(cartItems).where(eq(cartItems.userId, userId));

  console.log("FIXED ORDER - Successfully created order:", newOrder.id);
  return newOrder;
}