import express, { Request, Response } from 'express';
import { storage } from '../storage';
import { requireAuth } from '../simpleAuth';

const router = express.Router();

// Get order statistics for dashboard widgets
router.get('/orders', requireAuth, async (req: any, res: Response) => {
  try {
    const userId = req.user.id;
    console.log("Fetching order stats for user:", userId);
    
    const user = await storage.getUser(userId);
    
    let totalOrders = 0;
    let pendingDeliveries = 0;
    
    // Get orders based on user type
    const orders = user?.isAdmin 
      ? await storage.getAllOrders()
      : await storage.getOrdersByUser(userId);
      
    totalOrders = orders.length;
    
    // Count pending deliveries (orders with status 'processing' or 'out-for-delivery')
    pendingDeliveries = orders.filter(order => 
      (order.status === 'processing' || order.status === 'out-for-delivery') && 
      order.orderType === 'delivery'
    ).length;
    
    // Return the stats
    res.json({
      totalOrders,
      pendingDeliveries,
      specialOffers: 0 // Placeholder for future feature
    });
  } catch (error) {
    console.error("Error fetching order stats:", error);
    res.status(500).json({ message: "Failed to fetch order statistics" });
  }
});

export default router;