import express, { Request, Response } from 'express';
import { db } from '../db';
import { cartItems } from '@shared/schema';
import { eq } from 'drizzle-orm';

const router = express.Router();

// Reset admin cart via direct database operations
router.post('/reset-admin-cart', async (req: Request, res: Response) => {
  try {
    console.log('🧨 EXECUTING ADMIN CART RESET');

    try {
      // Delete admin cart items using direct SQL
      await db.delete(cartItems).where(eq(cartItems.userId, 'admin-user'));
      console.log('✅ Admin cart reset successful with direct SQL');
    } catch (error) {
      console.error('❌ Failed to reset admin cart:', error);
    }
    
    return res.json({
      success: true,
      message: 'Admin cart has been reset'
    });
  } catch (error) {
    console.error('💥 Error in admin cart reset:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset admin cart'
    });
  }
});

// Reset any user cart (only for emergency use)
router.post('/reset-user-cart/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    console.log(`🧨 EXECUTING CART RESET FOR USER: ${userId}`);

    try {
      // Delete cart items using direct SQL
      await db.delete(cartItems).where(eq(cartItems.userId, userId));
      console.log(`✅ Cart reset successful for user: ${userId}`);
    } catch (error) {
      console.error(`❌ Failed to reset cart for user ${userId}:`, error);
    }
    
    return res.json({
      success: true,
      message: `Cart has been reset for user: ${userId}`
    });
  } catch (error) {
    console.error('💥 Error in user cart reset:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to reset user cart'
    });
  }
});

export default router;